use axum::{
    extract::{Json, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Response,
    },
};
use futures::StreamExt;
use serde_json::{json, Value};
use std::{
    collections::{BTreeMap, HashMap},
    convert::Infallible,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::sync::mpsc;

use crate::proxy::{router::ProxyRouter, NormalizedRequest};

const KEYKING_CODEX_WRAPPER_KEY: &str = "kk-zero-config";
const DEFAULT_CODEX_MODEL_ALIAS: &str = "gpt-4o";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ToolKind {
    Function,
    Custom,
    ToolSearch,
}

#[derive(Clone, Debug)]
struct RegisteredTool {
    kind: ToolKind,
    response_name: String,
    namespace: Option<String>,
}

#[derive(Clone, Debug, Default)]
struct ToolRegistry {
    by_provider_name: HashMap<String, RegisteredTool>,
}

impl ToolRegistry {
    fn register(
        &mut self,
        suggested_name: &str,
        response_name: &str,
        namespace: Option<String>,
        kind: ToolKind,
    ) -> String {
        let base = sanitize_tool_name(suggested_name);
        let mut candidate = base.clone();
        let mut suffix_number = 2usize;

        while self.by_provider_name.contains_key(&candidate) {
            let suffix = format!("_{}", suffix_number);
            let keep = 64usize.saturating_sub(suffix.len());
            candidate = format!("{}{}", base.chars().take(keep).collect::<String>(), suffix);
            suffix_number += 1;
        }

        self.by_provider_name.insert(
            candidate.clone(),
            RegisteredTool {
                kind,
                response_name: response_name.to_string(),
                namespace,
            },
        );
        candidate
    }

    fn resolve(&self, provider_name: &str) -> RegisteredTool {
        self.by_provider_name
            .get(provider_name)
            .cloned()
            .unwrap_or_else(|| RegisteredTool {
                kind: ToolKind::Function,
                response_name: provider_name.to_string(),
                namespace: None,
            })
    }

    fn provider_name_for(&self, response_name: &str, namespace: Option<&str>) -> Option<String> {
        self.by_provider_name.iter().find_map(|(provider_name, registered)| {
            let namespace_matches = match namespace {
                Some(expected) => registered.namespace.as_deref() == Some(expected),
                None => true,
            };
            (registered.response_name == response_name && namespace_matches)
                .then(|| provider_name.clone())
        })
    }
}

#[derive(Clone, Debug, Default)]
struct UsageState {
    input_tokens: u64,
    output_tokens: u64,
    reasoning_tokens: u64,
}

impl UsageState {
    fn total(&self) -> u64 {
        self.input_tokens.saturating_add(self.output_tokens)
    }

    fn update_openai(&mut self, usage: &Value) {
        if let Some(value) = usage.get("prompt_tokens").and_then(Value::as_u64) {
            self.input_tokens = value;
        }
        if let Some(value) = usage.get("completion_tokens").and_then(Value::as_u64) {
            self.output_tokens = value;
        }
        if let Some(value) = usage
            .get("completion_tokens_details")
            .and_then(|details| details.get("reasoning_tokens"))
            .and_then(Value::as_u64)
        {
            self.reasoning_tokens = value;
        }
    }
}

#[derive(Clone, Debug)]
struct TextOutput {
    item_id: String,
    output_index: u64,
    text: String,
}

#[derive(Clone, Debug)]
struct ReasoningOutput {
    item_id: String,
    output_index: u64,
    text: String,
}

#[derive(Clone, Debug)]
struct PendingToolCall {
    item_id: String,
    call_id: String,
    provider_name: String,
    response_name: String,
    namespace: Option<String>,
    kind: ToolKind,
    output_index: u64,
    arguments: String,
    added: bool,
}

#[derive(Debug, Default)]
struct StreamState {
    next_output_index: u64,
    text: Option<TextOutput>,
    reasoning: Option<ReasoningOutput>,
    tools: BTreeMap<u64, PendingToolCall>,
    usage: UsageState,
    finish_reason: Option<String>,
    saw_terminal_marker: bool,
}

impl StreamState {
    fn allocate_output_index(&mut self) -> u64 {
        let index = self.next_output_index;
        self.next_output_index += 1;
        index
    }

    fn has_output(&self) -> bool {
        self.text.is_some() || self.reasoning.is_some() || !self.tools.is_empty()
    }
}

struct ResponsesEmitter {
    tx: mpsc::UnboundedSender<Event>,
    response_id: String,
    model: String,
    sequence_number: u64,
}

impl ResponsesEmitter {
    fn new(tx: mpsc::UnboundedSender<Event>, model: String) -> Self {
        Self {
            tx,
            response_id: generated_id("resp"),
            model,
            sequence_number: 0,
        }
    }

    fn send(&mut self, kind: &str, mut payload: Value) -> bool {
        if let Some(object) = payload.as_object_mut() {
            object.insert("type".to_string(), json!(kind));
            object.insert("sequence_number".to_string(), json!(self.sequence_number));
        }
        self.sequence_number += 1;
        self.tx
            .send(Event::default().event(kind).data(payload.to_string()))
            .is_ok()
    }

    fn created(&mut self) -> bool {
        self.send(
            "response.created",
            json!({
                "response": {
                    "id": self.response_id.clone(),
                    "object": "response",
                    "created_at": now_secs(),
                    "status": "in_progress",
                    "model": self.model.clone(),
                    "output": [],
                    "parallel_tool_calls": true,
                    "headers": {"openai-model": self.model.clone()},
                    "usage": null
                }
            }),
        )
    }

    fn failed(&mut self, message: impl Into<String>, code: &str) {
        let message = message.into();
        let _ = self.send(
            "response.failed",
            json!({
                "response": {
                    "id": self.response_id.clone(),
                    "object": "response",
                    "created_at": now_secs(),
                    "status": "failed",
                    "model": self.model.clone(),
                    "output": [],
                    "error": {
                        "type": "server_error",
                        "code": code,
                        "message": message
                    }
                }
            }),
        );
    }

    fn completed(&mut self, usage: &UsageState, end_turn: bool) {
        let _ = self.send(
            "response.completed",
            response_completed_payload(
                &self.response_id,
                &self.model,
                usage,
                end_turn,
            ),
        );
    }
}

pub async fn handle_responses(
    State(router): State<Arc<ProxyRouter>>,
    headers: HeaderMap,
    Json(raw): Json<Value>,
) -> Response {
    if !authorized_codex_request(&headers, router.system_key.as_str()) {
        return api_error(
            StatusCode::UNAUTHORIZED,
            "invalid_api_key",
            "Invalid or missing API key. Launch Codex with keyking-codex.",
        );
    }

    if raw.get("stream").and_then(Value::as_bool) != Some(true) {
        return api_error(
            StatusCode::BAD_REQUEST,
            "stream_required",
            "KeyKing's Codex adapter currently requires stream=true.",
        );
    }

    if raw.get("previous_response_id").is_some_and(|value| !value.is_null()) {
        return api_error(
            StatusCode::BAD_REQUEST,
            "previous_response_id_unsupported",
            "KeyKing is stateless. Send the full Responses input history instead of previous_response_id.",
        );
    }

    let original_model = raw
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(DEFAULT_CODEX_MODEL_ALIAS)
        .to_string();

    let (normalized, registry) = match normalize_responses_request(&raw) {
        Ok(result) => result,
        Err(message) => {
            return api_error(StatusCode::BAD_REQUEST, "invalid_request", &message);
        }
    };

    let (upstream, event_id, provider) = match router.get_raw_stream(&normalized).await {
        Ok(result) => result,
        Err(message) => {
            return api_error(StatusCode::BAD_GATEWAY, "routing_failed", &message);
        }
    };

    let provider_header = provider.clone();
    let model_header = original_model.clone();
    let (tx, rx) = mpsc::unbounded_channel::<Event>();
    let router_for_stream = router.clone();

    tokio::spawn(async move {
        let emitter = ResponsesEmitter::new(tx, original_model);
        let tokens = if provider == "Anthropic" || provider == "Lumos" {
            translate_anthropic_stream(upstream, emitter, registry).await
        } else {
            translate_openai_stream(upstream, emitter, registry).await
        };

        if tokens > 0 {
            router_for_stream.update_event_tokens(&event_id, tokens);
        }
    });

    let event_stream = futures::stream::unfold(rx, |mut rx| async move {
        rx.recv()
            .await
            .map(|event| (Ok::<Event, Infallible>(event), rx))
    });

    let mut response = Sse::new(event_stream)
        .keep_alive(
            KeepAlive::new()
                .interval(Duration::from_secs(3))
                .text("keyking-codex"),
        )
        .into_response();

    if let Ok(value) = HeaderValue::from_str(&provider_header) {
        response.headers_mut().insert("x-keyking-provider", value);
    }
    if let Ok(value) = HeaderValue::from_str(&model_header) {
        response.headers_mut().insert("openai-model", value);
    }
    response
}

fn authorized_codex_request(headers: &HeaderMap, system_key: &str) -> bool {
    let Some(value) = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
    else {
        return false;
    };

    value == system_key || value == KEYKING_CODEX_WRAPPER_KEY
}

fn api_error(status: StatusCode, code: &str, message: &str) -> Response {
    (
        status,
        Json(json!({
            "error": {
                "message": message,
                "type": "invalid_request_error",
                "code": code
            }
        })),
    )
        .into_response()
}

fn normalize_responses_request(raw: &Value) -> Result<(NormalizedRequest, ToolRegistry), String> {
    let mut messages = Vec::new();

    if let Some(instructions) = raw.get("instructions").and_then(Value::as_str) {
        if !instructions.trim().is_empty() {
            messages.push(json!({"role": "system", "content": instructions}));
        }
    }

    match raw.get("input") {
        Some(Value::String(text)) => {
            messages.push(json!({"role": "user", "content": text}));
        }
        Some(Value::Array(items)) => {
            for item in items {
                normalize_input_item(item, &mut messages)?;
            }
        }
        Some(Value::Null) | None => {
            return Err("Responses input must be a string or an array of input items.".to_string());
        }
        Some(_) => {
            return Err("Responses input must be a string or an array of input items.".to_string());
        }
    }

    if messages.is_empty() {
        return Err("Responses input did not contain any model-readable messages.".to_string());
    }

    let mut extra = HashMap::new();
    let mut registry = ToolRegistry::default();
    if let Some(tools) = raw.get("tools").and_then(Value::as_array) {
        let mut mapped_tools = Vec::new();
        for tool in tools {
            map_responses_tool(tool, None, &mut registry, &mut mapped_tools);
        }
        if !mapped_tools.is_empty() {
            extra.insert("tools".to_string(), Value::Array(mapped_tools));
        }
    }

    if let Some(tool_choice) = map_tool_choice(raw.get("tool_choice"), &registry) {
        extra.insert("tool_choice".to_string(), tool_choice);
    }

    if let Some(parallel) = raw.get("parallel_tool_calls").and_then(Value::as_bool) {
        extra.insert("parallel_tool_calls".to_string(), json!(parallel));
    }

    if let Some(format) = raw
        .get("text")
        .and_then(|text| text.get("format"))
        .filter(|format| format.get("type").and_then(Value::as_str) == Some("json_schema"))
    {
        let name = format
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or("codex_output_schema");
        let schema = format.get("schema").cloned().unwrap_or_else(|| json!({}));
        let strict = format.get("strict").and_then(Value::as_bool).unwrap_or(false);
        extra.insert(
            "response_format".to_string(),
            json!({
                "type": "json_schema",
                "json_schema": {"name": name, "strict": strict, "schema": schema}
            }),
        );
    }

    let requested_model = raw
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(DEFAULT_CODEX_MODEL_ALIAS);

    // keyking-codex explicitly requests gpt-4o as the generic routing alias.
    // Preserve other model IDs for direct API users; routing rules still take priority.
    let model = if requested_model.trim().is_empty() {
        DEFAULT_CODEX_MODEL_ALIAS.to_string()
    } else {
        requested_model.to_string()
    };

    let normalized = NormalizedRequest {
        model,
        messages,
        temperature: raw
            .get("temperature")
            .and_then(Value::as_f64)
            .map(|value| value as f32),
        max_tokens: raw
            .get("max_output_tokens")
            .and_then(Value::as_u64)
            .map(|value| value.min(u32::MAX as u64) as u32),
        stream: Some(true),
        top_p: raw
            .get("top_p")
            .and_then(Value::as_f64)
            .map(|value| value as f32),
        frequency_penalty: None,
        presence_penalty: None,
        extra,
    };

    Ok((normalized, registry))
}

fn normalize_input_item(item: &Value, messages: &mut Vec<Value>) -> Result<(), String> {
    let item_type = item.get("type").and_then(Value::as_str).unwrap_or("message");

    match item_type {
        "message" => {
            let role = item.get("role").and_then(Value::as_str).unwrap_or("user");
            let content = message_content_to_openai(item.get("content").unwrap_or(&Value::Null));
            messages.push(json!({"role": role, "content": content}));
        }
        "agent_message" => {
            let content = message_content_to_openai(item.get("content").unwrap_or(&Value::Null));
            messages.push(json!({"role": "assistant", "content": content}));
        }
        "function_call" => {
            let call_id = item
                .get("call_id")
                .and_then(Value::as_str)
                .unwrap_or_else(|| item.get("id").and_then(Value::as_str).unwrap_or(""));
            let name = item.get("name").and_then(Value::as_str).unwrap_or("unknown_tool");
            let arguments = json_string_field(item.get("arguments"), "{}");
            push_assistant_tool_call(
                messages,
                json!({
                    "id": call_id,
                    "type": "function",
                    "function": {"name": name, "arguments": arguments}
                }),
            );
        }
        "custom_tool_call" => {
            let call_id = item
                .get("call_id")
                .and_then(Value::as_str)
                .unwrap_or_else(|| item.get("id").and_then(Value::as_str).unwrap_or(""));
            let name = item.get("name").and_then(Value::as_str).unwrap_or("unknown_tool");
            let input = item.get("input").and_then(Value::as_str).unwrap_or("");
            push_assistant_tool_call(
                messages,
                json!({
                    "id": call_id,
                    "type": "function",
                    "function": {
                        "name": name,
                        "arguments": json!({"input": input}).to_string()
                    }
                }),
            );
        }
        "local_shell_call" => {
            let call_id = item
                .get("call_id")
                .and_then(Value::as_str)
                .unwrap_or_else(|| item.get("id").and_then(Value::as_str).unwrap_or(""));
            let arguments = item
                .get("action")
                .cloned()
                .unwrap_or_else(|| json!({}))
                .to_string();
            push_assistant_tool_call(
                messages,
                json!({
                    "id": call_id,
                    "type": "function",
                    "function": {"name": "shell_command", "arguments": arguments}
                }),
            );
        }
        "function_call_output" | "custom_tool_call_output" => {
            let call_id = item
                .get("call_id")
                .and_then(Value::as_str)
                .ok_or_else(|| format!("{} is missing call_id.", item_type))?;
            let output = output_value_to_text(item.get("output").unwrap_or(&Value::Null));
            messages.push(json!({
                "role": "tool",
                "tool_call_id": call_id,
                "content": output
            }));
        }
        "tool_search_call" => {
            let call_id = item
                .get("call_id")
                .and_then(Value::as_str)
                .unwrap_or_else(|| item.get("id").and_then(Value::as_str).unwrap_or(""));
            let arguments = item
                .get("arguments")
                .cloned()
                .unwrap_or_else(|| json!({}))
                .to_string();
            push_assistant_tool_call(
                messages,
                json!({
                    "id": call_id,
                    "type": "function",
                    "function": {"name": "tool_search", "arguments": arguments}
                }),
            );
        }
        "tool_search_output" => {
            let call_id = item.get("call_id").and_then(Value::as_str).unwrap_or("");
            messages.push(json!({
                "role": "tool",
                "tool_call_id": call_id,
                "content": item.get("tools").cloned().unwrap_or_else(|| json!([])).to_string()
            }));
        }
        // Reasoning and encrypted compaction items cannot be safely replayed through
        // chat-completions providers. Codex sends the readable conversation items too.
        "reasoning" | "compaction" | "compaction_summary" | "context_compaction"
        | "compaction_trigger" => {}
        _ => {}
    }

    Ok(())
}

fn message_content_to_openai(content: &Value) -> Value {
    if let Some(text) = content.as_str() {
        return json!(text);
    }

    let Some(items) = content.as_array() else {
        return Value::Null;
    };

    let mut parts = Vec::new();
    let mut only_text = true;
    for item in items {
        match item.get("type").and_then(Value::as_str).unwrap_or("") {
            "input_text" | "output_text" | "text" => {
                if let Some(text) = item.get("text").and_then(Value::as_str) {
                    parts.push(json!({"type": "text", "text": text}));
                }
            }
            "input_image" => {
                if let Some(url) = item.get("image_url").and_then(Value::as_str) {
                    only_text = false;
                    let detail = item.get("detail").and_then(Value::as_str).unwrap_or("auto");
                    parts.push(json!({
                        "type": "image_url",
                        "image_url": {"url": url, "detail": detail}
                    }));
                }
            }
            "input_audio" => {
                if let Some(url) = item.get("audio_url").and_then(Value::as_str) {
                    only_text = false;
                    parts.push(json!({
                        "type": "text",
                        "text": format!("[Audio input omitted by KeyKing: {}]", url)
                    }));
                }
            }
            _ => {}
        }
    }

    if only_text {
        let text = parts
            .iter()
            .filter_map(|part| part.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join("");
        json!(text)
    } else {
        Value::Array(parts)
    }
}

fn push_assistant_tool_call(messages: &mut Vec<Value>, tool_call: Value) {
    if let Some(last) = messages.last_mut() {
        let is_assistant = last.get("role").and_then(Value::as_str) == Some("assistant");
        if is_assistant {
            if let Some(object) = last.as_object_mut() {
                let tool_calls = object
                    .entry("tool_calls".to_string())
                    .or_insert_with(|| json!([]));
                if let Some(array) = tool_calls.as_array_mut() {
                    array.push(tool_call);
                    return;
                }
            }
        }
    }

    messages.push(json!({
        "role": "assistant",
        "content": null,
        "tool_calls": [tool_call]
    }));
}

fn output_value_to_text(output: &Value) -> String {
    match output {
        Value::String(text) => text.clone(),
        Value::Array(items) => items
            .iter()
            .filter_map(|item| {
                item.get("text")
                    .and_then(Value::as_str)
                    .map(str::to_string)
                    .or_else(|| {
                        item.get("image_url")
                            .and_then(Value::as_str)
                            .map(|url| format!("[image: {}]", url))
                    })
            })
            .collect::<Vec<_>>()
            .join("\n"),
        Value::Object(object) => object
            .get("content")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| output.to_string()),
        Value::Null => String::new(),
        _ => output.to_string(),
    }
}

fn map_responses_tool(
    tool: &Value,
    namespace: Option<&str>,
    registry: &mut ToolRegistry,
    mapped_tools: &mut Vec<Value>,
) {
    let tool_type = tool.get("type").and_then(Value::as_str).unwrap_or("function");

    if tool_type == "namespace" {
        let child_namespace = tool.get("name").and_then(Value::as_str).unwrap_or("functions");
        if let Some(children) = tool.get("tools").and_then(Value::as_array) {
            for child in children {
                map_responses_tool(child, Some(child_namespace), registry, mapped_tools);
            }
        }
        return;
    }

    let (kind, response_name) = match tool_type {
        "function" => (
            ToolKind::Function,
            tool.get("name").and_then(Value::as_str).unwrap_or("unknown_tool"),
        ),
        "custom" => (
            ToolKind::Custom,
            tool.get("name").and_then(Value::as_str).unwrap_or("custom_tool"),
        ),
        "tool_search" => (ToolKind::ToolSearch, "tool_search"),
        // Web search in the Responses API is server-executed. KeyKing cannot
        // claim compatibility when the selected upstream does not provide it.
        "web_search" => return,
        _ => return,
    };

    let suggested_name = namespace
        .map(|value| format!("{}__{}", value, response_name))
        .unwrap_or_else(|| response_name.to_string());
    let provider_name = registry.register(
        &suggested_name,
        response_name,
        namespace.map(str::to_string),
        kind,
    );
    let description = tool
        .get("description")
        .and_then(Value::as_str)
        .unwrap_or("");

    let parameters = if kind == ToolKind::Custom {
        json!({
            "type": "object",
            "properties": {
                "input": {
                    "type": "string",
                    "description": if description.is_empty() {
                        "Raw input for this freeform Codex tool."
                    } else {
                        description
                    }
                }
            },
            "required": ["input"],
            "additionalProperties": false
        })
    } else {
        let mut p = tool.get("parameters")
            .cloned()
            .unwrap_or_else(|| json!({"type": "object", "properties": {}}));
        crate::proxy::router::sanitize_json_schema(&mut p);
        p
    };

    let mut mapped = json!({
        "type": "function",
        "function": {
            "name": provider_name,
            "description": description,
            "parameters": parameters
        }
    });
    if let Some(strict) = tool.get("strict").and_then(Value::as_bool) {
        mapped["function"]["strict"] = json!(strict);
    }
    mapped_tools.push(mapped);
}

fn map_tool_choice(choice: Option<&Value>, registry: &ToolRegistry) -> Option<Value> {
    let choice = choice?;
    if let Some(value) = choice.as_str() {
        return Some(match value {
            "none" | "required" | "auto" => json!(value),
            _ => json!("auto"),
        });
    }

    let object = choice.as_object()?;
    let response_name = object.get("name").and_then(Value::as_str)?;
    let namespace = object.get("namespace").and_then(Value::as_str);
    let provider_name = registry
        .provider_name_for(response_name, namespace)
        .unwrap_or_else(|| sanitize_tool_name(response_name));
    Some(json!({
        "type": "function",
        "function": {"name": provider_name}
    }))
}

fn sanitize_tool_name(name: &str) -> String {
    let mut output = name
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '_' || character == '-' {
                character
            } else {
                '_'
            }
        })
        .take(64)
        .collect::<String>();
    if output.is_empty() {
        output.push_str("unknown_tool");
    }
    output
}

