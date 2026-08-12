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
    if l.contains("lumos") || l.contains("claude-opus-4") || l.contains("claude-sonnet-4.5") || l.contains("claude-haiku-4") || l.contains("gpt-5.5") {
        "Lumos"
    } else if l.contains("gpt-5") || l.contains("zen") {
        "OpencodeZen"
    } else if l.contains("nvidia") || l.contains("nim") {
        "Nvidia"
    } else if l.contains("gpt") || l.contains("o1") || l.contains("o3") || l.contains("davinci") {
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
    } else if l.contains("tokenrouter") || l.contains("kimi") || l.contains("moonshot") {
        "TokenRouter"
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

fn map_tokenrouter_model(model: &str) -> &str {
    match model {
        "kimi-k3" | "kimi" | "kimi-k3-free" => "moonshotai/kimi-k3-free",
        _ => model,
    }
}

/// Claude Code traffic arrives as `gpt-4o` via the Anthropic compatibility layer
/// (proxy/anthropic.rs). OpenCode Zen only serves its own curated catalog IDs, so
/// the implicit legacy alias must be remapped or Zen rejects the request.
///
/// The fallback model is overridable via the KEYKING_ZEN_DEFAULT_MODEL env var so
/// a Zen catalog change never requires a rebuild and redeploy. Models chosen
/// explicitly through routing rules pass through untouched. This is a pure string
/// match: no network calls, and no cost when Zen is not in the routing path.
fn map_opencode_zen_model(model: &str) -> String {
    const DEFAULT_ZEN_MODEL: &str = "big-pickle";
    match model {
        "gpt-4o" => std::env::var("KEYKING_ZEN_DEFAULT_MODEL")
            .ok()
            .filter(|m| !m.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_ZEN_MODEL.to_string()),
        other => other.to_string(),
    }
}

fn provider_url(provider: &str) -> &'static str {
    match provider {
        "Groq" => "https://api.groq.com/openai/v1/chat/completions",
        "Gemini" => "https://generativelanguage.googleapis.com/v1beta/openai",
        "Anthropic" => "https://api.anthropic.com/v1/messages",
        "Mistral" => "https://api.mistral.ai/v1",
        "xAI" => "https://api.x.ai/v1",
        "DeepSeek" => "https://api.deepseek.com/v1",
        "OpenRouter" => "https://openrouter.ai/api/v1",
        "Cohere" => "https://api.cohere.ai/v1",
        "Cerebras" => "https://api.cerebras.ai/v1",
        "Sambanova" => "https://api.sambanova.ai/v1",
        "Github" => "https://models.inference.ai.azure.com",
        "Cloudflare" => "https://api.cloudflare.com/client/v4/accounts/default/ai/v1",
        "Nvidia" => "https://integrate.api.nvidia.com/v1",
        "OpencodeZen" => "https://opencode.ai/zen/v1",
        "Lumos" => "https://api.lumosel.vip/v1/messages",
        "TokenRouter" => "https://api.tokenrouter.com/v1/chat/completions",
        _ => "https://api.openai.com/v1/chat/completions",
    }
}

/// Every provider name with a dedicated endpoint in provider_url(). Used as a
/// guard before dispatching: an unknown provider must never reach the catch-all
/// arm, because that would send its API key to the wrong host (credential leak)
/// and the resulting 401 would wrongly mark the key invalid.
const KNOWN_PROVIDERS: &[&str] = &[
    "OpenAI", "Groq", "Gemini", "Anthropic", "Mistral", "xAI", "DeepSeek",
    "OpenRouter", "Cohere", "Cerebras", "Sambanova", "Cloudflare", "Github",
    "Nvidia", "OpencodeZen", "Lumos", "TokenRouter",
];

/// How the router may proceed after a failed upstream attempt.
#[derive(Debug, Clone, Copy)]
enum FailAction {
    /// Try the next key for the same provider (401, 429, network errors, 5xx).
    NextKey,
    /// Skip the remaining keys for this provider — the request itself was
    /// rejected (400/404/422), so every key fails identically — but keep
    /// failing over to the next provider or routing rule.
    NextProvider,
}

/// A classified upstream failure with enough detail to explain it to the caller.
#[derive(Debug)]
struct UpstreamFailure {
    action: FailAction,
    summary: String,
}

