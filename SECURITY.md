# Security Review Checklist

- [x] No plaintext keys in logs (grep -r "api_key" --include="*.log" returns empty)
- [x] get_plaintext_key is pub(crate) — not accessible from TypeScript
- [x] Masked key shows only first 4 + last 4 characters
- [x] Control plane stores only SHA-256 hashes, never plaintext
- [x] All external requests have 30s timeout
- [x] AES-256-GCM with 12-byte random nonce
- [x] PBKDF2-HMAC-SHA256 with 310,000 iterations
- [x] Zeroize called on plaintext after use
