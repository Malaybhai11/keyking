use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use once_cell::sync::Lazy;
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CircuitState {
    Closed,
    Open { until: Instant },
    HalfOpen,
}

pub struct CircuitBreaker {
    states: RwLock<HashMap<String, CircuitState>>,
    durations: RwLock<HashMap<String, Duration>>,
}

impl CircuitBreaker {
    pub fn new() -> Self {
        Self {
            states: RwLock::new(HashMap::new()),
            durations: RwLock::new(HashMap::new()),
        }
    }
    
    pub async fn trip(&self, key_id: &str, duration: Duration) {
        let mut states = self.states.write().await;
        let mut durations = self.durations.write().await;
        states.insert(key_id.to_string(), CircuitState::Open { until: Instant::now() + duration });
        durations.insert(key_id.to_string(), duration);
    }
    
    pub async fn is_available(&self, key_id: &str) -> bool {
        let states = self.states.read().await;
        match states.get(key_id) {
            None => true,
            Some(CircuitState::Closed) => true,
            Some(CircuitState::Open { until }) => {
                if Instant::now() >= *until {
                    drop(states);
                    let mut states = self.states.write().await;
                    states.insert(key_id.to_string(), CircuitState::HalfOpen);
                    true
                } else {
                    false
                }
            }
            Some(CircuitState::HalfOpen) => true,
        }
    }
    
    pub async fn record_success(&self, key_id: &str) {
        let mut states = self.states.write().await;
        if matches!(states.get(key_id), Some(CircuitState::HalfOpen)) {
            states.insert(key_id.to_string(), CircuitState::Closed);
        }
    }
    
    pub async fn record_failure(&self, key_id: &str) {
        let mut states = self.states.write().await;
        let mut durations = self.durations.write().await;
        
        if let Some(CircuitState::HalfOpen) | Some(CircuitState::Open { .. }) = states.get(key_id) {
            let new_duration = durations.get(key_id).copied().unwrap_or(Duration::from_secs(60)) * 2;
            durations.insert(key_id.to_string(), new_duration);
            states.insert(key_id.to_string(), CircuitState::Open { until: Instant::now() + new_duration });
        }
    }
}

pub struct QuotaMap {
    quotas: RwLock<HashMap<String, QuotaState>>,
}

#[derive(Debug, Clone)]
pub struct QuotaState {
    pub remaining_requests: Option<u32>,
    pub remaining_tokens: Option<u32>,
    pub reset_at: Option<u64>,
    pub last_updated: u64,
}

impl QuotaMap {
    pub fn new() -> Self {
        Self {
            quotas: RwLock::new(HashMap::new()),
        }
    }
    
    pub async fn update(&self, key_id: &str, state: QuotaState) {
        let mut quotas = self.quotas.write().await;
        quotas.insert(key_id.to_string(), state);
    }
    
    pub async fn get(&self, key_id: &str) -> Option<QuotaState> {
        let quotas = self.quotas.read().await;
        quotas.get(key_id).cloned()
    }
    
    pub async fn best_key(&self, candidates: &[String]) -> Option<String> {
        let quotas = self.quotas.read().await;
        let mut best: Option<(&str, u32)> = None;
        
        for key_id in candidates {
            if let Some(quota) = quotas.get(key_id) {
                if let Some(req) = quota.remaining_requests {
                    if req == 0 {
                        continue;
                    }
                }
                let tokens = quota.remaining_tokens.unwrap_or(u32::MAX);
                if best.is_none() || tokens > best.unwrap().1 {
                    best = Some((key_id, tokens));
                }
            } else {
                // Unknown quota = optimistically available
                if best.is_none() {
                    best = Some((key_id, u32::MAX));
                }
            }
        }
        
        best.map(|(k, _)| k.to_string())
    }
}
