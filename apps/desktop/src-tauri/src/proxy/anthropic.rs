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

use crate::proxy::{NormalizedRequest, router::ProxyRouter, RoutingEvent};
use std::time::Duration;

pub async fn handle_anthropic_messages(
    State(router): State<Arc<ProxyRouter>>,
    req_body: axum::extract::Json<serde_json::Value>,
) -> Response {
    let raw = req_body.0;
    
    // Convert Anthropic payload to OpenAI NormalizedRequest
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
            messages.push(msg.clone());
        }
    }
    
    let original_model = raw.get("model").and_then(|m| m.as_str()).unwrap_or("claude-3-7-sonnet-20250219").to_string();
    
    // Map Claude models to best Groq/OpenAI alternative for Claude Code
    let target_model = if original_model.starts_with("claude-") {
        "gpt-4o" // It will be mapped to llama-3.3-70b-versatile by try_provider if groq is chosen
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
    
    // Copy tools
    if let Some(tools) = raw.get("tools") {
        normalized.extra.insert("tools".to_string(), tools.clone());
    }
    if let Some(tool_choice) = raw.get("tool_choice") {
        normalized.extra.insert("tool_choice".to_string(), tool_choice.clone());
    }

    // Call try_provider logic internally
    // To do this simply without refactoring the whole router, we can invoke handle_chat
    // But handle_chat requires headers and Json<NormalizedRequest>
    // And it returns an OpenAI formatted response.
    // Instead of making it complex, let's just make an internal request to our own localhost proxy!
    let client = reqwest::Client::new();
    let port = router.app_handle.as_ref()
        .map(|h| h.config().build.dev_url.clone())
        .unwrap_or_default();
    
    // A much simpler zero-config hack: Send it to our own `/v1/chat/completions` !
    let self_url = "http://127.0.0.1:8787/v1/chat/completions";
    
    let system_key = router.system_key.as_str();
    
    let mut upstream_req = client.post(self_url)
        .header("Authorization", format!("Bearer {}", system_key))
        .json(&normalized);
        
    let response = match upstream_req.send().await {
        Ok(res) => res,
        Err(_) => return (StatusCode::BAD_GATEWAY, "Failed to reach internal proxy").into_response(),
    };
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return (status, text).into_response();
    }
    
    if !stream {
        // Non-streaming translation
        let openai_resp: serde_json::Value = response.json().await.unwrap_or_else(|_| json!({}));
        let content = openai_resp["choices"][0]["message"]["content"].as_str().unwrap_or("");
        
        let anthropic_resp = json!({
            "id": openai_resp["id"],
            "type": "message",
            "role": "assistant",
            "model": original_model,
            "content": [
                {
                    "type": "text",
                    "text": content
                }
            ],
            "stop_reason": "end_turn",
            "stop_sequence": null,
            "usage": {
                "input_tokens": openai_resp["usage"]["prompt_tokens"],
                "output_tokens": openai_resp["usage"]["completion_tokens"]
            }
        });
        return axum::Json(anthropic_resp).into_response();
    }

    // Streaming Translation
    let mut byte_stream = response.bytes_stream();
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    
    tokio::spawn(async move {
        // Emit message_start
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
        
        // Emit content_block_start
        let _ = tx.send(Event::default().data(json!({
            "type": "content_block_start",
            "index": 0,
            "content_block": {
                "type": "text",
                "text": ""
            }
        }).to_string()));

        let mut buffer = String::new();
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
                        if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
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
                    }
                }
            }
        }
        
        // Emit closing events
        let _ = tx.send(Event::default().data(json!({"type": "content_block_stop", "index": 0}).to_string()));
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