fn json_string_field(value: Option<&Value>, default: &str) -> String {
    match value {
        Some(Value::String(value)) => value.clone(),
        Some(value) if !value.is_null() => value.to_string(),
        _ => default.to_string(),
    }
}

async fn translate_openai_stream(
    response: reqwest::Response,
    mut emitter: ResponsesEmitter,
    registry: ToolRegistry,
) -> u32 {
    let mut state = StreamState::default();
    if !emitter.created() {
        return 0;
    }

    let mut byte_stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = byte_stream.next().await {
        let chunk = match chunk_result {
            Ok(chunk) => chunk,
            Err(error) => {
                emitter.failed(format!("Upstream stream failed: {}", error), "upstream_stream_error");
                return state.usage.total().min(u32::MAX as u64) as u32;
            }
        };
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(event) = take_next_sse_event(&mut buffer) {
            let Some(data) = extract_sse_data(&event) else {
                continue;
            };
            if data == "[DONE]" {
                state.saw_terminal_marker = true;
                continue;
            }

            let value: Value = match serde_json::from_str(&data) {
                Ok(value) => value,
                Err(_) => continue,
            };
            if let Err(message) = process_openai_value(
                &value,
                &mut state,
                &mut emitter,
                &registry,
            ) {
                emitter.failed(message, "upstream_response_error");
                return state.usage.total().min(u32::MAX as u64) as u32;
            }
        }
    }

    let leftover = buffer.trim();
    if !leftover.is_empty() {
        if let Ok(value) = serde_json::from_str::<Value>(leftover) {
            if let Err(message) = process_openai_value(
                &value,
                &mut state,
                &mut emitter,
                &registry,
            ) {
                emitter.failed(message, "upstream_response_error");
                return state.usage.total().min(u32::MAX as u64) as u32;
            }
        }
    }

    finish_response(&mut emitter, &state);
    state.usage.total().min(u32::MAX as u64) as u32
}

