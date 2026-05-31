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

#[tauri::command]
pub async fn export_vault(
    state: tauri::State<'_, SharedVault>,
    passphrase: String,
) -> Result<String, String> {
    use aes_gcm::aead::{Aead, KeyInit, OsRng};
    use aes_gcm::aead::rand_core::RngCore;
    use aes_gcm::{Aes256Gcm, Key, Nonce};
    use base64::Engine;
    use pbkdf2::pbkdf2_hmac;
    use sha2::Sha256;

    let vault = state.vault.lock().await;
    let entries = vault.list_keys();

    // Build the JSON array of {provider, key} objects
    let mut key_objects: Vec<serde_json::Value> = Vec::new();
    for entry in &entries {
        let plaintext = vault
            .get_plaintext_key(&entry.id)
            .ok_or_else(|| format!("Key {} not found", entry.id))?
            .map_err(|e| e.to_string())?;
        key_objects.push(serde_json::json!({
            "provider": entry.provider,
            "key": plaintext
        }));
    }
    drop(vault);

    let json_payload = serde_json::to_string(&key_objects)
        .map_err(|e| e.to_string())?;

    // Generate 32-byte random salt
    let mut salt = [0u8; 32];
    OsRng.fill_bytes(&mut salt);

    // Derive 32-byte key from passphrase using PBKDF2-HMAC-SHA256
    let mut derived_key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(passphrase.as_bytes(), &salt, 100_000, &mut derived_key);

    // Generate 12-byte random nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);

    // Encrypt with AES-256-GCM
    let key = Key::<Aes256Gcm>::from_slice(&derived_key);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, json_payload.as_bytes())
        .map_err(|_| "Encryption failed".to_string())?;

    // Wire format: salt[32] + nonce[12] + ciphertext_with_tag
    let mut wire = Vec::with_capacity(32 + 12 + ciphertext.len());
    wire.extend_from_slice(&salt);
    wire.extend_from_slice(&nonce_bytes);
    wire.extend_from_slice(&ciphertext);

    let b64 = base64::engine::general_purpose::STANDARD.encode(&wire);
    Ok(format!("KK_VAULT_{}", b64))
}