impl UpstreamFailure {
    fn next_key(summary: String) -> Self {
        Self { action: FailAction::NextKey, summary }
    }
    fn next_provider(summary: String) -> Self {
        Self { action: FailAction::NextProvider, summary }
    }
}

/// 400/404/422 mean the request shape itself was rejected — deterministic for
/// every key on this provider, but another provider may still serve it.
fn is_deterministic_4xx(status: u16) -> bool {
    status == 400 || status == 404 || status == 422
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
                .connect_timeout(Duration::from_secs(15))
                .tcp_keepalive(Duration::from_secs(10))
                .pool_max_idle_per_host(32)
                .pool_idle_timeout(Duration::from_secs(300))
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

    pub fn update_event_tokens_static(vault: Arc<VaultState>, app_handle: Option<tauri::AppHandle>, event_id: &str, tokens: u32) {
        if let Some(ref handle) = app_handle {
            handle.emit("routing-event-update", serde_json::json!({
                "id": event_id,
                "tokens_used": tokens
            })).ok();
        }
        
        let id_clone = event_id.to_string();
        tauri::async_runtime::spawn(async move {
            let vault_lock = vault.vault.lock().await;
            let path = vault_lock.data_dir.join("routing_log.json");
            if path.exists() {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(mut logs) = serde_json::from_str::<Vec<RoutingEvent>>(&content) {
                        for log in logs.iter_mut() {
                            if log.id == id_clone {
                                log.tokens_used = tokens;
                                break;
                            }
                        }
                        if let Ok(json) = serde_json::to_string_pretty(&logs) {
                            let _ = std::fs::write(&path, json);
                        }
                    }
                }
            }
        });
    }

    pub fn update_event_tokens(&self, event_id: &str, tokens: u32) {
        Self::update_event_tokens_static(self.vault.clone(), self.app_handle.clone(), event_id, tokens);
    }

    /// Removes keys whose value is JSON null from a request body built with
    /// serde_json::json!(). json!() serializes Option::None as explicit null,
    /// bypassing the skip_serializing_if attributes on NormalizedRequest, and
    /// strict OpenAI-compatible upstreams (e.g. SGLang) reject null numeric
    /// params like frequency_penalty/presence_penalty with a 400.
    fn strip_null_fields(body: &mut serde_json::Value) {
        if let Some(obj) = body.as_object_mut() {
            obj.retain(|_, v| !v.is_null());
        }
    }

    /// Reads up to 500 chars of an upstream error body so the routing log and
    /// the caller see the provider's actual message (e.g. quota exhausted vs
    /// unknown model) instead of a bare status code.
    async fn upstream_error_detail(upstream: reqwest::Response, prefix: String) -> String {
        let body = upstream.text().await.unwrap_or_default();
        if body.is_empty() {
            prefix
        } else {
            format!("{}: {}", prefix, body.chars().take(500).collect::<String>())
        }
    }

    async fn try_key(
        &self,
        key_entry: &crate::vault::StoredKeyEntry,
        provider: &str,
        req: &NormalizedRequest,
        is_stream: bool,
        start: std::time::Instant,
    ) -> Result<Response, UpstreamFailure> {
        if !self.circuit_breaker.is_available(&key_entry.id).await {
            return Err(UpstreamFailure::next_key("circuit breaker open".to_string()));
        }

        // Guard: never send a provider's key to the catch-all endpoint in
        // provider_url(). An unknown provider name would leak the credential to
        // the wrong host and get the key wrongly invalidated on the 401.
        if !KNOWN_PROVIDERS.contains(&provider) {
            return Err(UpstreamFailure::next_provider(format!("unknown provider '{}'", provider)));
        }

        let plaintext = {
            let vault = self.vault.vault.lock().await;
            match vault.get_plaintext_key(&key_entry.id) {
                Some(Ok(k)) => k,
                _ => return Err(UpstreamFailure::next_key("could not decrypt key".to_string())),
            }
        };

        let base_url = provider_url(provider);
        let url = if base_url.ends_with("/chat/completions") || base_url.ends_with("/messages") {
            base_url.to_string()
        } else {
            format!("{}/chat/completions", base_url)
        };

        if is_stream {
            if provider == "Anthropic" || provider == "Lumos" {
                // Fetch non-streaming Anthropic response and stream it as a single chunk
                let ant_result = self.anthropic.chat_custom(&self.client, req, &plaintext, provider_url(provider)).await;
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
                    Err(e) => {
                        let summary = e.to_string();
                        let failure = match &e {
                            // Deterministic request error: not the key's fault, don't
                            // burn breaker budget — but this provider+model can never
                            // serve this request shape, so move to the next provider.
                            AdapterError::ApiError { status, .. } if is_deterministic_4xx(*status) => {
                                UpstreamFailure::next_provider(summary)
                            }
                            _ => {
                                self.circuit_breaker.record_failure(&key_entry.id).await;
                                UpstreamFailure::next_key(summary)
                            }
                        };
                        return Err(failure);
                    }
                }
            }

            let effective_model = if provider == "Groq" {
                map_groq_model(&req.model).to_string()
            } else if provider == "TokenRouter" {
                map_tokenrouter_model(&req.model).to_string()
            } else if provider == "OpencodeZen" {
                map_opencode_zen_model(&req.model)
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
                "stream_options": { "include_usage": true },
                "temperature": req.temperature,
                "max_tokens": effective_max_tokens,
                "top_p": req.top_p,
                "frequency_penalty": req.frequency_penalty,
                "presence_penalty": req.presence_penalty,
            });

            // Drop optional fields the client never set instead of sending null.
            Self::strip_null_fields(&mut stream_req);

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
                    return Err(UpstreamFailure::next_key(e.to_string()));
                }
            };

            let status = upstream.status().as_u16();
            if status == 401 {
                self.vault.vault.lock().await.set_key_validity(&key_entry.id, false);
                self.circuit_breaker.trip(&key_entry.id, Duration::from_secs(300)).await;
                self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(format!("HTTP 401 Unauthorized")) });
                return Err(UpstreamFailure::next_key("HTTP 401 Unauthorized".to_string()));
            }
            if status == 429 {
                self.circuit_breaker.record_failure(&key_entry.id).await;
                let detail = Self::upstream_error_detail(upstream, "HTTP 429 Rate Limited".to_string()).await;
                self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(detail.clone()) });
                return Err(UpstreamFailure::next_key(detail));
            }
            if is_deterministic_4xx(status) {
                // The request shape itself was rejected; every key on this provider
                // would fail identically. Don't burn circuit-breaker budget on the
                // key — just move to the next provider / routing rule.
                let detail = Self::upstream_error_detail(upstream, format!("HTTP {}", status)).await;
                self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(detail.clone()) });
                return Err(UpstreamFailure::next_provider(detail));
            }
            if !upstream.status().is_success() {
                self.circuit_breaker.record_failure(&key_entry.id).await;
                let detail = Self::upstream_error_detail(upstream, format!("HTTP {}", status)).await;
                self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(detail.clone()) });
                return Err(UpstreamFailure::next_key(detail));
            }

            // Extract and update rate limit quota from headers
            self.update_quota_from_headers(&key_entry.id, provider, upstream.headers()).await;

            let latency = start.elapsed().as_millis() as u64;
            let event_id = Uuid::new_v4().to_string();
            let event_id_clone = event_id.clone();
            let vault_clone = self.vault.clone();
            let app_clone = self.app_handle.clone();

            let stream = upstream.bytes_stream().map(move |chunk_result| {
                chunk_result
                    .map(|bytes| {
                        let text = String::from_utf8_lossy(&bytes);
                        if text.contains("\"usage\"") && text.contains("\"total_tokens\":") {
                            if let Some(idx) = text.find("\"total_tokens\":") {
                                let start = idx + 15;
                                let remaining = &text[start..];
                                let end_idx = remaining.find(|c: char| !c.is_ascii_digit()).unwrap_or(remaining.len());
                                if let Ok(tokens) = remaining[..end_idx].trim().parse::<u32>() {
                                    ProxyRouter::update_event_tokens_static(vault_clone.clone(), app_clone.clone(), &event_id_clone, tokens);
                                }
                            }
                        }
                        Event::default().data(text.as_ref())
                    })
                    .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })
            });

            self.circuit_breaker.record_success(&key_entry.id).await;
            self.emit_event(RoutingEvent {
                id: event_id,
                timestamp: now_secs(),
                provider: provider.to_string(),
                latency_ms: latency,
                tokens_used: 0,
                success: true,
                error_msg: None,
            });

            Ok(Sse::new(stream).into_response())
        } else {
            // Remap the implicit legacy model alias for providers with their own
            // catalog (OpenCode Zen); explicit routing-rule models are untouched.
            let mut effective_req = req.clone();
            if provider == "OpencodeZen" {
                effective_req.model = map_opencode_zen_model(&req.model);
            }
            let result = match provider {
                "Groq" => self.groq.chat(&self.client, &effective_req, &plaintext).await,
                "Anthropic" | "Lumos" => self.anthropic.chat_custom(&self.client, &effective_req, &plaintext, provider_url(provider)).await,
                _ => self.openai.chat_custom(&self.client, &effective_req, &plaintext, &url).await,
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
                    let summary = format!("API Error {}: {}", status, message);
                    if status == 401 {
                        self.vault.vault.lock().await.set_key_validity(&key_entry.id, false);
                        self.circuit_breaker.trip(&key_entry.id, Duration::from_secs(300)).await;
                        self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(summary.clone()) });
                        return Err(UpstreamFailure::next_key(summary));
                    }
                    if is_deterministic_4xx(status) {
                        // Deterministic request error: skip remaining keys for this
                        // provider, but keep failing over to the next one.
                        self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(summary.clone()) });
                        return Err(UpstreamFailure::next_provider(summary));
                    }
                    self.circuit_breaker.record_failure(&key_entry.id).await;
                    self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(summary.clone()) });
                    Err(UpstreamFailure::next_key(summary))
                }
                Err(e) => {
                    self.circuit_breaker.record_failure(&key_entry.id).await;
                    self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(e.to_string()) });
                    Err(UpstreamFailure::next_key(e.to_string()))
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
    ) -> Result<Response, UpstreamFailure> {
        let keys = {
            let vault = self.vault.vault.lock().await;
            vault.keys_by_provider(provider)
        };

        if keys.is_empty() {
            return Err(UpstreamFailure::next_provider(format!("no keys configured for {}", provider)));
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

        let mut last_failure: Option<UpstreamFailure> = None;
        for key_entry in &ordered_keys {
            match self.try_key(key_entry, provider, req, is_stream, start).await {
                Ok(response) => return Ok(response),
                Err(f) => {
                    // Deterministic 4xx: the same request fails on every key for
                    // this provider — skip the rest and let the caller move on.
                    let skip_remaining_keys = matches!(f.action, FailAction::NextProvider);
                    last_failure = Some(f);
                    if skip_remaining_keys {
                        break;
                    }
                }
            }
        }
        Err(last_failure.unwrap_or_else(|| UpstreamFailure::next_key("all keys failed".to_string())))
    }

    /// Returns the raw upstream reqwest::Response for streaming requests.
    /// Used by the Anthropic proxy handler to bypass the SSE double-wrapping issue.
    pub async fn get_raw_stream(
        &self,
        req: &NormalizedRequest,
    ) -> Result<(reqwest::Response, String, String), String> {
        let start = std::time::Instant::now();

        let rules_path = self.vault.vault.lock().await.data_dir.join("routing_rules.json");
        let mut custom_rules: Vec<crate::commands::RoutingRule> = vec![];
        if rules_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&rules_path) {
                custom_rules = serde_json::from_str(&content).unwrap_or_default();
            }
        }

        let providers_to_try: Vec<(String, String)> = if !custom_rules.is_empty() {
            custom_rules.iter().map(|r| (r.provider.clone(), r.model.clone())).collect()
        } else {
            let primary = model_to_provider(&req.model);
            let all = ["OpenAI", "Groq", "Gemini", "Anthropic", "Mistral", "xAI", "DeepSeek", "OpenRouter", "Cohere", "Cerebras", "Sambanova", "Cloudflare", "Github", "Nvidia", "OpencodeZen", "Lumos", "TokenRouter"];
            let mut list = vec![(primary.to_string(), req.model.clone())];
            for &p in &all {
                if p != primary {
                    list.push((p.to_string(), req.model.clone()));
                }
            }
            list
        };

        // Per-attempt outcomes, surfaced in the final error if everything fails
        // so the caller can see exactly why each provider+model was rejected.
        let mut failures: Vec<String> = Vec::new();

        for (provider, model) in &providers_to_try {
            // Guard: never send a provider's key to the catch-all endpoint in
            // provider_url() — that leaks the credential to the wrong host.
            if !KNOWN_PROVIDERS.contains(&provider.as_str()) {
                failures.push(format!("{}:{} — skipped (unknown provider)", provider, model));
                continue;
            }

            let keys = {
                let vault = self.vault.vault.lock().await;
                vault.keys_by_provider(provider)
            };
            let valid_keys: Vec<_> = keys.iter().filter(|k| k.is_valid).collect();
            if valid_keys.is_empty() {
                failures.push(format!("{}:{} — skipped (no valid keys)", provider, model));
                continue;
            }

            for key_entry in &valid_keys {
                if !self.circuit_breaker.is_available(&key_entry.id).await {
                    failures.push(format!("{}:{} — skipped (circuit breaker open)", provider, model));
                    continue;
                }

                let plaintext = {
                    let vault = self.vault.vault.lock().await;
                    match vault.get_plaintext_key(&key_entry.id) {
                        Some(Ok(k)) => k,
                        _ => {
                            failures.push(format!("{}:{} — could not decrypt key", provider, model));
                            continue;
                        }
                    }
                };

                let base_url = provider_url(provider);
                let url = if base_url.ends_with("/chat/completions") || base_url.ends_with("/messages") {
                    base_url.to_string()
                } else {
                    format!("{}/chat/completions", base_url)
                };

                let effective_model = if provider == "Groq" {
                    map_groq_model(model).to_string()
                } else if provider == "TokenRouter" {
                    map_tokenrouter_model(model).to_string()
                } else if provider == "OpencodeZen" {
                    map_opencode_zen_model(model)
                } else {
                    model.clone()
                };

                let stream_req = if provider == "Anthropic" || provider == "Lumos" {
                    // Use the model from routing rules, not the original request model
                    let mut override_req = req.clone();
                    override_req.model = effective_model.clone();
                    let mut req_val = self.anthropic.build_request(&override_req, &url);
                    if let Some(obj) = req_val.as_object_mut() {
                        obj.insert("stream".to_string(), serde_json::json!(true));
                    }
                    req_val
                } else {
                    let mut req_val = serde_json::json!({
                        "model": effective_model,
                        "messages": req.messages,
                        "stream": true,
                        "temperature": req.temperature,
                        "max_tokens": req.max_tokens,
                        "top_p": req.top_p,
                        "frequency_penalty": req.frequency_penalty,
                        "presence_penalty": req.presence_penalty,
                    });

                    // Drop optional fields the client never set instead of sending null.
                    Self::strip_null_fields(&mut req_val);

                    if let Some(obj) = req_val.as_object_mut() {
                        for (k, v) in &req.extra {
                            if (provider == "Groq" || provider == "TokenRouter") && k == "tool_choice" && v == "required" {
                                obj.insert(k.clone(), serde_json::json!("auto"));
                            } else {
                                obj.insert(k.clone(), v.clone());
                            }
                        }
                    }
                    req_val
                };

                let mut req_builder = self.client.post(&url);
                if provider == "Anthropic" || provider == "Lumos" {
                    if url.contains("lumosel.vip") {
                        req_builder = req_builder
                            .header("x-api-key", &plaintext)
                            .header("anthropic-version", "2023-06-01")
                            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                            .header("Content-Type", "application/json");
                    } else {
                        req_builder = req_builder
                            .header("x-api-key", &plaintext)
                            .header("anthropic-version", "2023-06-01")
                            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                            .header("Content-Type", "application/json");
                    }
                } else {
                    req_builder = req_builder
                        .header("Authorization", format!("Bearer {}", plaintext))
                        .header("Content-Type", "application/json")
                        .header("HTTP-Referer", "https://keyking.ledgion.in")
                        .header("X-Title", "KeyKing");
                }

                eprintln!("[KEYKING DEBUG] Sending to provider={} url={}", provider, url);
                eprintln!("[KEYKING DEBUG] Body: {}", serde_json::to_string_pretty(&stream_req).unwrap_or_default());

                let upstream = match req_builder
                    .json(&stream_req)
                    .send().await
                {
                    Ok(r) => r,
                    Err(e) => {
                        self.circuit_breaker.record_failure(&key_entry.id).await;
                        self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(e.to_string()) });
                        failures.push(format!("{}:{} — {}", provider, model, e));
                        continue;
                    }
                };

                let status = upstream.status().as_u16();
                if status == 401 || status == 429 || !upstream.status().is_success() {
                    let detail = Self::upstream_error_detail(upstream, format!("HTTP {}", status)).await;
                    if is_deterministic_4xx(status) {
                        // The request shape itself was rejected: skip the remaining
                        // keys for this provider (every key fails identically) but
                        // keep failing over to the next provider / routing rule.
                        // Don't burn circuit-breaker budget — it's not the key's fault.
                        self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(detail.clone()) });
                        failures.push(format!("{}:{} — {}", provider, model, detail));
                        break;
                    }
                    self.circuit_breaker.record_failure(&key_entry.id).await;
                    self.emit_event(RoutingEvent { id: Uuid::new_v4().to_string(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: start.elapsed().as_millis() as u64, tokens_used: 0, success: false, error_msg: Some(detail.clone()) });
                    failures.push(format!("{}:{} — {}", provider, model, detail));
                    continue;
                }

                self.update_quota_from_headers(&key_entry.id, provider, upstream.headers()).await;
                let latency = start.elapsed().as_millis() as u64;
                self.circuit_breaker.record_success(&key_entry.id).await;
                let event_id = Uuid::new_v4().to_string();
                self.emit_event(RoutingEvent { id: event_id.clone(), timestamp: now_secs(), provider: provider.to_string(), latency_ms: latency, tokens_used: 0, success: true, error_msg: None });

                return Ok((upstream, event_id, provider.to_string()));
            }
        }

        if failures.is_empty() {
            Err("All providers/keys exhausted (no provider had usable keys)".to_string())
        } else {
            Err(format!("All providers/keys exhausted. Attempts: {}", failures.join(" | ")))
        }
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

        // Per-attempt outcomes, surfaced in the final response if everything
        // fails so the caller can see exactly why each provider+model was
        // rejected instead of a misleading "No valid API keys available".
        let mut attempts: Vec<String> = Vec::new();

        if !custom_rules.is_empty() {
            for rule in &custom_rules {
                let mut modified_req = req.clone();
                modified_req.model = rule.model.clone();
                match router.try_provider(&rule.provider, &modified_req, is_stream, start).await {
                    Ok(response) => return response,
                    Err(f) => attempts.push(format!("{}:{} — {}", rule.provider, rule.model, f.summary)),
                }
            }
        } else {
            let primary_provider = model_to_provider(&req.model);

            // Try primary provider first
            match router.try_provider(primary_provider, &req, is_stream, start).await {
                Ok(response) => return response,
                Err(f) => attempts.push(format!("{}:{} — {}", primary_provider, req.model, f.summary)),
            }

            // Fallback: try all other providers that have keys
            let all_providers = ["OpenAI", "Groq", "Gemini", "Anthropic", "Mistral", "xAI", "DeepSeek", "OpenRouter", "Cohere", "Cerebras", "Sambanova", "Cloudflare", "Github", "Nvidia", "OpencodeZen", "Lumos", "TokenRouter"];
            for &provider in &all_providers {
                if provider == primary_provider {
                    continue;
                }
                match router.try_provider(provider, &req, is_stream, start).await {
                    Ok(response) => return response,
                    Err(f) => attempts.push(format!("{}:{} — {}", provider, req.model, f.summary)),
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
            let url = if base_url.ends_with("/chat/completions") || base_url.ends_with("/messages") {
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
                } else if primary_provider == "TokenRouter" {
                    map_tokenrouter_model(&req.model).to_string()
                } else if primary_provider == "OpencodeZen" {
                    map_opencode_zen_model(&req.model)
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

                // Drop optional fields the client never set instead of sending null.
                Self::strip_null_fields(&mut stream_req);

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

        if attempts.is_empty() {
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
        } else {
            router.emit_event(RoutingEvent {
                id: Uuid::new_v4().to_string(),
                timestamp: now_secs(),
                provider: primary_provider.to_string(),
                latency_ms: start.elapsed().as_millis() as u64,
                tokens_used: 0,
                success: false,
                error_msg: Some(format!("All {} routing targets failed", attempts.len())),
            });

            (StatusCode::BAD_GATEWAY, Json(json!({
                "error": "All routing targets failed",
                "attempts": attempts,
            }))).into_response()
        }
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