fn process_openai_value(
    value: &Value,
    state: &mut StreamState,
    emitter: &mut ResponsesEmitter,
    registry: &ToolRegistry,
) -> Result<(), String> {
    if let Some(error) = value.get("error") {
        let message = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("The upstream provider returned an error.");
        return Err(message.to_string());
    }

    if let Some(usage) = value.get("usage") {
        state.usage.update_openai(usage);
    }

    let Some(choices) = value.get("choices").and_then(Value::as_array) else {
        return Ok(());
    };

    for choice in choices {
        if let Some(finish_reason) = choice.get("finish_reason").and_then(Value::as_str) {
            state.finish_reason = Some(finish_reason.to_string());
        }

        let delta = choice
            .get("delta")
            .or_else(|| choice.get("message"))
            .unwrap_or(&Value::Null);

        if let Some(reasoning) = delta
            .get("reasoning_content")
            .or_else(|| delta.get("reasoning"))
            .or_else(|| delta.get("thinking"))
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
        {
            emit_reasoning_delta(emitter, state, reasoning);
        }

        if let Some(content) = delta.get("content") {
            if let Some(text) = content.as_str().filter(|value| !value.is_empty()) {
                emit_text_delta(emitter, state, text);
            } else if let Some(parts) = content.as_array() {
                for part in parts {
                    if let Some(text) = part.get("text").and_then(Value::as_str) {
                        emit_text_delta(emitter, state, text);
                    }
                }
            }
        } else if let Some(text) = choice.get("text").and_then(Value::as_str) {
            emit_text_delta(emitter, state, text);
        }

        if let Some(tool_calls) = delta.get("tool_calls").and_then(Value::as_array) {
            for (position, tool_call) in tool_calls.iter().enumerate() {
                let index = tool_call
                    .get("index")
                    .and_then(Value::as_u64)
                    .unwrap_or(position as u64);
                let call_id = tool_call.get("id").and_then(Value::as_str);
                let function = tool_call.get("function").unwrap_or(&Value::Null);
                let name = function.get("name").and_then(Value::as_str);
                upsert_tool_call(emitter, state, registry, index, call_id, name);
                if let Some(arguments) = function
                    .get("arguments")
                    .and_then(Value::as_str)
                    .filter(|value| !value.is_empty())
                {
                    emit_tool_arguments_delta(emitter, state, index, arguments);
                }
            }
        }

        if let Some(function_call) = delta.get("function_call") {
            upsert_tool_call(
                emitter,
                state,
                registry,
                0,
                None,
                function_call.get("name").and_then(Value::as_str),
            );
            if let Some(arguments) = function_call
                .get("arguments")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
            {
                emit_tool_arguments_delta(emitter, state, 0, arguments);
            }
        }
    }

    Ok(())
}

