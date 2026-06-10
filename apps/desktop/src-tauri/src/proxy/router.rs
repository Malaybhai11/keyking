use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::sse::{Event, Sse},
    response::IntoResponse,
    response::Response,
};
use futures::StreamExt;
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;
use uuid::Uuid;

use super::{NormalizedRequest, RoutingEvent};
use crate::adapters::{AdapterError, ProviderAdapter, OpenAIAdapter, GroqAdapter, AnthropicAdapter};
use crate::commands::VaultState;
use crate::quota::{CircuitBreaker, QuotaMap};

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn extract_bearer(headers: &HeaderMap) -> Option<&str> {
    let auth = headers.get("authorization")?.to_str().ok()?;
    auth.strip_prefix("Bearer ")
}

fn model_to_provider(model: &str) -> &'static str {
    let l = model.to_lowercase();
    if l.contains("gpt") || l.contains("o1") || l.contains("o3") || l.contains("davinci") {
        "OpenAI"
    } else if l.contains("llama") || l.contains("groq") || l.contains("mixtral") || l.contains("gemma") {
        "Groq"
    } else if l.contains("gemini") {
        "Gemini"
    } else if l.contains("claude") {
        "Anthropic"
    } else if l.contains("mistral") || l.contains("codestral") {
        "Mistral"
    } else if l.contains("grok") {
        "xAI"
    } else if l.contains("deepseek") {
        "DeepSeek"
    } else if l.contains("command") || l.contains("cohere") {
        "Cohere"
    } else {
        "OpenAI"
    }
}

fn map_groq_model(model: &str) -> &str {
    match model {
        "gpt-4o" => "llama-3.3-70b-versatile",
        "gpt-4" => "llama-3.3-70b-versatile",
        "gpt-4-turbo" => "llama-3.3-70b-versatile",
        "gpt-3.5-turbo" => "llama-3.1-8b-instant",
        _ => model,
    }
}

fn provider_url(provider: &str) -> &'static str {
    match provider {
        "Groq" => "https://api.groq.com/openai/v1/chat/completions",
        "Gemini" => "https://generativelanguage.googleapis.com/v1beta/openai",
        "Anthropic" => "https://api.anthropic.com/v1",
        "Mistral" => "https://api.mistral.ai/v1",
        "xAI" => "https://api.x.ai/v1",
        "DeepSeek" => "https://api.deepseek.com/v1",
        "OpenRouter" => "https://openrouter.ai/api/v1",
        "Cohere" => "https://api.cohere.ai/v1",
        "Cerebras" => "https://api.cerebras.ai/v1",
        "Sambanova" => "https://api.sambanova.ai/v1",
        "Github" => "https://models.inference.ai.azure.com",
        "Cloudflare" => "https://api.cloudflare.com/client/v4/accounts/default/ai/v1",
        _ => "https://api.openai.com/v1/chat/completions",
    }
}

pub struct ProxyRouter {
    client: reqwest::Client,
    openai: OpenAIAdapter,
    groq: GroqAdapter,
    anthropic: AnthropicAdapter,
    vault: Arc<VaultState>,
    pub system_key: Arc<String>,
    circuit_breaker: CircuitBreaker,
    quota_map: QuotaMap,
    pub app_handle: Option<tauri::AppHandle>,
}

