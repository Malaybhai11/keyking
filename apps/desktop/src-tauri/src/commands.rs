use crate::vault::{Vault, StoredKeyEntry};
use tauri::Emitter;
use std::sync::Arc;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn add_key(provider: String, plaintext_key: String) -> Result<StoredKeyEntry, String> {
    // Phase 2: Will encrypt and store
    Err("Phase 2 not yet implemented".to_string())
}

#[tauri::command]
pub async fn remove_key(id: String) -> Result<(), String> {
    Err("Phase 2 not yet implemented".to_string())
}

#[tauri::command]
pub async fn list_keys() -> Vec<StoredKeyEntry> {
    vec![]
}

#[tauri::command]
pub async fn validate_key(id: String) -> Result<bool, String> {
    Err("Phase 2 not yet implemented".to_string())
}