async fn translate_anthropic_stream(
    response: reqwest::Response,
    mut emitter: ResponsesEmitter,
    registry: ToolRegistry,
) -> u32 {
    let mut state = StreamState::default();
    if !emitter.created() {
        return 0;
    }

    let mut byte_stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = byte_stream.next().await {
        let chunk = match chunk_result {
            Ok(chunk) => chunk,
            Err(error) => {
                emitter.failed(format!("Upstream stream failed: {}", error), "upstream_stream_error");
                return state.usage.total().min(u32::MAX as u64) as u32;
            }
        };
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(event) = take_next_sse_event(&mut buffer) {
            let Some(data) = extract_sse_data(&event) else {
                continue;
            };
            let value: Value = match serde_json::from_str(&data) {
                Ok(value) => value,
                Err(_) => continue,
            };
            if let Err(message) = process_anthropic_value(
                &value,
                &mut state,
                &mut emitter,
                &registry,
            ) {
                emitter.failed(message, "upstream_response_error");
                return state.usage.total().min(u32::MAX as u64) as u32;
            }
        }
    }

    finish_response(&mut emitter, &state);
    state.usage.total().min(u32::MAX as u64) as u32
}

fn process_anthropic_value(
    value: &Value,
    state: &mut StreamState,
    emitter: &mut ResponsesEmitter,
    registry: &ToolRegistry,
) -> Result<(), String> {
    match value.get("type").and_then(Value::as_str).unwrap_or("") {
        "message_start" => {
            if let Some(input_tokens) = value
                .get("message")
                .and_then(|message| message.get("usage"))
                .and_then(|usage| usage.get("input_tokens"))
                .and_then(Value::as_u64)
            {
                state.usage.input_tokens = input_tokens;
            }
        }
        "content_block_start" => {
            let index = value.get("index").and_then(Value::as_u64).unwrap_or(0);
            let block = value.get("content_block").unwrap_or(&Value::Null);
            match block.get("type").and_then(Value::as_str).unwrap_or("") {
                "text" => {
                    if let Some(text) = block.get("text").and_then(Value::as_str) {
                        emit_text_delta(emitter, state, text);
                    }
                }
                "thinking" => {
                    if let Some(thinking) = block.get("thinking").and_then(Value::as_str) {
                        emit_reasoning_delta(emitter, state, thinking);
                    }
                }
                "tool_use" | "server_tool_use" => {
                    let call_id = block.get("id").and_then(Value::as_str);
                    let name = block.get("name").and_then(Value::as_str);
                    upsert_tool_call(emitter, state, registry, index, call_id, name);
                    if let Some(input) = block.get("input").filter(|input| {
                        input.as_object().is_some_and(|object| !object.is_empty())
                    }) {
                        let arguments = input.to_string();
                        emit_tool_arguments_delta(emitter, state, index, &arguments);
                    }
                }
                _ => {}
            }
        }
        "content_block_delta" => {
            let index = value.get("index").and_then(Value::as_u64).unwrap_or(0);
            let delta = value.get("delta").unwrap_or(&Value::Null);
            match delta.get("type").and_then(Value::as_str).unwrap_or("") {
                "text_delta" => {
                    if let Some(text) = delta.get("text").and_then(Value::as_str) {
                        emit_text_delta(emitter, state, text);
                    }
                }
                "thinking_delta" => {
                    if let Some(thinking) = delta.get("thinking").and_then(Value::as_str) {
                        emit_reasoning_delta(emitter, state, thinking);
                    }
                }
                "input_json_delta" => {
                    if let Some(arguments) = delta
                        .get("partial_json")
                        .and_then(Value::as_str)
                        .filter(|value| !value.is_empty())
                    {
                        emit_tool_arguments_delta(emitter, state, index, arguments);
                    }
                }
                _ => {}
            }
        }
        "message_delta" => {
            if let Some(output_tokens) = value
                .get("usage")
                .and_then(|usage| usage.get("output_tokens"))
                .and_then(Value::as_u64)
            {
                state.usage.output_tokens = output_tokens;
            }
            if let Some(stop_reason) = value
                .get("delta")
                .and_then(|delta| delta.get("stop_reason"))
                .and_then(Value::as_str)
            {
                state.finish_reason = Some(stop_reason.to_string());
            }
        }
        "message_stop" => state.saw_terminal_marker = true,
        "error" => {
            let message = value
                .get("error")
                .and_then(|error| error.get("message"))
                .and_then(Value::as_str)
                .unwrap_or("The Anthropic upstream returned an error.");
            return Err(message.to_string());
        }
        _ => {}
    }

    Ok(())
}

