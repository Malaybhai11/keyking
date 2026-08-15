use crate::adapters::{AdapterError, ProviderAdapter};
use crate::proxy::{Choice, Message, NormalizedRequest, NormalizedResponse, Usage};
use serde_json::{json, Value};

pub struct AnthropicAdapter;

impl AnthropicAdapter {
    pub fn new() -> Self {
        Self
    }

    pub fn build_request(&self, req: &NormalizedRequest, url: &str) -> Value {
        let mut system_parts = Vec::new();
        let mut anthropic_messages = Vec::new();

        for message in &req.messages {
            let role = message
                .get("role")
                .and_then(Value::as_str)
                .unwrap_or("user");

            if role == "system" {
                if let Some(content) = message.get("content") {
                    let text = openai_content_to_text(content);
                    if !text.trim().is_empty() {
                        system_parts.push(text);
                    }
                }
                continue;
            }

            if role == "tool" {
                let tool_use_id = message
                    .get("tool_call_id")
                    .and_then(Value::as_str)
                    .unwrap_or("");
                if tool_use_id.is_empty() {
                    continue;
                }
                let content = message
                    .get("content")
                    .map(anthropic_tool_result_content)
                    .unwrap_or_else(|| json!(""));
                push_anthropic_message(
                    &mut anthropic_messages,
                    "user",
                    vec![json!({
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": content
                    })],
                );
                continue;
            }

            let anthropic_role = if role == "assistant" {
                "assistant"
            } else {
                // Anthropic has no developer role. Codex instructions are already
                // promoted to system; any remaining developer item is user context.
                "user"
            };
            let mut blocks = message
                .get("content")
                .map(openai_content_to_anthropic_blocks)
                .unwrap_or_default();

            if anthropic_role == "assistant" {
                if let Some(tool_calls) = message.get("tool_calls").and_then(Value::as_array) {
                    for tool_call in tool_calls {
                        let call_id = tool_call
                            .get("id")
                            .and_then(Value::as_str)
                            .filter(|value| !value.is_empty())
                            .map(str::to_string)
                            .unwrap_or_else(|| generated_tool_id());
                        let function = tool_call.get("function").unwrap_or(&Value::Null);
                        let name = function
                            .get("name")
                            .and_then(Value::as_str)
                            .unwrap_or("unknown_tool");
                        let arguments = function
                            .get("arguments")
                            .and_then(Value::as_str)
                            .unwrap_or("{}");
                        let input = parse_anthropic_tool_input(arguments);
                        blocks.push(json!({
                            "type": "tool_use",
                            "id": call_id,
                            "name": name,
                            "input": input
                        }));
                    }
                }
            }

            if !blocks.is_empty() {
                push_anthropic_message(&mut anthropic_messages, anthropic_role, blocks);
            }
        }

        let model = anthropic_model(req, url);
        let mut request = json!({
            "model": model,
            "messages": anthropic_messages,
            "max_tokens": req.max_tokens.unwrap_or(8192).min(8192)
        });

        if let Some(temperature) = req.temperature {
            request["temperature"] = json!(temperature);
        }
        if let Some(top_p) = req.top_p {
            request["top_p"] = json!(top_p);
        }
        if !system_parts.is_empty() {
            request["system"] = json!(system_parts.join("\n\n"));
        }

        if let Some(tools) = req.extra.get("tools").and_then(Value::as_array) {
            let mapped_tools = tools
                .iter()
                .filter_map(|tool| {
                    let function = tool.get("function")?;
                    let name = function.get("name")?.as_str()?;
                    let description = function
                        .get("description")
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    let input_schema = function
                        .get("parameters")
                        .cloned()
                        .unwrap_or_else(|| json!({"type": "object", "properties": {}}));
                    Some(json!({
                        "name": name,
                        "description": description,
                        "input_schema": input_schema
                    }))
                })
                .collect::<Vec<_>>();
            if !mapped_tools.is_empty() {
                request["tools"] = Value::Array(mapped_tools);
            }
        }

        if let Some(tool_choice) = req.extra.get("tool_choice") {
            if let Some(mapped) = anthropic_tool_choice(tool_choice) {
                request["tool_choice"] = mapped;
            }
        }

        request
    }

