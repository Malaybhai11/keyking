use crate::adapters::{AdapterError, ProviderAdapter};
use crate::proxy::{NormalizedRequest, NormalizedResponse, Choice, Message, Usage};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<AnthropicMessage>,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
}

pub struct AnthropicAdapter;

impl AnthropicAdapter {
    pub fn new() -> Self {
        Self
    }

    pub fn build_request(&self, req: &NormalizedRequest, url: &str) -> serde_json::Value {
        let mut system_prompt = String::new();
        let mut anthropic_messages = Vec::new();

        for msg in &req.messages {
            let role = msg.get("role").and_then(|r| r.as_str()).unwrap_or("");
            if role == "system" {
                if let Some(content) = msg.get("content").and_then(|c| c.as_str()) {
                    system_prompt.push_str(content);
                    system_prompt.push('\n');
                }
            } else {
                let role = if role == "developer" {
                    "user".to_string()
                } else {
                    role.to_string()
                };
                
                anthropic_messages.push(AnthropicMessage {
                    role,
                    content: msg.get("content").and_then(|c| c.as_str()).unwrap_or("").to_string(),
                });
            }
        }

        let model = if url.contains("lumosel.vip") {
            match req.model.as_str() {
                "gpt-4o" | "gpt-4" | "claude-sonnet-4" | "claude-3-5-sonnet" | "claude-3-5-sonnet-20241022" => "claude-sonnet-4.5",
                "gpt-4o-mini" | "gpt-3.5-turbo" | "claude-3-5-haiku" | "claude-3-haiku-20240307" => "claude-haiku-4.5",
                "o1" | "o3-mini" | "claude-3-opus" | "claude-3-opus-20240229" => "claude-opus-4-8",
                _ => &req.model,
            }
        } else {
            match req.model.as_str() {
                "gpt-4o" | "gpt-4" | "claude-sonnet-4" | "claude-3-5-sonnet" => {
                    "claude-3-5-sonnet-20241022"
                }
                _ => &req.model,
            }
        };

        let ant_req = AnthropicRequest {
            model: model.to_string(),
            messages: anthropic_messages,
            max_tokens: req.max_tokens.unwrap_or(2048).min(8192),
            temperature: req.temperature,
            system: if system_prompt.is_empty() {
                None
            } else {
                Some(system_prompt.trim().to_string())
            },
        };

        serde_json::to_value(ant_req).unwrap()
    }

    pub async fn chat_custom(
        &self,
        client: &reqwest::Client,
        req: &NormalizedRequest,
        api_key: &str,
        url: &str,
    ) -> Result<NormalizedResponse, AdapterError> {
        let ant_req_val = self.build_request(req, url);
        let mut req_builder = client.post(url);
        if url.contains("lumosel.vip") {
            req_builder = req_builder
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                .header("Content-Type", "application/json");
        } else {
            req_builder = req_builder
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                .header("Content-Type", "application/json");
        }
        
        eprintln!("[KEYKING DEBUG chat_custom] url={} body={}", url, serde_json::to_string_pretty(&ant_req_val).unwrap_or_default());

        let response = req_builder
            .json(&ant_req_val)
            .send()
            .await
            .map_err(|e| AdapterError::NetworkError(e.to_string()))?;

        let status = response.status().as_u16();
        if !response.status().is_success() {
            let msg = response.text().await.unwrap_or_default();
            return Err(AdapterError::ApiError { status, message: msg });
        }

        let text_body = response
            .text()
            .await
            .map_err(|e| AdapterError::ParseError(e.to_string()))?;

        let val: serde_json::Value = serde_json::from_str(&text_body)
            .map_err(|e| AdapterError::ParseError(format!("JSON decode error: {} for: {}", e, &text_body[..text_body.len().min(200)])))?;

        let id = val.get("id").and_then(|v| v.as_str()).unwrap_or("msg_unknown").to_string();
        let resp_model = val.get("model").and_then(|v| v.as_str()).unwrap_or(&req.model).to_string();

        let mut text_content = String::new();
        if let Some(content_array) = val.get("content").and_then(|c| c.as_array()) {
            for block in content_array {
                if let Some(t) = block.get("text").and_then(|t| t.as_str()) {
                    text_content.push_str(t);
                }
            }
        }

        let input_tokens = val.get("usage").and_then(|u| u.get("input_tokens")).and_then(|t| t.as_u64()).unwrap_or(0) as u32;
        let output_tokens = val.get("usage").and_then(|u| u.get("output_tokens")).and_then(|t| t.as_u64()).unwrap_or(0) as u32;

        Ok(NormalizedResponse {
            id,
            object: "chat.completion".to_string(),
            created: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            model: resp_model,
            choices: vec![Choice {
                index: 0,
                message: Message {
                    role: "assistant".to_string(),
                    content: Some(text_content),
                    extra: Default::default(),
                },
                finish_reason: Some("stop".to_string()),
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
        self.chat_custom(client, req, api_key, "https://api.anthropic.com/v1/messages").await
    }
}
