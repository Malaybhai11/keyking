use axum::response::sse::{Event, Sse};
use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
    response::Response,
};
use futures::stream::StreamExt;
use serde_json::json;
use std::sync::Arc;

use crate::proxy::{NormalizedRequest, router::ProxyRouter};

pub async fn handle_anthropic_messages(
    State(router): State<Arc<ProxyRouter>>,
    req_body: axum::extract::Json<serde_json::Value>,
) -> Response {
    let raw = req_body.0;
    
    let mut messages: Vec<serde_json::Value> = Vec::new();
    
    if let Some(system) = raw.get("system") {
        if let Some(s) = system.as_str() {
            messages.push(json!({"role": "system", "content": s}));
        } else if let Some(arr) = system.as_array() {
            let mut text = String::new();
            for item in arr {
                if item.get("type").and_then(|t| t.as_str()) == Some("text") {
                    if let Some(t) = item.get("text").and_then(|t| t.as_str()) {
                        text.push_str(t);
                    }
                }
            }
            if !text.is_empty() {
                messages.push(json!({"role": "system", "content": text}));
            }
        }
    }
    
    if let Some(msgs) = raw.get("messages").and_then(|m| m.as_array()) {
        for msg in msgs {
            let role = msg.get("role").and_then(|r| r.as_str()).unwrap_or("user");
            if let Some(content_arr) = msg.get("content").and_then(|c| c.as_array()) {
                let mut text_content = String::new();
                let mut tool_calls = Vec::new();
                let mut is_tool_result = false;
                
                for item in content_arr {
                    let ctype = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    if ctype == "text" {
                        if let Some(t) = item.get("text").and_then(|t| t.as_str()) {
                            text_content.push_str(t);
                        }
                    } else if ctype == "tool_use" {
                        let id = item.get("id").cloned().unwrap_or_default();
                        let name = item.get("name").cloned().unwrap_or_default();
                        let input = item.get("input").cloned().unwrap_or(json!({}));
                        tool_calls.push(json!({
                            "id": id,
                            "type": "function",
                            "function": {
                                "name": name,
                                "arguments": input.to_string()
                            }
                        }));
                    } else if ctype == "tool_result" {
                        is_tool_result = true;
                        let tool_use_id = item.get("tool_use_id").cloned().unwrap_or_default();
                        let content = item.get("content").and_then(|c| c.as_str()).unwrap_or("").to_string();
                        messages.push(json!({
                            "role": "tool",
                            "tool_call_id": tool_use_id,
                            "content": content
                        }));
                    }
                }
                
                if is_tool_result {
                    continue;
                }
                
                let mut final_msg = json!({
                    "role": role,
                    "content": text_content
                });
                
                if !tool_calls.is_empty() {
                    final_msg.as_object_mut().unwrap().insert("tool_calls".to_string(), serde_json::Value::Array(tool_calls));
                }
                messages.push(final_msg);
            } else if let Some(content_str) = msg.get("content").and_then(|c| c.as_str()) {
                messages.push(json!({
                    "role": role,
                    "content": content_str
                }));
            }
        }
    }
    
    let original_model = raw.get("model").and_then(|m| m.as_str()).unwrap_or("claude-3-7-sonnet-20250219").to_string();
    let target_model = if original_model.starts_with("claude-") {
        "gpt-4o"
    } else {
        &original_model
    };

    let stream = raw.get("stream").and_then(|s| s.as_bool()).unwrap_or(false);
    
    let mut normalized = NormalizedRequest {
        model: target_model.to_string(),
        messages,
        temperature: raw.get("temperature").and_then(|t| t.as_f64()).map(|f| f as f32),
        max_tokens: raw.get("max_tokens").and_then(|t| t.as_u64()).map(|u| u as u32),
        stream: Some(stream),
        top_p: raw.get("top_p").and_then(|t| t.as_f64()).map(|f| f as f32),
        frequency_penalty: None,
        presence_penalty: None,
        extra: std::collections::HashMap::new(),
    };
    
    if let Some(tools) = raw.get("tools").and_then(|t| t.as_array()) {
        let mut mapped_tools = Vec::new();
        for tool in tools {
            let name = tool.get("name").cloned().unwrap_or_default();
            let description = tool.get("description").cloned().unwrap_or_default();
            let input_schema = tool.get("input_schema").cloned().unwrap_or(json!({"type": "object"}));
            
            mapped_tools.push(json!({
                "type": "function",
                "function": {
                    "name": name,
                    "description": description,
                    "parameters": input_schema
                }
            }));
        }
        normalized.extra.insert("tools".to_string(), serde_json::Value::Array(mapped_tools));
    }
    
    if let Some(tool_choice) = raw.get("tool_choice").and_then(|tc| tc.as_object()) {
        if let Some(tc_type) = tool_choice.get("type").and_then(|t| t.as_str()) {
            if tc_type == "tool" {
                let name = tool_choice.get("name").cloned().unwrap_or_default();
                normalized.extra.insert("tool_choice".to_string(), json!({
                    "type": "function",
                    "function": {"name": name}
                }));
            } else if tc_type == "any" {
                normalized.extra.insert("tool_choice".to_string(), json!("required"));
            } else if tc_type == "auto" {
                normalized.extra.insert("tool_choice".to_string(), json!("auto"));
            }
        }
    }

    let client = reqwest::Client::new();
    let self_url = "http://127.0.0.1:8787/v1/chat/completions";
    let system_key = router.system_key.as_str();
    
    let mut upstream_req = client.post(self_url)
        .header("Authorization", format!("Bearer {}", system_key))
        .json(&normalized);
        
    let response = match upstream_req.send().await {
        Ok(res) => res,
        Err(e) => return (StatusCode::BAD_GATEWAY, format!("Failed internal proxy: {}", e)).into_response(),
    };
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return (status, text).into_response();
    }
    
    if !stream {
        let openai_resp: serde_json::Value = response.json().await.unwrap_or_else(|_| json!({}));
        let content = openai_resp["choices"][0]["message"]["content"].as_str().unwrap_or("");
        
        let mut anthropic_content = Vec::new();
        if !content.is_empty() {
            anthropic_content.push(json!({
                "type": "text",
                "text": content
            }));
        }
        
        if let Some(tool_calls) = openai_resp["choices"][0]["message"].get("tool_calls").and_then(|t| t.as_array()) {
            for tc in tool_calls {
                let id = tc.get("id").cloned().unwrap_or_default();
                let name = tc["function"].get("name").cloned().unwrap_or_default();
                let args_str = tc["function"].get("arguments").and_then(|a| a.as_str()).unwrap_or("{}");
                let args_json: serde_json::Value = serde_json::from_str(args_str).unwrap_or(json!({}));
                anthropic_content.push(json!({
                    "type": "tool_use",
                    "id": id,
                    "name": name,
                    "input": args_json
                }));
            }
        }
        
        let anthropic_resp = json!({
            "id": openai_resp["id"],
            "type": "message",
            "role": "assistant",
            "model": original_model,
            "content": anthropic_content,
            "stop_reason": if openai_resp["choices"][0]["finish_reason"].as_str() == Some("tool_calls") { "tool_use" } else { "end_turn" },
            "stop_sequence": null,
            "usage": {
                "input_tokens": openai_resp["usage"]["prompt_tokens"],
                "output_tokens": openai_resp["usage"]["completion_tokens"]
            }
        });
        return axum::Json(anthropic_resp).into_response();
    }

    let mut byte_stream = response.bytes_stream();
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    
    tokio::spawn(async move {
        let _ = tx.send(Event::default().data(json!({
            "type": "message_start",
            "message": {
                "id": format!("msg_{}", uuid::Uuid::new_v4()),
                "type": "message",
                "role": "assistant",
                "model": original_model,
                "content": []
            }
        }).to_string()));
        
        let _ = tx.send(Event::default().data(json!({
            "type": "content_block_start",
            "index": 0,
            "content_block": {
                "type": "text",
                "text": ""
            }
        }).to_string()));

        let mut buffer = String::new();
        let mut active_indices = std::collections::HashSet::new();
        active_indices.insert(0);
        
        while let Some(Ok(chunk)) = byte_stream.next().await {
            buffer.push_str(&String::from_utf8_lossy(&chunk));
            
            while let Some(pos) = buffer.find("\n\n") {
                let event_str = buffer[..pos].to_string();
                buffer = buffer[pos+2..].to_string();
                
                let line = event_str.trim();
                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" {
                        continue;
                    }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
                            if let Some(delta) = choices.get(0).and_then(|c| c.get("delta")) {
                                if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                                    if !content.is_empty() {
                                        let _ = tx.send(Event::default().data(json!({
                                            "type": "content_block_delta",
                                            "index": 0,
                                            "delta": {
                                                "type": "text_delta",
                                                "text": content
                                            }
                                        }).to_string()));
                                    }
                                }
                                
                                if let Some(tool_calls) = delta.get("tool_calls").and_then(|t| t.as_array()) {
                                    for tc in tool_calls {
                                        let index = tc.get("index").and_then(|i| i.as_u64()).unwrap_or(0) + 1;
                                        active_indices.insert(index);
                                        
                                        if let Some(id) = tc.get("id").and_then(|i| i.as_str()) {
                                            if let Some(function) = tc.get("function") {
                                                let name = function.get("name").and_then(|n| n.as_str()).unwrap_or("");
                                                let _ = tx.send(Event::default().data(json!({
                                                    "type": "content_block_start",
                                                    "index": index,
                                                    "content_block": {
                                                        "type": "tool_use",
                                                        "id": id,
                                                        "name": name,
                                                        "input": {}
                                                    }
                                                }).to_string()));
                                            }
                                        }
                                        if let Some(function) = tc.get("function") {
                                            if let Some(args) = function.get("arguments").and_then(|a| a.as_str()) {
                                                if !args.is_empty() {
                                                    let _ = tx.send(Event::default().data(json!({
                                                        "type": "content_block_delta",
                                                        "index": index,
                                                        "delta": {
                                                            "type": "input_json_delta",
                                                            "partial_json": args
                                                        }
                                                    }).to_string()));
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        for idx in active_indices {
            let _ = tx.send(Event::default().data(json!({"type": "content_block_stop", "index": idx}).to_string()));
        }
        
        let _ = tx.send(Event::default().data(json!({
            "type": "message_delta",
            "delta": {"stop_reason": "end_turn", "stop_sequence": null}
        }).to_string()));
        let _ = tx.send(Event::default().data(json!({"type": "message_stop"}).to_string()));
    });
    
    Sse::new(futures::stream::unfold(rx, |mut rx| async move {
        match rx.recv().await {
            Some(event) => Some((Ok::<_, std::convert::Infallible>(event), rx)),
            None => None,
        }
    })).into_response()
}
