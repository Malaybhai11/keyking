import crypto from "node:crypto";
import { VaultDecryptionError } from "./types.js";
import type { VaultEntry } from "./types.js";

const VAULT_PREFIX = "KK_VAULT_";
const SALT_LENGTH = 32;
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const PBKDF2_DIGEST = "sha256";
const CIPHER_ALGORITHM = "aes-256-gcm";

/**
 * Decrypts a KeyKing vault string using the provided password.
 *
 * Wire format: "KK_VAULT_" + base64(salt[32] + nonce[12] + ciphertext + authTag[16])
 *
 * @param vaultString - The encrypted vault string exported from the KeyKing desktop app.
 * @param password    - The password used during vault encryption.
 * @returns An array of decrypted VaultEntry objects.
 * @throws {VaultDecryptionError} If the vault string is malformed or decryption fails.
 */
export function decryptVault(vaultString: string, password: string): VaultEntry[] {
  // ── Validate prefix ─────────────────────────────────────────────────────
  if (!vaultString.startsWith(VAULT_PREFIX)) {
    throw new VaultDecryptionError(
      `Invalid vault string: must start with "${VAULT_PREFIX}"`
    );
  }

  // ── Base64 decode ───────────────────────────────────────────────────────
  const base64Payload = vaultString.slice(VAULT_PREFIX.length);
  let binaryData: Buffer;

  try {
    binaryData = Buffer.from(base64Payload, "base64");
  } catch {
    throw new VaultDecryptionError("Invalid vault string: base64 decoding failed");
  }

  // ── Validate minimum length ─────────────────────────────────────────────
  const minLength = SALT_LENGTH + NONCE_LENGTH + AUTH_TAG_LENGTH + 1; // at least 1 byte of ciphertext
  if (binaryData.length < minLength) {
    throw new VaultDecryptionError(
      `Invalid vault string: data too short (${binaryData.length} bytes, need at least ${minLength})`
    );
  }

  // ── Extract components ──────────────────────────────────────────────────
  const salt = binaryData.subarray(0, SALT_LENGTH);
  const nonce = binaryData.subarray(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
  const ciphertextWithTag = binaryData.subarray(SALT_LENGTH + NONCE_LENGTH);

  // Rust's aes-gcm appends the 16-byte auth tag to the ciphertext
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - AUTH_TAG_LENGTH);
  const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - AUTH_TAG_LENGTH);

  // ── Derive key with PBKDF2 ─────────────────────────────────────────────
  let key: Buffer;
  try {
    key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
  } catch (err) {
    throw new VaultDecryptionError(
      `Key derivation failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // ── Decrypt with AES-256-GCM ────────────────────────────────────────────
  let plaintext: string;
  try {
    const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, nonce, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    plaintext = decrypted.toString("utf-8");
  } catch (err) {
    throw new VaultDecryptionError(
      `Decryption failed — wrong password or corrupted vault. (${err instanceof Error ? err.message : String(err)})`
    );
  }

  // ── Parse JSON ──────────────────────────────────────────────────────────
  let entries: unknown;
  try {
    entries = JSON.parse(plaintext);
  } catch {
    throw new VaultDecryptionError(
      "Decrypted data is not valid JSON — vault may be corrupted"
    );
  }

  if (!Array.isArray(entries)) {
    throw new VaultDecryptionError(
      "Decrypted data is not a JSON array — unexpected vault format"
    );
  }

  // ── Validate entries ────────────────────────────────────────────────────
  const validated: VaultEntry[] = [];
  for (const entry of entries) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).provider !== "string" ||
      typeof (entry as Record<string, unknown>).key !== "string"
    ) {
      throw new VaultDecryptionError(
        `Invalid vault entry: expected {provider: string, key: string}, got ${JSON.stringify(entry)}`
      );
    }
    validated.push({
      provider: (entry as Record<string, unknown>).provider as string,
      key: (entry as Record<string, unknown>).key as string,
    });
  }

  return validated;
}
