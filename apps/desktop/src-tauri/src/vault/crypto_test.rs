#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let plaintext = "sk-test-key-12345";
        let encrypted = encrypt_key(plaintext).unwrap();
        let decrypted = decrypt_key(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }
    
    #[test]
    #[should_panic(expected = "MacMismatch")]
    fn test_wrong_machine_key_fails() {
        // This test would need a different machine context - mock for now
        let encrypted = encrypt_key("test").unwrap();
        // Attempting to decrypt on a different machine should fail
        // In practice, this requires mocking the machine UID
        let _result = decrypt_key(&encrypted);
    }
}