    pub async fn chat_custom(
        &self,
        client: &reqwest::Client,
        req: &NormalizedRequest,
        api_key: &str,
        url: &str,
    ) -> Result<NormalizedResponse, AdapterError> {
        let request = self.build_request(req, url);
        let response = client
            .post(url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("User-Agent", "KeyKing/3")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|error| AdapterError::NetworkError(error.to_string()))?;

        let status = response.status().as_u16();
        if !response.status().is_success() {
            let message = response.text().await.unwrap_or_default();
            return Err(AdapterError::ApiError { status, message });
        }

        let text_body = response
            .text()
            .await
            .map_err(|error| AdapterError::ParseError(error.to_string()))?;
        let value: Value = serde_json::from_str(&text_body).map_err(|error| {
            AdapterError::ParseError(format!(
                "JSON decode error: {} for: {}",
                error,
                &text_body[..text_body.len().min(200)]
            ))
        })?;

        let id = value
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or("msg_unknown")
            .to_string();
        let response_model = value
            .get("model")
            .and_then(Value::as_str)
            .unwrap_or(&req.model)
            .to_string();

        let mut text_content = String::new();
        let mut tool_calls = Vec::new();
        if let Some(content) = value.get("content").and_then(Value::as_array) {
            for block in content {
                match block.get("type").and_then(Value::as_str).unwrap_or("") {
                    "text" => {
                        if let Some(text) = block.get("text").and_then(Value::as_str) {
                            text_content.push_str(text);
                        }
                    }
                    "tool_use" => {
                        let id = block
                            .get("id")
                            .and_then(Value::as_str)
                            .unwrap_or("");
                        let name = block
                            .get("name")
                            .and_then(Value::as_str)
                            .unwrap_or("unknown_tool");
                        let arguments = block
                            .get("input")
                            .cloned()
                            .unwrap_or_else(|| json!({}))
                            .to_string();
                        tool_calls.push(json!({
                            "id": id,
                            "type": "function",
                            "function": {"name": name, "arguments": arguments}
                        }));
                    }
                    _ => {}
                }
            }
        }

        let input_tokens = value
            .get("usage")
            .and_then(|usage| usage.get("input_tokens"))
            .and_then(Value::as_u64)
            .unwrap_or(0) as u32;
        let output_tokens = value
            .get("usage")
            .and_then(|usage| usage.get("output_tokens"))
            .and_then(Value::as_u64)
            .unwrap_or(0) as u32;

        let mut extra = std::collections::HashMap::new();
        if !tool_calls.is_empty() {
            extra.insert("tool_calls".to_string(), Value::Array(tool_calls));
        }

        Ok(NormalizedResponse {
            id,
            object: "chat.completion".to_string(),
            created: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            model: response_model,
            choices: vec![Choice {
                index: 0,
                message: Message {
                    role: "assistant".to_string(),
                    content: Some(text_content),
                    extra,
                },
                finish_reason: Some(if value.get("stop_reason").and_then(Value::as_str)
                    == Some("tool_use")
                {
                    "tool_calls".to_string()
                } else {
                    "stop".to_string()
                }),
            }],
            usage: Usage {
                prompt_tokens: input_tokens,
                completion_tokens: output_tokens,
                total_tokens: input_tokens + output_tokens,
            },
        })
    }
}

impl ProviderAdapter for AnthropicAdapter {
    async fn chat(
        &self,
        client: &reqwest::Client,
        req: &NormalizedRequest,
        api_key: &str,
    ) -> Result<NormalizedResponse, AdapterError> {
        self.chat_custom(
            client,
            req,
            api_key,
            "https://api.anthropic.com/v1/messages",
        )
        .await
    }
}

fn anthropic_model<'a>(req: &'a NormalizedRequest, url: &str) -> &'a str {
    if url.contains("lumosel.vip") {
        match req.model.as_str() {
            "gpt-4o" | "gpt-4" | "claude-sonnet-4" | "claude-3-5-sonnet"
            | "claude-3-5-sonnet-20241022" => "claude-sonnet-4.5",
            "gpt-4o-mini" | "gpt-3.5-turbo" | "claude-3-5-haiku"
            | "claude-3-haiku-20240307" => "claude-haiku-4.5",
            "o1" | "o3-mini" | "claude-3-opus" | "claude-3-opus-20240229" => {
                "claude-opus-4-8"
            }
            _ => &req.model,
        }
    } else {
        match req.model.as_str() {
            "gpt-4o" | "gpt-4" | "claude-sonnet-4" | "claude-3-5-sonnet" => {
                "claude-3-5-sonnet-20241022"
            }
            _ => &req.model,
        }
    }
}

