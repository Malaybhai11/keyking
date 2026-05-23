pub mod crypto;

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredKeyEntry {
    pub id: String,
    pub provider: String,
    pub encrypted_key: String,
    pub masked_key: String,
    pub added_at: u64,
    pub is_valid: bool,
}

pub struct Vault {
    entries: Vec<StoredKeyEntry>,
    data_dir: PathBuf,
}

impl Vault {
    pub fn new(data_dir: PathBuf) -> Self {
        let vault_path = data_dir.join("vault.json");
        let entries = if vault_path.exists() {
            let data = fs::read_to_string(&vault_path).unwrap_or_default();
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            vec![]
        };
        
        Self { entries, data_dir }
    }
    
    pub fn add_key(&mut self, provider: &str, plaintext: &str) -> Result<StoredKeyEntry, super::crypto::VaultError> {
        let encrypted = crypto::encrypt_key(plaintext)?;
        
        let masked = if plaintext.len() > 8 {
            format!("{}{}{}", &plaintext[..4], "...", &plaintext[plaintext.len()-4..])
        } else {
            "****".to_string()
        };
        
        let entry = StoredKeyEntry {
            id: Uuid::new_v4().to_string(),
            provider: provider.to_string(),
            encrypted_key: encrypted,
            masked_key: masked,
            added_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
            is_valid: true,
        };
        
        self.entries.push(entry.clone());
        self.save();
        Ok(entry)
    }
    
    pub fn remove_key(&mut self, id: &str) {
        self.entries.retain(|e| e.id != id);
        self.save();
    }
    
    pub fn list_keys(&self) -> Vec<StoredKeyEntry> {
        self.entries.clone()
    }
    
    pub(crate) fn get_plaintext_key(&self, id: &str) -> Option<Result<String, super::crypto::VaultError>> {
        let entry = self.entries.iter().find(|e| e.id == id)?;
        Some(crypto::decrypt_key(&entry.encrypted_key))
    }
    
    fn save(&self) {
        let vault_path = self.data_dir.join("vault.json");
        if let Some(parent) = vault_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(&self.entries) {
            let _ = fs::write(&vault_path, json);
        }
    }
}
