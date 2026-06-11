use crate::vault::{Vault, StoredKeyEntry};
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingRule {
    pub provider: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub session_id: String,
    pub user_id: String,
}

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
        "Nvidia" => {
            let resp = client.get("https://integrate.api.nvidia.com/v1/models")
                .header("Authorization", format!("Bearer {}", key))
                .send().await.map_err(|e| e.to_string())?;
            Ok(resp.status().is_success())
        }
        "OpencodeZen" => {
            let resp = client.get("https://opencode.ai/zen/v1/models")
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
pub async fn get_routing_rules(state: tauri::State<'_, SharedVault>) -> Result<Vec<RoutingRule>, String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("routing_rules.json");
    if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let rules: Vec<RoutingRule> = serde_json::from_str(&content).unwrap_or_default();
        Ok(rules)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn save_routing_rules(state: tauri::State<'_, SharedVault>, rules: Vec<RoutingRule>) -> Result<(), String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("routing_rules.json");
    let content = serde_json::to_string_pretty(&rules).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct ModelInfo {
    id: String,
    provider: String,
}

#[derive(serde::Deserialize)]
struct OpenAiModel {
    id: String,
}

#[derive(serde::Deserialize)]
struct OpenAiModelsResponse {
    data: Vec<OpenAiModel>,
}

#[tauri::command]
pub async fn get_available_models(state: tauri::State<'_, SharedVault>) -> Result<Vec<ModelInfo>, String> {
    let mut vault = state.vault.lock().await;
    let keys = vault.list_keys();
    let mut provider_keys: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    
    for k in &keys {
        if let Some(Ok(pk)) = vault.get_decrypted_key(&k.provider) {
            provider_keys.insert(k.provider.clone(), pk);
        }
    }
    // Drop the lock before making HTTP requests!
    drop(vault);
    
    let mut all_models = Vec::new();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let mut futures = Vec::new();

    for (provider, key) in provider_keys {
        if provider == "Anthropic" {
            all_models.push(ModelInfo { id: "claude-3-5-sonnet-latest".into(), provider: "Anthropic".into() });
            all_models.push(ModelInfo { id: "claude-3-5-haiku-latest".into(), provider: "Anthropic".into() });
            all_models.push(ModelInfo { id: "claude-3-opus-latest".into(), provider: "Anthropic".into() });
            continue;
        }

        if provider == "Cerebras" {
            all_models.push(ModelInfo { id: "llama3.1-8b".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "llama-3.3-70b".into(), provider: provider.clone() });
            continue;
        }

        if provider == "Sambanova" {
            all_models.push(ModelInfo { id: "Meta-Llama-3.1-8B-Instruct".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "Meta-Llama-3.1-70B-Instruct".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "Meta-Llama-3.3-70B-Instruct".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "Qwen2.5-72B-Instruct".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "DeepSeek-R1-Distill-Llama-70B".into(), provider: provider.clone() });
            continue;
        }

        if provider == "Cloudflare" {
            all_models.push(ModelInfo { id: "@cf/meta/llama-3.1-8b-instruct".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "@cf/qwen/qwen1.5-14b-chat-awq".into(), provider: provider.clone() });
            continue;
        }

        if provider == "Github" {
            all_models.push(ModelInfo { id: "gpt-4o".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "gpt-4o-mini".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "Phi-3.5-mini-instruct".into(), provider: provider.clone() });
            all_models.push(ModelInfo { id: "Llama-3.3-70B-Instruct".into(), provider: provider.clone() });
            continue;
        }

        let url = match provider.as_str() {
            "OpenAI" => Some("https://api.openai.com/v1/models"),
            "Groq" => Some("https://api.groq.com/openai/v1/models"),
            "OpenRouter" => Some("https://openrouter.ai/api/v1/models"),
            "Gemini" => Some("https://generativelanguage.googleapis.com/v1beta/openai/models"),
            "Mistral" => Some("https://api.mistral.ai/v1/models"),
            "xAI" => Some("https://api.x.ai/v1/models"),
            "DeepSeek" => Some("https://api.deepseek.com/models"),
            "Nvidia" => Some("https://integrate.api.nvidia.com/v1/models"),
            "OpencodeZen" => Some("https://opencode.ai/zen/v1/models"),
            _ => None,
        };

        if let Some(u) = url {
            let client_clone = client.clone();
            let p_clone = provider.clone();
            let k_clone = key.clone();
            let fut = async move {
                let mut req = client_clone.get(u).header("Authorization", format!("Bearer {}", k_clone));
                if p_clone == "OpenRouter" {
                    req = req.header("HTTP-Referer", "https://keyking.ledgion.in")
                             .header("X-Title", "KeyKing");
                }
                let mut results = Vec::new();
                if let Ok(resp) = req.send().await {
                    if resp.status().is_success() {
                        if let Ok(data) = resp.json::<OpenAiModelsResponse>().await {
                            for m in data.data {
                                results.push(ModelInfo {
                                    id: m.id,
                                    provider: p_clone.clone(),
                                });
                            }
                        }
                    }
                }
                results
            };
            futures.push(fut);
        }
    }
    
    let results = futures::future::join_all(futures).await;
    for mut res in results {
        all_models.append(&mut res);
    }
    
    all_models.sort_by(|a, b| a.id.cmp(&b.id));
    all_models.dedup_by(|a, b| a.id == b.id && a.provider == b.provider);

    Ok(all_models)
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

#[tauri::command]
pub fn open_browser(url: String) {
    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd").args(["/C", "start", &url]).spawn().ok();

    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&url).spawn().ok();

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&url).spawn().ok();
}

#[tauri::command]
pub async fn save_session(state: tauri::State<'_, SharedVault>, session: AuthSession) -> Result<(), String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("auth_session.json");
    let content = serde_json::to_string(&session).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_session(state: tauri::State<'_, SharedVault>) -> Result<Option<AuthSession>, String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("auth_session.json");
    if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let session: AuthSession = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(Some(session))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn clear_session(state: tauri::State<'_, SharedVault>) -> Result<(), String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("auth_session.json");
    if path.exists() {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}

#[tauri::command]
pub async fn update_lease(state: tauri::State<'_, SharedVault>) -> Result<(), String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("offline_lease.json");
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    let content = serde_json::json!({ "last_verified_online": now });
    std::fs::write(&path, content.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn check_lease(state: tauri::State<'_, SharedVault>) -> Result<bool, String> {
    let vault = state.vault.lock().await;
    let path = vault.data_dir.join("offline_lease.json");
    if path.exists() {
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(last) = json.get("last_verified_online").and_then(|v| v.as_u64()) {
                let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
                // 7 days = 7 * 24 * 60 * 60 = 604800 seconds
                return Ok(now - last <= 604800);
            }
        }
        // Lease file exists but is corrupt — allow through
        return Ok(true);
    }
    // No lease file = fresh install, never been online-verified yet.
    // Allow through so the user can sign in for the first time.
    Ok(true)
}
