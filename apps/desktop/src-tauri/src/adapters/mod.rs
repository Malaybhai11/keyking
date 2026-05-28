use crate::proxy::{NormalizedRequest, NormalizedResponse};

pub mod openai;
pub mod groq;
pub mod anthropic;

#[derive(Debug, thiserror::Error)]
pub enum AdapterError {
    #[error("API Error {status}: {message}")]
    ApiError { status: u16, message: String },
    #[error("Network Error: {0}")]
    NetworkError(String),
    #[error("Parse Error: {0}")]
    ParseError(String),
    #[error("Rate Limited")]
    RateLimited { retry_after: Option<u64> },
}

pub trait ProviderAdapter {
    async fn chat(&self, client: &reqwest::Client, req: &NormalizedRequest, api_key: &str) -> Result<NormalizedResponse, AdapterError>;
}

pub use openai::OpenAIAdapter;
pub use groq::GroqAdapter;
pub use anthropic::AnthropicAdapter;