fn emit_text_delta(emitter: &mut ResponsesEmitter, state: &mut StreamState, delta: &str) {
    if delta.is_empty() {
        return;
    }

    if state.text.is_none() {
        let output_index = state.allocate_output_index();
        let item_id = generated_id("msg");
        let _ = emitter.send(
            "response.output_item.added",
            json!({
                "output_index": output_index,
                "item": message_item(&item_id, "", "in_progress")
            }),
        );
        let _ = emitter.send(
            "response.content_part.added",
            json!({
                "item_id": item_id.clone(),
                "output_index": output_index,
                "content_index": 0,
                "part": {"type": "output_text", "text": ""}
            }),
        );
        state.text = Some(TextOutput {
            item_id,
            output_index,
            text: String::new(),
        });
    }

    let text = state.text.as_mut().expect("text output initialized");
    text.text.push_str(delta);
    let _ = emitter.send(
        "response.output_text.delta",
        json!({
            "item_id": text.item_id.clone(),
            "output_index": text.output_index,
            "content_index": 0,
            "delta": delta
        }),
    );
}

fn emit_reasoning_delta(emitter: &mut ResponsesEmitter, state: &mut StreamState, delta: &str) {
    if delta.is_empty() {
        return;
    }

    if state.reasoning.is_none() {
        let output_index = state.allocate_output_index();
        let item_id = generated_id("rs");
        let _ = emitter.send(
            "response.output_item.added",
            json!({
                "output_index": output_index,
                "item": reasoning_item(&item_id, "")
            }),
        );
        let _ = emitter.send(
            "response.reasoning_summary_part.added",
            json!({
                "item_id": item_id.clone(),
                "output_index": output_index,
                "summary_index": 0,
                "part": {"type": "summary_text", "text": ""}
            }),
        );
        state.reasoning = Some(ReasoningOutput {
            item_id,
            output_index,
            text: String::new(),
        });
    }

    let reasoning = state
        .reasoning
        .as_mut()
        .expect("reasoning output initialized");
    reasoning.text.push_str(delta);
    let _ = emitter.send(
        "response.reasoning_summary_text.delta",
        json!({
            "item_id": reasoning.item_id.clone(),
            "output_index": reasoning.output_index,
            "summary_index": 0,
            "delta": delta
        }),
    );
}

