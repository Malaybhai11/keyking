use crate::adapters::{AdapterError, ProviderAdapter};
use crate::proxy::{NormalizedRequest, NormalizedResponse};
use crate::quota::QuotaState;
use axum::http::HeaderMap;

pub struct GroqAdapter;

impl GroqAdapter {
    pub fn new() -> Self { Self }
}

impl ProviderAdapter for GroqAdapter {
    async fn chat(&self, req: &NormalizedRequest, api_key: &str) -> Result<NormalizedResponse, AdapterError> {
        let client = reqwest::Client::new();
        
        // Map model names
        let model = match req.model.as_str() {
            "gpt-4o" => "llama-3.3-70b-versatile",
            "gpt-3.5-turbo" => "llama-3.1-8b-instant",
            _ => &req.model,
        };
        
        let mut mapped_req = req.clone();
        mapped_req.model = model.to_string();
        
        let response = client
            .post("https://api.groq.com/openai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&mapped_req)
            .send()
            .await
            .map_err(|e| AdapterError::NetworkError(e.to_string()))?;
        
        let status = response.status().as_u16();
        if !response.status().is_success() {
            let msg = response.text().await.unwrap_or_default();
            return Err(AdapterError::ApiError { status, message: msg });
        }
        
        let resp = response.json::<NormalizedResponse>().await
            .map_err(|e| AdapterError::ParseError(e.to_string()))?;
        Ok(resp)
    }

    fn parse_quota_headers(&self, headers: &HeaderMap) -> QuotaState {
        let remaining_requests = headers.get("x-ratelimit-remaining-requests")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse().ok());
        let remaining_tokens = headers.get("x-ratelimit-remaining-tokens")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse().ok());
        
        QuotaState {
            provider: crate::quota::Provider::Groq,
            remaining_requests,
            remaining_tokens,
            reset_at: None,
            last_updated: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64,
        }
    }

    fn provider_name(&self) -> String {
        "Groq".to_string()
    }
}
