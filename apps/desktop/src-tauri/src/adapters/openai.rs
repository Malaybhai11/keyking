use crate::adapters::{AdapterError, ProviderAdapter};
use crate::proxy::{NormalizedRequest, NormalizedResponse};

pub struct OpenAIAdapter;

impl OpenAIAdapter {
    pub fn new() -> Self { Self }

    pub async fn chat_custom(
        &self,
        client: &reqwest::Client,
        req: &NormalizedRequest,
        api_key: &str,
        url: &str,
    ) -> Result<NormalizedResponse, AdapterError> {
        let response = client
            .post(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://keyking.ledgion.in")
            .header("X-Title", "KeyKing")
            .json(req)
            .send()
            .await
            .map_err(|e| AdapterError::NetworkError(e.to_string()))?;

        let status = response.status().as_u16();
        if !response.status().is_success() {
            let msg = response.text().await.unwrap_or_default();
            return Err(AdapterError::ApiError { status, message: msg });
        }

        let body = response.text().await.unwrap_or_default();
        let resp = match serde_json::from_str::<NormalizedResponse>(&body) {
            Ok(r) => r,
            Err(e) => {
                println!("Parse error from adapter: {}. Raw body: {}", e, body);
                return Err(AdapterError::ParseError(e.to_string()));
            }
        };
        Ok(resp)
    }
}

impl ProviderAdapter for OpenAIAdapter {
    async fn chat(&self, client: &reqwest::Client, req: &NormalizedRequest, api_key: &str) -> Result<NormalizedResponse, AdapterError> {
        self.chat_custom(client, req, api_key, "https://api.openai.com/v1/chat/completions").await
    }
}