fn upsert_tool_call(
    emitter: &mut ResponsesEmitter,
    state: &mut StreamState,
    registry: &ToolRegistry,
    index: u64,
    call_id: Option<&str>,
    provider_name: Option<&str>,
) {
    if !state.tools.contains_key(&index) {
        let provider_name = provider_name.unwrap_or("");
        let registered = registry.resolve(provider_name);
        let output_index = state.allocate_output_index();
        state.tools.insert(
            index,
            PendingToolCall {
                item_id: generated_id(match registered.kind {
                    ToolKind::Custom => "ctc",
                    ToolKind::ToolSearch => "tsc",
                    ToolKind::Function => "fc",
                }),
                call_id: call_id
                    .filter(|value| !value.is_empty())
                    .map(str::to_string)
                    .unwrap_or_else(|| generated_id("call")),
                provider_name: provider_name.to_string(),
                response_name: registered.response_name,
                namespace: registered.namespace,
                kind: registered.kind,
                output_index,
                arguments: String::new(),
                added: false,
            },
        );
    }

    let tool = state.tools.get_mut(&index).expect("tool call initialized");
    if let Some(call_id) = call_id.filter(|value| !value.is_empty()) {
        if !tool.added {
            tool.call_id = call_id.to_string();
        }
    }
    if let Some(provider_name) = provider_name.filter(|value| !value.is_empty()) {
        if !tool.added {
            let registered = registry.resolve(provider_name);
            tool.provider_name = provider_name.to_string();
            tool.response_name = registered.response_name;
            tool.namespace = registered.namespace;
            tool.kind = registered.kind;
        }
    }

    if !tool.added && !tool.provider_name.is_empty() {
        let item = tool_item(tool, false);
        let _ = emitter.send(
            "response.output_item.added",
            json!({"output_index": tool.output_index, "item": item}),
        );
        tool.added = true;
    }
}

