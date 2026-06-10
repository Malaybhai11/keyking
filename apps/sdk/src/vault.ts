import { VaultDecryptionError } from "./types.js";
import type { VaultEntry } from "./types.js";

const VAULT_PREFIX = "KK_VAULT_";
const SALT_LENGTH = 32;
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;

/**
 * Decrypts a KeyKing vault string using the provided password.
 * Uses Web Crypto API for serverless/edge compatibility.
 */
export async function decryptVault(vaultString: string, password: string): Promise<VaultEntry[]> {
  if (!vaultString.startsWith(VAULT_PREFIX)) {
    throw new VaultDecryptionError(`Invalid vault string: must start with "${VAULT_PREFIX}"`);
  }

  const base64Payload = vaultString.slice(VAULT_PREFIX.length);
  let binaryData: Uint8Array;

  try {
    const binaryString = atob(base64Payload);
    binaryData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }
  } catch {
    throw new VaultDecryptionError("Invalid vault string: base64 decoding failed");
  }

  const minLength = SALT_LENGTH + NONCE_LENGTH + AUTH_TAG_LENGTH + 1;
  if (binaryData.length < minLength) {
    throw new VaultDecryptionError(`Invalid vault string: data too short (${binaryData.length} bytes, need at least ${minLength})`);
  }

  const salt = binaryData.subarray(0, SALT_LENGTH);
  const nonce = binaryData.subarray(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
  const ciphertextWithTag = binaryData.subarray(SALT_LENGTH + NONCE_LENGTH);

  let key: CryptoKey;
  try {
    const enc = new TextEncoder();
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    key = await globalThis.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as any,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: KEY_LENGTH * 8 },
      false,
      ["decrypt"]
    );
  } catch (err) {
    throw new VaultDecryptionError(`Key derivation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  let plaintext: string;
  try {
    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: nonce as any,
        tagLength: AUTH_TAG_LENGTH * 8, // in bits
      },
      key,
      ciphertextWithTag as any
    );

    plaintext = new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    throw new VaultDecryptionError(`Decryption failed — wrong password or corrupted vault. (${err instanceof Error ? err.message : String(err)})`);
  }

  let entries: unknown;
  try {
    entries = JSON.parse(plaintext);
  } catch {
    throw new VaultDecryptionError("Decrypted data is not valid JSON — vault may be corrupted");
  }

  if (!Array.isArray(entries)) {
    throw new VaultDecryptionError("Decrypted data is not a JSON array — unexpected vault format");
  }

  const validated: VaultEntry[] = [];
  for (const entry of entries) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).provider !== "string" ||
      typeof (entry as Record<string, unknown>).key !== "string"
    ) {
      throw new VaultDecryptionError(`Invalid vault entry: expected {provider: string, key: string}, got ${JSON.stringify(entry)}`);
    }
    validated.push({
      provider: (entry as Record<string, unknown>).provider as string,
      key: (entry as Record<string, unknown>).key as string,
    });
  }

  return validated;
}
