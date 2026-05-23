use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaState {
    pub provider: Provider,
    pub remaining_requests: Option<u32>,
    pub remaining_tokens: Option<u32>,
    pub reset_at: Option<u64>,
    pub last_updated: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Provider {
    OpenAI,
    Groq,
    Gemini,
    Mistral,
    Anthropic,
    xAI,
    DeepSeek,
    OpenRouter,
    Cohere,
}
