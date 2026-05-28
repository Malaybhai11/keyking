use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::aead::rand_core::RngCore;
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::Engine;
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use once_cell::sync::Lazy;

const SALT: &[u8] = b"keyking-v1-vault-salt-2025";
const ITERATIONS: u32 = 310_000;

fn get_machine_uid() -> Result<String, VaultError> {
    machine_uid::get().map_err(|e| VaultError::MachineIdError(e.to_string()))
}

fn derive_key() -> Result<[u8; 32], VaultError> {
    let uid = get_machine_uid()?;
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(uid.as_bytes(), SALT, ITERATIONS, &mut key);
    Ok(key)
}

static MACHINE_KEY: Lazy<[u8; 32]> = Lazy::new(|| {
    derive_key().expect("Failed to derive machine key")
});

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("Encryption failed")]
    EncryptionError,
    #[error("Decryption failed — key may belong to another machine")]
    MacMismatch,
    #[error("Invalid API key")]
    InvalidKey,
    #[error("Machine ID error: {0}")]
    MachineIdError(String),
    #[error("IO error: {0}")]
    IoError(String),
}

pub fn warmup() {
    Lazy::force(&MACHINE_KEY);
}

pub fn encrypt_key(plaintext: &str) -> Result<String, VaultError> {
    let key = Key::<Aes256Gcm>::from_slice(&*MACHINE_KEY);
    let cipher = Aes256Gcm::new(key);
    
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())
        .map_err(|_| VaultError::EncryptionError)?;
    
    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&ciphertext);
    
    Ok(base64::engine::general_purpose::STANDARD.encode(&result))
}

pub fn decrypt_key(ciphertext_b64: &str) -> Result<String, VaultError> {
    let ciphertext = base64::engine::general_purpose::STANDARD.decode(ciphertext_b64)
        .map_err(|_| VaultError::EncryptionError)?;
    
    if ciphertext.len() < 12 {
        return Err(VaultError::MacMismatch);
    }
    
    let nonce = Nonce::from_slice(&ciphertext[..12]);
    let encrypted_data = &ciphertext[12..];
    
    let key = Key::<Aes256Gcm>::from_slice(&*MACHINE_KEY);
    let cipher = Aes256Gcm::new(key);
    
    let plaintext = cipher.decrypt(nonce, encrypted_data)
        .map_err(|_| VaultError::MacMismatch)?;
    
    String::from_utf8(plaintext)
        .map_err(|_| VaultError::MacMismatch)
}
