use crate::adapters::{AdapterError, ProviderAdapter};
use crate::proxy::{NormalizedRequest, NormalizedResponse};

pub struct GroqAdapter;

impl GroqAdapter {
    pub fn new() -> Self { Self }
}

impl ProviderAdapter for GroqAdapter {
    async fn chat(&self, client: &reqwest::Client, req: &NormalizedRequest, api_key: &str) -> Result<NormalizedResponse, AdapterError> {
        let model = match req.model.as_str() {
            "gpt-4o" => "llama-3.3-70b-versatile",
            "gpt-4" => "llama-3.3-70b-versatile",
            "gpt-4-turbo" => "llama-3.3-70b-versatile",
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
}
