use crate::adapters::{AdapterError, ProviderAdapter};
use crate::proxy::{NormalizedRequest, NormalizedResponse, Choice, Message, Usage};
use serde::{Deserialize, Serialize};

pub struct AnthropicAdapter;

impl AnthropicAdapter {
    pub fn new() -> Self {
        Self
    }
}

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

#[derive(Deserialize)]
struct AnthropicContentBlock {
    text: String,
}

#[derive(Deserialize)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    id: String,
    content: Vec<AnthropicContentBlock>,
    model: String,
    usage: AnthropicUsage,
}

impl ProviderAdapter for AnthropicAdapter {
    async fn chat(
        &self,
        client: &reqwest::Client,
        req: &NormalizedRequest,
        api_key: &str,
    ) -> Result<NormalizedResponse, AdapterError> {
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
                // Map system or developer messages to user if they appear elsewhere,
                // but standard mapping is user/assistant
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

        // Map models to anthropic model names if needed
        let model = match req.model.as_str() {
            "gpt-4o" | "gpt-4" | "claude-sonnet-4" | "claude-3-5-sonnet" => {
                "claude-3-5-sonnet-20241022"
            }
            _ => &req.model,
        };

        let ant_req = AnthropicRequest {
            model: model.to_string(),
            messages: anthropic_messages,
            max_tokens: req.max_tokens.unwrap_or(2048),
            temperature: req.temperature,
            system: if system_prompt.is_empty() {
                None
            } else {
                Some(system_prompt.trim().to_string())
            },
        };

        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&ant_req)
            .send()
            .await
            .map_err(|e| AdapterError::NetworkError(e.to_string()))?;

        let status = response.status().as_u16();
        if !response.status().is_success() {
            let msg = response.text().await.unwrap_or_default();
            return Err(AdapterError::ApiError { status, message: msg });
        }

        let ant_resp = response
            .json::<AnthropicResponse>()
            .await
            .map_err(|e| AdapterError::ParseError(e.to_string()))?;

        let text_content = ant_resp
            .content
            .first()
            .map(|block| block.text.clone())
            .unwrap_or_default();

        Ok(NormalizedResponse {
            id: ant_resp.id,
            object: "chat.completion".to_string(),
            created: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            model: ant_resp.model,
            choices: vec![Choice {
                index: 0,
                message: Message {
                    role: "assistant".to_string(),
                    content: text_content,
                },
                finish_reason: Some("stop".to_string()),
            }],
            usage: Usage {
                prompt_tokens: ant_resp.usage.input_tokens,
                completion_tokens: ant_resp.usage.output_tokens,
                total_tokens: ant_resp.usage.input_tokens + ant_resp.usage.output_tokens,
            },
        })
    }
}