fn emit_tool_arguments_delta(
    emitter: &mut ResponsesEmitter,
    state: &mut StreamState,
    index: u64,
    delta: &str,
) {
    let Some(tool) = state.tools.get_mut(&index) else {
        return;
    };
    tool.arguments.push_str(delta);

    if !tool.added {
        return;
    }

    let event_type = if tool.kind == ToolKind::Custom {
        "response.custom_tool_call_input.delta"
    } else {
        "response.function_call_arguments.delta"
    };
    let _ = emitter.send(
        event_type,
        json!({
            "item_id": tool.item_id.clone(),
            "call_id": tool.call_id.clone(),
            "output_index": tool.output_index,
            "delta": delta
        }),
    );
}

fn finish_response(emitter: &mut ResponsesEmitter, state: &StreamState) {
    if !state.has_output() {
        emitter.failed(
            "The upstream stream ended without a message or tool call.",
            "empty_upstream_response",
        );
        return;
    }

    if let Some(reasoning) = &state.reasoning {
        let _ = emitter.send(
            "response.reasoning_summary_text.done",
            json!({
                "item_id": reasoning.item_id.clone(),
                "output_index": reasoning.output_index,
                "summary_index": 0,
                "text": reasoning.text.clone()
            }),
        );
        let _ = emitter.send(
            "response.reasoning_summary_part.done",
            json!({
                "item_id": reasoning.item_id.clone(),
                "output_index": reasoning.output_index,
                "summary_index": 0,
                "part": {"type": "summary_text", "text": reasoning.text.clone()}
            }),
        );
        let _ = emitter.send(
            "response.output_item.done",
            json!({
                "output_index": reasoning.output_index,
                "item": reasoning_item(&reasoning.item_id, &reasoning.text)
            }),
        );
    }

    if let Some(text) = &state.text {
        let _ = emitter.send(
            "response.output_text.done",
            json!({
                "item_id": text.item_id.clone(),
                "output_index": text.output_index,
                "content_index": 0,
                "text": text.text.clone()
            }),
        );
        let _ = emitter.send(
            "response.content_part.done",
            json!({
                "item_id": text.item_id.clone(),
                "output_index": text.output_index,
                "content_index": 0,
                "part": {"type": "output_text", "text": text.text.clone()}
            }),
        );
        let _ = emitter.send(
            "response.output_item.done",
            json!({
                "output_index": text.output_index,
                "item": message_item(&text.item_id, &text.text, "completed")
            }),
        );
    }

    for tool in state.tools.values() {
        if tool.kind == ToolKind::Custom {
            let _ = emitter.send(
                "response.custom_tool_call_input.done",
                json!({
                    "item_id": tool.item_id.clone(),
                    "call_id": tool.call_id.clone(),
                    "output_index": tool.output_index,
                    "input": custom_input_from_arguments(&tool.arguments)
                }),
            );
        } else {
            let _ = emitter.send(
                "response.function_call_arguments.done",
                json!({
                    "item_id": tool.item_id.clone(),
                    "call_id": tool.call_id.clone(),
                    "output_index": tool.output_index,
                    "arguments": normalized_arguments(&tool.arguments)
                }),
            );
        }
        let _ = emitter.send(
            "response.output_item.done",
            json!({
                "output_index": tool.output_index,
                "item": tool_item(tool, true)
            }),
        );
    }

    emitter.completed(&state.usage, state.tools.is_empty());
}

fn message_item(item_id: &str, text: &str, status: &str) -> Value {
    json!({
        "id": item_id,
        "type": "message",
        "role": "assistant",
        "status": status,
        "content": [{"type": "output_text", "text": text}]
    })
}

fn reasoning_item(item_id: &str, text: &str) -> Value {
    let summary = if text.is_empty() {
        json!([])
    } else {
        json!([{"type": "summary_text", "text": text}])
    };
    json!({
        "id": item_id,
        "type": "reasoning",
        "summary": summary,
        "encrypted_content": null
    })
}

fn tool_item(tool: &PendingToolCall, completed: bool) -> Value {
    let status = if completed { "completed" } else { "in_progress" };
    match tool.kind {
        ToolKind::Function => {
            let mut item = json!({
                "id": tool.item_id.clone(),
                "type": "function_call",
                "call_id": tool.call_id.clone(),
                "name": tool.response_name.clone(),
                "arguments": if completed { normalized_arguments(&tool.arguments) } else { String::new() },
                "status": status
            });
            if let Some(namespace) = &tool.namespace {
                item["namespace"] = json!(namespace);
            }
            item
        }
        ToolKind::Custom => {
            let mut item = json!({
                "id": tool.item_id.clone(),
                "type": "custom_tool_call",
                "call_id": tool.call_id.clone(),
                "name": tool.response_name.clone(),
                "input": if completed { custom_input_from_arguments(&tool.arguments) } else { String::new() },
                "status": status
            });
            if let Some(namespace) = &tool.namespace {
                item["namespace"] = json!(namespace);
            }
            item
        }
        ToolKind::ToolSearch => json!({
            "id": tool.item_id.clone(),
            "type": "tool_search_call",
            "call_id": tool.call_id.clone(),
            "status": status,
            "execution": "client",
            "arguments": serde_json::from_str::<Value>(&normalized_arguments(&tool.arguments))
                .unwrap_or_else(|_| json!({"query": tool.arguments.clone()}))
        }),
    }
}

