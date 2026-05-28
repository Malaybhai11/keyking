use crate::vault::{Vault, StoredKeyEntry};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct VaultState {
    pub vault: Mutex<Vault>,
}

impl VaultState {
    pub fn new(vault: Vault) -> Self {
        Self { vault: Mutex::new(vault) }
    }
}

pub struct SystemKey(pub Arc<String>);

type SharedVault = Arc<VaultState>;

async fn check_key(provider: &str, key: &str) -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    match provider {
        "OpenAI" => {
            let resp = client.get("https://api.openai.com/v1/models")
                .header("Authorization", format!("Bearer {}", key))
                .send().await.map_err(|e| e.to_string())?;
            Ok(resp.status().is_success())
        }
        "Groq" => {
            let resp = client.get("https://api.groq.com/openai/v1/models")
                .header("Authorization", format!("Bearer {}", key))
                .send().await.map_err(|e| e.to_string())?;
            Ok(resp.status().is_success())
        }
        _ => Ok(true)
    }
}

#[tauri::command]
pub async fn get_api_key(
    state: tauri::State<'_, SystemKey>,
) -> Result<String, String> {
    Ok(state.0.to_string())
}

#[tauri::command]
pub async fn add_key(
    state: tauri::State<'_, SharedVault>,
    provider: String,
    plaintext_key: String,
) -> Result<StoredKeyEntry, String> {
    let mut vault = state.vault.lock().await;
    let mut entry = vault.add_key(&provider, &plaintext_key).map_err(|e| e.to_string())?;
    drop(vault);

    let is_valid = check_key(&provider, &plaintext_key).await.unwrap_or(false);

    let mut vault = state.vault.lock().await;
    vault.set_key_validity(&entry.id, is_valid);
    entry.is_valid = is_valid;
    Ok(entry)
}

#[tauri::command]
pub async fn remove_key(
    state: tauri::State<'_, SharedVault>,
    id: String,
) -> Result<(), String> {
    let mut vault = state.vault.lock().await;
    vault.remove_key(&id);
    Ok(())
}

#[tauri::command]
pub async fn list_keys(
    state: tauri::State<'_, SharedVault>,
) -> Result<Vec<StoredKeyEntry>, String> {
    let vault = state.vault.lock().await;
    Ok(vault.list_keys())
}

#[tauri::command]
pub async fn validate_key(
    state: tauri::State<'_, SharedVault>,
    id: String,
) -> Result<bool, String> {
    let vault = state.vault.lock().await;
    let plaintext = vault.get_plaintext_key(&id)
        .ok_or_else(|| "Key not found".to_string())?
        .map_err(|e| e.to_string())?;
    let provider = vault.list_keys().into_iter()
        .find(|k| k.id == id)
        .map(|k| k.provider)
        .ok_or_else(|| "Key not found".to_string())?;
    drop(vault);

    let is_valid = check_key(&provider, &plaintext).await?;

    let mut vault = state.vault.lock().await;
    vault.set_key_validity(&id, is_valid);
    Ok(is_valid)
}

#[tauri::command]
pub async fn list_routing_events(
    state: tauri::State<'_, SharedVault>,
) -> Result<Vec<crate::proxy::RoutingEvent>, String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("routing_log.json");
    if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let logs: Vec<crate::proxy::RoutingEvent> = serde_json::from_str(&content).unwrap_or_default();
        Ok(logs)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn clear_routing_events(
    state: tauri::State<'_, SharedVault>,
) -> Result<(), String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("routing_log.json");
    if path.exists() {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}
