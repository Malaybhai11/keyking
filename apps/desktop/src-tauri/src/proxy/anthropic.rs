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
                        let mut id = item.get("id").and_then(|i| i.as_str()).unwrap_or("").to_string();
                        if id.starts_with("toolu_call_") {
                            id = id.replace("toolu_", "");
                        }
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
                        let mut tool_use_id = item.get("tool_use_id").and_then(|t| t.as_str()).unwrap_or("").to_string();
                        if tool_use_id.starts_with("toolu_call_") {
                            tool_use_id = tool_use_id.replace("toolu_", "");
                        }
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

    if !stream {
        // Make a non-streaming request via the internal endpoint
        let client = reqwest::Client::new();
        let self_url = "http://127.0.0.1:8787/v1/chat/completions";
        let system_key = router.system_key.as_str();
        
        let response = match client.post(self_url)
            .header("Authorization", format!("Bearer {}", system_key))
            .json(&normalized)
            .send().await
        {
            Ok(res) => res,
            Err(e) => return (StatusCode::BAD_GATEWAY, format!("Failed internal proxy: {}", e)).into_response(),
        };
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return (status, text).into_response();
        }
        
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
                let raw_id = tc.get("id").and_then(|i| i.as_str()).unwrap_or("");
                let id = if raw_id.starts_with("toolu_") {
                    raw_id.to_string()
                } else {
                    format!("toolu_{}", raw_id)
                };
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

    // For streaming, use the raw stream to bypass axum SSE double-wrapping
    let response = match router.get_raw_stream(&normalized).await {
        Ok(r) => r,
        Err(e) => return (StatusCode::BAD_GATEWAY, format!("Routing failed: {}", e)).into_response(),
    };
    
    let mut byte_stream = response.bytes_stream();
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    
    tokio::spawn(async move {
        let msg_id = format!("msg_{}", uuid::Uuid::new_v4().to_string().replace("-", "")[..24].to_string());
        
        // message_start
        let _ = tx.send(Event::default().event("message_start").data(json!({
            "type": "message_start",
            "message": {
                "id": msg_id,
                "type": "message",
                "role": "assistant",
                "model": original_model,
                "content": [],
                "stop_reason": null,
                "stop_sequence": null,
                "usage": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cache_creation_input_tokens": 0,
                    "cache_read_input_tokens": 0
                }
            }
        }).to_string()));
        
        // Send ping to keep alive
        let _ = tx.send(Event::default().event("ping").data(json!({"type": "ping"}).to_string()));
        
        // content_block_start for text block (index 0)
        let _ = tx.send(Event::default().event("content_block_start").data(json!({
            "type": "content_block_start",
            "index": 0,
            "content_block": {
                "type": "text",
                "text": ""
            }
        }).to_string()));

        let mut buffer = String::new();
        let mut active_indices: Vec<u64> = vec![0]; // ordered list of active block indices
        let mut final_stop_reason = "end_turn".to_string();
        let mut output_tokens: u64 = 0;
        let mut tool_arg_buffers: std::collections::HashMap<u64, String> = std::collections::HashMap::new();
        
        // Helper: extract data payload from potentially multi-line and double-wrapped SSE event
        // The internal /v1/chat/completions endpoint wraps upstream SSE chunks in another Event,
        // so we may get "data: data: {...}" or even "data: event: ...\ndata: data: {...}"
        fn extract_data_line(event_str: &str) -> Option<String> {
            for line in event_str.lines() {
                let mut trimmed = line.trim();
                // Strip all leading "data:" or "data: " prefixes (handles double-wrapping)
                loop {
                    if trimmed.starts_with("data: ") {
                        trimmed = &trimmed[6..];
                    } else if trimmed.starts_with("data:") {
                        trimmed = &trimmed[5..];
                    } else {
                        break;
                    }
                }
                // After stripping, we should have either JSON, "[DONE]", or something to skip
                let trimmed = trimmed.trim();
                if trimmed.is_empty() || trimmed.starts_with("event:") {
                    continue;
                }
                return Some(trimmed.to_string());
            }
            None
        }
        
        while let Some(chunk_result) = byte_stream.next().await {
            let chunk = match chunk_result {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("[keyking:anthropic] Stream read error: {}", e);
                    break;
                }
            };
            buffer.push_str(&String::from_utf8_lossy(&chunk));
            
            // Process all complete SSE events (separated by \n\n)
            while let Some(pos) = buffer.find("\n\n") {
                let event_str = buffer[..pos].to_string();
                buffer = buffer[pos+2..].to_string();
                
                // Extract the data line from potentially multi-line SSE
                let data = match extract_data_line(&event_str) {
                    Some(d) => d,
                    None => continue,
                };
                
                if data == "[DONE]" {
                    continue;
                }
                
                let json: serde_json::Value = match serde_json::from_str(&data) {
                    Ok(j) => j,
                    Err(e) => {
                        eprintln!("[keyking:anthropic] JSON parse error: {} for data: {}", e, &data[..data.len().min(200)]);
                        continue;
                    }
                };
                
                // Track usage if present
                if let Some(usage) = json.get("usage") {
                    if let Some(ct) = usage.get("completion_tokens").and_then(|t| t.as_u64()) {
                        output_tokens = ct;
                    }
                }
                
                let choices = match json.get("choices").and_then(|c| c.as_array()) {
                    Some(c) => c.clone(),
                    None => continue,
                };
                
                let choice = match choices.get(0) {
                    Some(c) => c.clone(),
                    None => continue,
                };
                
                // Track finish_reason
                if let Some(fr) = choice.get("finish_reason").and_then(|f| f.as_str()) {
                    final_stop_reason = match fr {
                        "tool_calls" => "tool_use".to_string(),
                        "stop" => "end_turn".to_string(),
                        "length" => "max_tokens".to_string(),
                        other => other.to_string(),
                    };
                }
                
                let delta = match choice.get("delta") {
                    Some(d) => d.clone(),
                    None => continue,
                };
                
                // Handle text content
                if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                    if !content.is_empty() {
                        output_tokens += 1; // rough estimate
                        let _ = tx.send(Event::default().event("content_block_delta").data(json!({
                            "type": "content_block_delta",
                            "index": 0,
                            "delta": {
                                "type": "text_delta",
                                "text": content
                            }
                        }).to_string()));
                    }
                }
                
                // Handle tool calls
                if let Some(tool_calls) = delta.get("tool_calls").and_then(|t| t.as_array()) {
                    for tc in tool_calls {
                        let tc_index = tc.get("index").and_then(|i| i.as_u64()).unwrap_or(0);
                        let block_index = tc_index + 1; // text is index 0, tools start at 1
                        
                        // If this tool call has an "id", it's the START of a new tool call
                        if let Some(raw_id) = tc.get("id").and_then(|i| i.as_str()) {
                            // Normalize to Anthropic-style toolu_ prefix
                            let tool_id = if raw_id.starts_with("toolu_") {
                                raw_id.to_string()
                            } else {
                                format!("toolu_{}", raw_id)
                            };
                            
                            // Close the previous block before opening a new one
                            if let Some(&last_idx) = active_indices.last() {
                                let _ = tx.send(Event::default().event("content_block_stop").data(json!({
                                    "type": "content_block_stop",
                                    "index": last_idx
                                }).to_string()));
                            }
                            
                            // Track this new block
                            active_indices.push(block_index);
                            tool_arg_buffers.insert(block_index, String::new());
                            
                            let name = tc.get("function")
                                .and_then(|f| f.get("name"))
                                .and_then(|n| n.as_str())
                                .unwrap_or("");
                            
                            let _ = tx.send(Event::default().event("content_block_start").data(json!({
                                "type": "content_block_start",
                                "index": block_index,
                                "content_block": {
                                    "type": "tool_use",
                                    "id": tool_id,
                                    "name": name,
                                    "input": {}
                                }
                            }).to_string()));
                        }
                        
                        // Stream tool call arguments as input_json_delta
                        if let Some(args) = tc.get("function")
                            .and_then(|f| f.get("arguments"))
                            .and_then(|a| a.as_str())
                        {
                            if !args.is_empty() {
                                if let Some(buf) = tool_arg_buffers.get_mut(&block_index) {
                                    buf.push_str(args);
                                }
                                let _ = tx.send(Event::default().event("content_block_delta").data(json!({
                                    "type": "content_block_delta",
                                    "index": block_index,
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
        
        // Close the last active block
        if let Some(&last_idx) = active_indices.last() {
            let _ = tx.send(Event::default().event("content_block_stop").data(json!({
                "type": "content_block_stop",
                "index": last_idx
            }).to_string()));
        }
        
        // message_delta with final stop reason
        let _ = tx.send(Event::default().event("message_delta").data(json!({
            "type": "message_delta",
            "delta": {
                "stop_reason": final_stop_reason,
                "stop_sequence": null
            },
            "usage": {
                "output_tokens": output_tokens
            }
        }).to_string()));
        
        // message_stop
        let _ = tx.send(Event::default().event("message_stop").data(json!({
            "type": "message_stop"
        }).to_string()));
    });
    
    Sse::new(futures::stream::unfold(rx, |mut rx| async move {
        match rx.recv().await {
            Some(event) => Some((Ok::<_, std::convert::Infallible>(event), rx)),
            None => None,
        }
    })).into_response()
}

