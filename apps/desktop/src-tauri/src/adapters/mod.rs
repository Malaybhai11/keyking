use axum::http::HeaderMap;
use crate::proxy::{NormalizedRequest, NormalizedResponse};
use crate::quota::QuotaState;

pub mod openai;
pub mod groq;

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
    async fn chat(&self, req: &NormalizedRequest, api_key: &str) -> Result<NormalizedResponse, AdapterError>;
    fn parse_quota_headers(&self, headers: &HeaderMap) -> QuotaState;
    fn provider_name(&self) -> String;
}

// Re-export for convenience
pub use openai::OpenAIAdapter;
pub use groq::GroqAdapter;
