use serde::{Deserialize, Serialize};

pub mod router;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingEvent {
    pub id: String,
    pub timestamp: u64,
    pub provider: String,
    pub latency_ms: u64,
    pub tokens_used: u32,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_msg: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedRequest {
    #[serde(default)]
    pub model: String,
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Choice {
    pub index: u32,
    pub message: Message,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Usage {
    #[serde(default)]
    pub prompt_tokens: u32,
    #[serde(default)]
    pub completion_tokens: u32,
    #[serde(default)]
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NormalizedResponse {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub object: String,
    #[serde(default)]
    pub created: u64,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub choices: Vec<Choice>,
    #[serde(default)]
    pub usage: Usage,
}
