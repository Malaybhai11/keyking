use serde::{Deserialize, Serialize};

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
}

impl Vault {
    pub fn new() -> Self {
        Self { entries: vec![] }
    }
}