fn openai_content_to_text(content: &Value) -> String {
    match content {
        Value::String(text) => text.clone(),
        Value::Array(parts) => parts
            .iter()
            .filter_map(|part| part.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join(""),
        Value::Null => String::new(),
        _ => content.to_string(),
    }
}

fn openai_content_to_anthropic_blocks(content: &Value) -> Vec<Value> {
    match content {
        Value::String(text) if !text.is_empty() => vec![json!({"type": "text", "text": text})],
        Value::Array(parts) => parts
            .iter()
            .filter_map(|part| match part.get("type").and_then(Value::as_str).unwrap_or("") {
                "text" | "input_text" | "output_text" => part
                    .get("text")
                    .and_then(Value::as_str)
                    .map(|text| json!({"type": "text", "text": text})),
                "image_url" => {
                    let image_url = part.get("image_url")?;
                    let url = image_url
                        .as_str()
                        .or_else(|| image_url.get("url").and_then(Value::as_str))?;
                    Some(json!({"type": "image", "source": anthropic_image_source(url)}))
                }
                _ => None,
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn anthropic_tool_result_content(content: &Value) -> Value {
    let blocks = openai_content_to_anthropic_blocks(content);
    if blocks.is_empty() {
        json!(openai_content_to_text(content))
    } else if blocks.len() == 1 && blocks[0].get("type").and_then(Value::as_str) == Some("text") {
        blocks[0].get("text").cloned().unwrap_or_else(|| json!(""))
    } else {
        Value::Array(blocks)
    }
}

fn anthropic_image_source(url: &str) -> Value {
    if let Some(data) = url.strip_prefix("data:") {
        if let Some((media_type, encoded)) = data.split_once(";base64,") {
            return json!({
                "type": "base64",
                "media_type": media_type,
                "data": encoded
            });
        }
    }
    json!({"type": "url", "url": url})
}

fn push_anthropic_message(messages: &mut Vec<Value>, role: &str, mut blocks: Vec<Value>) {
    if blocks.is_empty() {
        return;
    }

    if let Some(last) = messages.last_mut() {
        if last.get("role").and_then(Value::as_str) == Some(role) {
            if let Some(content) = last.get_mut("content").and_then(Value::as_array_mut) {
                content.append(&mut blocks);
                return;
            }
        }
    }

    messages.push(json!({"role": role, "content": blocks}));
}

fn parse_anthropic_tool_input(arguments: &str) -> Value {
    match serde_json::from_str::<Value>(arguments) {
        Ok(Value::Object(object)) => Value::Object(object),
        Ok(value) => json!({"input": value}),
        Err(_) => json!({"input": arguments}),
    }
}

fn anthropic_tool_choice(choice: &Value) -> Option<Value> {
    if let Some(value) = choice.as_str() {
        return match value {
            "auto" => Some(json!({"type": "auto"})),
            "required" => Some(json!({"type": "any"})),
            "none" => None,
            _ => Some(json!({"type": "auto"})),
        };
    }

    let function_name = choice
        .get("function")
        .and_then(|function| function.get("name"))
        .and_then(Value::as_str)
        .or_else(|| choice.get("name").and_then(Value::as_str))?;
    Some(json!({"type": "tool", "name": function_name}))
}

fn generated_tool_id() -> String {
    format!("toolu_{}", uuid::Uuid::new_v4().simple())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn builds_native_anthropic_tools_and_tool_results() {
        let request = NormalizedRequest {
            model: "gpt-4o".to_string(),
            messages: vec![
                json!({"role": "system", "content": "Be precise"}),
                json!({"role": "user", "content": "Run pwd"}),
                json!({
                    "role": "assistant",
                    "content": null,
                    "tool_calls": [{
                        "id": "call-1",
                        "type": "function",
                        "function": {"name": "shell_command", "arguments": "{\"command\":\"pwd\"}"}
                    }]
                }),
                json!({"role": "tool", "tool_call_id": "call-1", "content": "/tmp"}),
            ],
            temperature: None,
            max_tokens: Some(4096),
            stream: Some(true),
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
            extra: HashMap::from([
                (
                    "tools".to_string(),
                    json!([{
                        "type": "function",
                        "function": {
                            "name": "shell_command",
                            "description": "Run a command",
                            "parameters": {"type": "object", "properties": {}}
                        }
                    }]),
                ),
                ("tool_choice".to_string(), json!("auto")),
            ]),
        };

        let body = AnthropicAdapter::new().build_request(
            &request,
            "https://api.anthropic.com/v1/messages",
        );
        assert_eq!(body["system"], "Be precise");
        assert_eq!(body["tools"][0]["name"], "shell_command");
        assert_eq!(body["tool_choice"]["type"], "auto");
        assert_eq!(body["messages"][1]["content"][0]["type"], "tool_use");
        assert_eq!(body["messages"][2]["content"][0]["type"], "tool_result");
    }
}