impl ProxyRouter {
    pub fn new(vault: Arc<VaultState>, system_key: Arc<String>, app_handle: Option<tauri::AppHandle>) -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(60))
                .connect_timeout(Duration::from_secs(10))
                .pool_max_idle_per_host(32)
                .build()
                .expect("Failed to create HTTP client"),
            openai: OpenAIAdapter::new(),
            groq: GroqAdapter::new(),
            anthropic: AnthropicAdapter::new(),
            vault,
            system_key,
            circuit_breaker: CircuitBreaker::new(),
            quota_map: QuotaMap::new(),
            app_handle,
        }
    }

    async fn update_quota_from_headers(&self, key_id: &str, provider: &str, headers: &reqwest::header::HeaderMap) {
        let remaining_req = headers.get("x-ratelimit-remaining-requests")
            .or_else(|| headers.get("ratelimit-remaining"))
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u32>().ok());
            
        let remaining_tokens = headers.get("x-ratelimit-remaining-tokens")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u32>().ok());
            
        let reset_at = headers.get("x-ratelimit-reset-requests")
            .or_else(|| headers.get("ratelimit-reset"))
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<f64>().ok())
            .map(|f| now_secs() + f as u64);

        let prov = match provider {
            "Groq" => crate::quota::Provider::Groq,
            _ => crate::quota::Provider::OpenAI,
        };

        let state = crate::quota::QuotaState {
            provider: prov,
            remaining_requests: remaining_req,
            remaining_tokens,
            reset_at,
            last_updated: now_secs(),
        };

        self.quota_map.update(key_id, state).await;
    }

    fn emit_event(&self, event: RoutingEvent) {
        if let Some(ref handle) = self.app_handle {
            handle.emit("routing-event", &event).ok();
        }
        
        let vault_state = self.vault.clone();
        tauri::async_runtime::spawn(async move {
            let vault = vault_state.vault.lock().await;
            let path = vault.data_dir.join("routing_log.json");
            let mut logs: Vec<RoutingEvent> = if path.exists() {
                let content = std::fs::read_to_string(&path).unwrap_or_default();
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                vec![]
            };
            logs.insert(0, event);
            if logs.len() > 200 {
                logs.truncate(200);
            }
            if let Ok(json) = serde_json::to_string_pretty(&logs) {
                let _ = std::fs::write(&path, json);
            }
        });
    }

    async fn try_key(
        &self,
        key_entry: &crate::vault::StoredKeyEntry,
        provider: &str,
        req: &NormalizedRequest,
        is_stream: bool,
        start: std::time::Instant,
    ) -> Result<Response, ()> {
        if !self.circuit_breaker.is_available(&key_entry.id).await {
            return Err(());
        }

        let plaintext = {
            let vault = self.vault.vault.lock().await;
            match vault.get_plaintext_key(&key_entry.id) {
                Some(Ok(k)) => k,
                _ => return Err(()),
            }
        };

        let base_url = provider_url(provider);
        let url = if base_url.ends_with("/chat/completions") {
            base_url.to_string()
        } else {
            format!("{}/chat/completions", base_url)
        };

        if is_stream {
            if provider == "Anthropic" {
                // Fetch non-streaming Anthropic response and stream it as a single chunk
                let ant_result = self.anthropic.chat(&self.client, req, &plaintext).await;
                match ant_result {
                    Ok(resp) => {
                        let latency = start.elapsed().as_millis() as u64;
                        self.circuit_breaker.record_success(&key_entry.id).await;
                        self.emit_event(RoutingEvent {
                            id: Uuid::new_v4().to_string(),
                            timestamp: now_secs(),
                            provider: provider.to_string(),
                            latency_ms: latency,
                            tokens_used: resp.usage.total_tokens,
                            success: true,
                            error_msg: None,
                        });
                        let chunk = serde_json::json!({
                            "id": resp.id,
                            "object": "chat.completion.chunk",
                            "created": resp.created,
                            "model": resp.model,
                            "choices": [{
                                "index": 0,
                                "delta": {
                                    "content": resp.choices[0].message.content
                                },
                                "finish_reason": Some("stop")
                            }]
                        });
                        let event_str = format!("data: {}\n\ndata: [DONE]\n\n", chunk.to_string());
                        let stream = futures::stream::once(async move {
                            Ok::<Event, std::convert::Infallible>(Event::default().data(event_str))
                        });
                        return Ok(Sse::new(stream).into_response());
                    }
                    Err(_) => {
                        self.circuit_breaker.record_failure(&key_entry.id).await;
                        return Err(());
                    }
                }
            }

            let effective_model = if provider == "Groq" {
                map_groq_model(&req.model).to_string()
            } else {
                req.model.clone()
            };
            let mut effective_max_tokens = req.max_tokens;
            if provider == "Groq" {
                if let Some(tokens) = effective_max_tokens {
                    effective_max_tokens = Some(tokens.min(4096));
                }
            }

            let mut stream_req = serde_json::json!({
                "model": effective_model,
                "messages": req.messages,
                "stream": true,
                "temperature": req.temperature,
                "max_tokens": effective_max_tokens,
                "top_p": req.top_p,
                "frequency_penalty": req.frequency_penalty,
                "presence_penalty": req.presence_penalty,
            });

            if let Some(obj) = stream_req.as_object_mut() {
                for (k, v) in &req.extra {
                    if provider == "Groq" && k == "tool_choice" && v == "required" {
                        obj.insert(k.clone(), serde_json::json!("auto"));
                    } else {
                        obj.insert(k.clone(), v.clone());
                    }
                }
            }

            let upstream = match self.client.post(&url)
                .header("Authorization", format!("Bearer {}", plaintext))
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", "https://keyking.ledgion.in")
                .header("X-Title", "KeyKing")
                .json(&stream_req)
                .send().await
            {
                Ok(r) => r,
                Err(e) => {
                    self.circuit_breaker.record_failure(&key_entry.id).await;
                    self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(e.to_string()) });
                    return Err(());
                }
            };

            let status = upstream.status().as_u16();
            if status == 401 {
                self.vault.vault.lock().await.set_key_validity(&key_entry.id, false);
                self.circuit_breaker.trip(&key_entry.id, Duration::from_secs(300)).await;
                self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(format!("HTTP 401 Unauthorized")) });
                return Err(());
            }
            if status == 429 {
                self.circuit_breaker.record_failure(&key_entry.id).await;
                self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(format!("HTTP 429 Rate Limited")) });
                return Err(());
            }
            if !upstream.status().is_success() {
                self.circuit_breaker.record_failure(&key_entry.id).await;
                self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(format!("HTTP {}", status)) });
                return Err(());
            }

            // Extract and update rate limit quota from headers
            self.update_quota_from_headers(&key_entry.id, provider, upstream.headers()).await;

            let latency = start.elapsed().as_millis() as u64;
            let stream = upstream.bytes_stream().map(|chunk_result| {
                chunk_result
                    .map(|bytes| Event::default().data(String::from_utf8_lossy(&bytes).as_ref()))
                    .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })
            });

            self.circuit_breaker.record_success(&key_entry.id).await;
            self.emit_event(RoutingEvent {
                id: Uuid::new_v4().to_string(),
                timestamp: now_secs(),
                provider: provider.to_string(),
                latency_ms: latency,
                tokens_used: 0,
                success: true,
                error_msg: None,
            });

            Ok(Sse::new(stream).into_response())
        } else {
            let result = match provider {
                "Groq" => self.groq.chat(&self.client, req, &plaintext).await,
                "Anthropic" => self.anthropic.chat(&self.client, req, &plaintext).await,
                _ => self.openai.chat_custom(&self.client, req, &plaintext, &url).await,
            };

            match result {
                Ok(resp) => {
                    let latency = start.elapsed().as_millis() as u64;
                    self.circuit_breaker.record_success(&key_entry.id).await;
                    self.emit_event(RoutingEvent {
                        id: Uuid::new_v4().to_string(),
                        timestamp: now_secs(),
                        provider: provider.to_string(),
                        latency_ms: latency,
                        tokens_used: resp.usage.total_tokens,
                        success: true,
                        error_msg: None,
                    });
                    let body = serde_json::to_string(&resp).unwrap_or_default();
                    Ok(([("Content-Type", "application/json"), ("x-keyking-latency-ms", &latency.to_string())], body).into_response())
                }
                Err(AdapterError::ApiError { status, message }) => {
                    if status == 401 {
                        self.vault.vault.lock().await.set_key_validity(&key_entry.id, false);
                        self.circuit_breaker.trip(&key_entry.id, Duration::from_secs(300)).await;
                    } else {
                        self.circuit_breaker.record_failure(&key_entry.id).await;
                    }
                    self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(format!("API Error {}: {}", status, message)) });
                    Err(())
                }
                Err(e) => {
                    self.circuit_breaker.record_failure(&key_entry.id).await;
                    self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(e.to_string()) });
                    Err(())
                }
            }
        }
    }

    async fn try_provider(
        &self,
        provider: &str,
        req: &NormalizedRequest,
        is_stream: bool,
        start: std::time::Instant,
    ) -> Result<Response, String> {
        let keys = {
            let vault = self.vault.vault.lock().await;
            vault.keys_by_provider(provider)
        };

        if keys.is_empty() {
            return Err(format!("No keys for {}", provider));
        }

        let mut key_ids: Vec<String> = keys.iter().filter(|k| k.is_valid).map(|k| k.id.clone()).collect();
        let mut ordered_keys = Vec::new();

        while !key_ids.is_empty() {
            if let Some(best) = self.quota_map.best_key(&key_ids).await {
                if let Some(pos) = key_ids.iter().position(|id| id == &best) {
                    key_ids.remove(pos);
                    if let Some(key_entry) = keys.iter().find(|k| k.id == best) {
                        ordered_keys.push(key_entry.clone());
                    }
                }
            } else {
                for id in key_ids {
                    if let Some(key_entry) = keys.iter().find(|k| k.id == id) {
                        ordered_keys.push(key_entry.clone());
                    }
                }
                break;
            }
        }

        for key_entry in &ordered_keys {
            match self.try_key(key_entry, provider, req, is_stream, start).await {
                Ok(response) => return Ok(response),
                Err(()) => continue,
            }
        }
        Err("All keys failed".to_string())
    }

    pub async fn handle_chat(
        State(router): State<Arc<Self>>,
        headers: HeaderMap,
        Json(req): Json<NormalizedRequest>,
    ) -> Response {
        let provided_key = extract_bearer(&headers).unwrap_or("");
        if provided_key != router.system_key.as_str() {
            return (StatusCode::UNAUTHORIZED, Json(json!({
                "error": "Invalid or missing API key. Use the system key from the Key King Dashboard."
            }))).into_response();
        }

        let is_stream = req.stream.unwrap_or(false);
        let start = std::time::Instant::now();
        
        let rules_path = router.vault.vault.lock().await.data_dir.join("routing_rules.json");
        let mut custom_rules: Vec<crate::commands::RoutingRule> = vec![];
        if rules_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&rules_path) {
                custom_rules = serde_json::from_str(&content).unwrap_or_default();
            }
        }

        if !custom_rules.is_empty() {
            for rule in &custom_rules {
                let mut modified_req = req.clone();
                modified_req.model = rule.model.clone();
                if let Ok(response) = router.try_provider(&rule.provider, &modified_req, is_stream, start).await {
                    return response;
                }
            }
        } else {
            let primary_provider = model_to_provider(&req.model);

            // Try primary provider first
            if let Ok(response) = router.try_provider(primary_provider, &req, is_stream, start).await {
                return response;
            }

            // Fallback: try all other providers that have keys
            let all_providers = ["OpenAI", "Groq", "Gemini", "Anthropic", "Mistral", "xAI", "DeepSeek", "OpenRouter", "Cohere", "Cerebras", "Sambanova", "Cloudflare", "Github"];
            for &provider in &all_providers {
                if provider == primary_provider {
                    continue;
                }
                if let Ok(response) = router.try_provider(provider, &req, is_stream, start).await {
                    return response;
                }
            }
        }

        let primary_provider = if !custom_rules.is_empty() {
            &custom_rules[0].provider
        } else {
            model_to_provider(&req.model)
        };

        // Check KEYKING_DEV_KEY env var as last resort
        let env_key = std::env::var("KEYKING_DEV_KEY").unwrap_or_default();
        if !env_key.is_empty() {
            let base_url = provider_url(primary_provider);
            let url = if base_url.ends_with("/chat/completions") {
                base_url.to_string()
            } else {
                format!("{}/chat/completions", base_url)
            };

            if is_stream {
                if primary_provider == "Anthropic" {
                    let ant_result = router.anthropic.chat(&router.client, &req, &env_key).await;
                    return match ant_result {
                        Ok(resp) => {
                            let chunk = serde_json::json!({
                                "id": resp.id,
                                "object": "chat.completion.chunk",
                                "created": resp.created,
                                "model": resp.model,
                                "choices": [{
                                    "index": 0,
                                    "delta": {
                                        "content": resp.choices[0].message.content
                                    },
                                    "finish_reason": Some("stop")
                                }]
                            });
                            let event_str = format!("data: {}\n\ndata: [DONE]\n\n", chunk.to_string());
                            let stream = futures::stream::once(async move {
                                Ok::<Event, std::convert::Infallible>(Event::default().data(event_str))
                            });
                            Sse::new(stream).into_response()
                        }
                        Err(e) => {
                            let status = match &e { AdapterError::ApiError { status, .. } => *status, _ => 500 };
                            (StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), Json(json!({"error": format!("{}", e)}))).into_response()
                        }
                    };
                }

                let env_model = if primary_provider == "Groq" {
                    map_groq_model(&req.model).to_string()
                } else {
                    req.model.clone()
                };
                let mut effective_max_tokens = req.max_tokens;
                if primary_provider == "Groq" {
                    if let Some(tokens) = effective_max_tokens {
                        effective_max_tokens = Some(tokens.min(4096));
                    }
                }
                
                let mut stream_req = serde_json::json!({
                    "model": env_model,
                    "messages": req.messages,
                    "stream": true,
                    "temperature": req.temperature,
                    "max_tokens": effective_max_tokens,
                    "top_p": req.top_p,
                    "frequency_penalty": req.frequency_penalty,
                    "presence_penalty": req.presence_penalty,
                });

                if let Some(obj) = stream_req.as_object_mut() {
                    for (k, v) in &req.extra {
                        if primary_provider == "Groq" && k == "tool_choice" && v == "required" {
                            obj.insert(k.clone(), serde_json::json!("auto"));
                        } else {
                            obj.insert(k.clone(), v.clone());
                        }
                    }
                }
                return match router.client.post(&url)
                    .header("Authorization", format!("Bearer {}", env_key))
                    .header("Content-Type", "application/json")
                    .json(&stream_req)
                    .send().await
                {
                    Ok(upstream) if upstream.status().is_success() => {
                        let stream = upstream.bytes_stream().map(|c| c
                            .map(|b| Event::default().data(String::from_utf8_lossy(&b).as_ref()))
                            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() }));
                        Sse::new(stream).into_response()
                    }
                    Ok(upstream) => {
                        let status = upstream.status().as_u16();
                        let msg = upstream.text().await.unwrap_or_default();
                        (StatusCode::from_u16(status).unwrap_or(StatusCode::BAD_GATEWAY), Json(json!({"error": msg}))).into_response()
                    }
                    Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({"error": format!("Upstream failed: {}", e)}))).into_response()
                };
            } else {
                let result = match primary_provider {
                    "Groq" => router.groq.chat(&router.client, &req, &env_key).await,
                    "Anthropic" => router.anthropic.chat(&router.client, &req, &env_key).await,
                    _ => router.openai.chat_custom(&router.client, &req, &env_key, &url).await,
                };
                return match result {
                    Ok(resp) => {
                        let body = serde_json::to_string(&resp).unwrap_or_default();
                        ([("Content-Type", "application/json")], body).into_response()
                    }
                    Err(e) => {
                        let s = match &e { AdapterError::ApiError { status, .. } => *status, _ => 500 };
                        (StatusCode::from_u16(s).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), Json(json!({"error": format!("{}", e)}))).into_response()
                    }
                };
            }
        }

        router.emit_event(RoutingEvent {
            id: Uuid::new_v4().to_string(),
            timestamp: now_secs(),
            provider: primary_provider.to_string(),
            latency_ms: start.elapsed().as_millis() as u64,
            tokens_used: 0,
            success: false,
            error_msg: Some("No valid API keys available".to_string()),
        });

        (StatusCode::UNAUTHORIZED, Json(json!({
            "error": "No valid API keys available for any provider. Open the Key King app and add provider keys (e.g., OpenAI) in the Keys page."
        }))).into_response()
    }

    pub async fn handle_models(State(_router): State<Arc<Self>>) -> impl IntoResponse {
        let models = serde_json::json!({
            "object": "list",
            "data": [
                {"id": "gpt-4o", "object": "model", "owned_by": "openai"},
                {"id": "gpt-3.5-turbo", "object": "model", "owned_by": "openai"},
                {"id": "gpt-4", "object": "model", "owned_by": "openai"},
                {"id": "o1", "object": "model", "owned_by": "openai"},
                {"id": "llama-3.3-70b-versatile", "object": "model", "owned_by": "groq"},
                {"id": "llama-3.1-8b-instant", "object": "model", "owned_by": "groq"},
                {"id": "mixtral-8x7b-32768", "object": "model", "owned_by": "groq"},
                {"id": "gemma2-9b-it", "object": "model", "owned_by": "groq"},
            ]
        });
        ([("Content-Type", "application/json")], models.to_string())
    }
}
