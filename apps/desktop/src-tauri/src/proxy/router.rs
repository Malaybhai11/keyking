use axum::{extract::Json, http::StatusCode, response::IntoResponse};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::{NormalizedRequest, NormalizedResponse};
use crate::adapters::{ProviderAdapter, AdapterError};
use crate::adapters::openai::OpenAIAdapter;
use crate::adapters::groq::GroqAdapter;

pub struct ProxyRouter {
    openai: OpenAIAdapter,
    groq: GroqAdapter,
}

impl ProxyRouter {
    pub fn new() -> Self {
        Self {
            openai: OpenAIAdapter::new(),
            groq: GroqAdapter::new(),
        }
    }

    pub async fn handle_chat(&self, Json(req): Json<NormalizedRequest>) -> impl IntoResponse {
        // Phase 1: Hardcoded to OpenAI
        let api_key = std::env::var("KEYKING_DEV_KEY").unwrap_or_default();
        
        let start = std::time::Instant::now();
        let result = if req.model.contains("llama") || req.model.contains("groq") {
            self.groq.chat(&req, &api_key).await
        } else {
            self.openai.chat(&req, &api_key).await
        };
        let latency = start.elapsed().as_millis() as u64;
        
        match result {
            Ok(resp) => {
                let body = serde_json::to_string(&resp).unwrap();
                ([
                    ("Content-Type", "application/json"),
                    ("x-keyking-latency-ms", &latency.to_string()),
                ], body).into_response()
            }
            Err(e) => {
                let status = match e {
                    AdapterError::ApiError { status, .. } => status,
                    _ => 500,
                };
                (StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), Json(json!({"error": format!("{}", e)}))).into_response()
            }
        }
    }

    pub async fn handle_models(&self) -> impl IntoResponse {
        let models = serde_json::json!({
            "object": "list",
            "data": [
                {"id": "gpt-4o", "object": "model", "owned_by": "openai"},
                {"id": "gpt-3.5-turbo", "object": "model", "owned_by": "openai"},
                {"id": "llama-3.3-70b-versatile", "object": "model", "owned_by": "groq"},
                {"id": "llama-3.1-8b-instant", "object": "model", "owned_by": "groq"},
            ]
        });
        ([("Content-Type", "application/json")], models.to_string())
    }
}