fn normalized_arguments(arguments: &str) -> String {
    if arguments.trim().is_empty() {
        "{}".to_string()
    } else {
        arguments.to_string()
    }
}

fn custom_input_from_arguments(arguments: &str) -> String {
    serde_json::from_str::<Value>(arguments)
        .ok()
        .and_then(|value| value.get("input").and_then(Value::as_str).map(str::to_string))
        .unwrap_or_else(|| arguments.to_string())
}

fn response_completed_payload(
    response_id: &str,
    model: &str,
    usage: &UsageState,
    end_turn: bool,
) -> Value {
    json!({
        "response": {
            "id": response_id,
            "object": "response",
            "created_at": now_secs(),
            "status": "completed",
            "model": model,
            "output": [],
            "end_turn": end_turn,
            "usage": {
                "input_tokens": usage.input_tokens,
                "input_tokens_details": {"cached_tokens": 0, "cache_write_tokens": 0},
                "output_tokens": usage.output_tokens,
                "output_tokens_details": {"reasoning_tokens": usage.reasoning_tokens},
                "total_tokens": usage.total()
            }
        }
    })
}

fn take_next_sse_event(buffer: &mut String) -> Option<String> {
    let unix = buffer.find("\n\n").map(|position| (position, 2usize));
    let windows = buffer.find("\r\n\r\n").map(|position| (position, 4usize));
    let (position, separator_length) = match (unix, windows) {
        (Some(left), Some(right)) => {
            if left.0 <= right.0 { left } else { right }
        }
        (Some(found), None) | (None, Some(found)) => found,
        (None, None) => return None,
    };

    let event = buffer[..position].to_string();
    buffer.drain(..position + separator_length);
    Some(event)
}

fn extract_sse_data(event: &str) -> Option<String> {
    let parts = event
        .lines()
        .filter_map(|line| {
            line.trim_end_matches('\r')
                .strip_prefix("data:")
                .map(str::trim_start)
        })
        .collect::<Vec<_>>();
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("\n"))
    }
}

fn generated_id(prefix: &str) -> String {
    format!("{}_{}", prefix, uuid::Uuid::new_v4().simple())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_codex_messages_calls_and_outputs() {
        let raw = json!({
            "model": "gpt-4o",
            "instructions": "You are a coding agent.",
            "input": [
                {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": "Fix it"}]
                },
                {
                    "type": "function_call",
                    "call_id": "call-1",
                    "name": "shell_command",
                    "arguments": "{\"command\":\"pwd\"}"
                },
                {
                    "type": "function_call_output",
                    "call_id": "call-1",
                    "output": "ok"
                }
            ],
            "tools": [],
            "tool_choice": "auto",
            "parallel_tool_calls": true,
            "stream": true
        });

        let (normalized, _) = normalize_responses_request(&raw).expect("valid request");
        assert_eq!(normalized.model, "gpt-4o");
        assert_eq!(normalized.messages[0]["role"], "system");
        assert_eq!(normalized.messages[1]["content"], "Fix it");
        assert_eq!(
            normalized.messages[1 + 1]["tool_calls"][0]["function"]["name"],
            "shell_command"
        );
        assert_eq!(normalized.messages[3]["role"], "tool");
        assert_eq!(normalized.messages[3]["tool_call_id"], "call-1");
        assert_eq!(normalized.extra["tool_choice"], "auto");
    }

    #[test]
    fn maps_freeform_tools_and_restores_custom_input() {
        let raw = json!({
            "model": "gpt-4o",
            "input": [{
                "type": "message",
                "role": "user",
                "content": [{"type": "input_text", "text": "Patch it"}]
            }],
            "tools": [{
                "type": "custom",
                "name": "apply_patch",
                "description": "Apply a patch"
            }],
            "stream": true
        });

        let (normalized, registry) = normalize_responses_request(&raw).expect("valid request");
        let provider_name = normalized.extra["tools"][0]["function"]["name"]
            .as_str()
            .expect("provider tool name");
        let registered = registry.resolve(provider_name);
        assert_eq!(registered.kind, ToolKind::Custom);
        assert_eq!(registered.response_name, "apply_patch");
        assert_eq!(
            custom_input_from_arguments("{\"input\":\"*** Begin Patch\"}"),
            "*** Begin Patch"
        );
    }

    #[test]
    fn emits_codex_parseable_completed_usage_shape() {
        let usage = UsageState {
            input_tokens: 10,
            output_tokens: 5,
            reasoning_tokens: 2,
        };
        let payload = response_completed_payload("resp-1", "gpt-4o", &usage, true);
        assert_eq!(payload["response"]["id"], "resp-1");
        assert_eq!(payload["response"]["usage"]["input_tokens"], 10);
        assert_eq!(payload["response"]["usage"]["output_tokens"], 5);
        assert_eq!(payload["response"]["usage"]["total_tokens"], 15);
    }

    #[test]
    fn parses_unix_and_windows_sse_boundaries() {
        let mut buffer = "event: a\r\ndata: {\"type\":\"a\"}\r\n\r\nevent: b\ndata: [DONE]\n\n".to_string();
        let first = take_next_sse_event(&mut buffer).expect("first event");
        assert_eq!(extract_sse_data(&first).as_deref(), Some("{\"type\":\"a\"}"));
        let second = take_next_sse_event(&mut buffer).expect("second event");
        assert_eq!(extract_sse_data(&second).as_deref(), Some("[DONE]"));
    }
}
