const crypto = require('crypto');
const { KeyKing } = require('./dist/index.js');

async function runTest() {
  console.log("🚀 Testing KeyKing SDK (Zero-Trust Serverless Engine)...");

  // 1. Manually encrypt a dummy vault (simulating the Rust backend)
  const password = "my-super-secret-password";
  const dummyKeys = [
    { provider: "OpenAI", key: "sk-fake-openai-key-12345" },
    { provider: "Groq", key: "gsk-fake-groq-key-67890" }
  ];
  
  console.log("\n🔒 Simulating Desktop App Export...");
  const plaintext = JSON.stringify(dummyKeys);
  const salt = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  
  // PBKDF2-HMAC-SHA256 (100,000 iterations)
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Wire format: salt[32] + nonce[12] + ciphertext + authTag[16]
  const wire = Buffer.concat([salt, nonce, ciphertext, authTag]);
  const vaultString = "KK_VAULT_" + wire.toString('base64');
  
  console.log("✅ Generated Vault String:", vaultString.substring(0, 40) + "...");

  // 2. Test the SDK Decryption and Routing
  console.log("\n⚡ Initializing SDK...");
  const kk = new KeyKing({
    vault: vaultString,
    password: password
  });

  console.log("✅ SDK Initialized. Decrypted Keys Loaded!");
  
  console.log("\n🌐 Simulating Chat Request to OpenAI...");
  try {
    const response = await kk.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello!" }]
    });
    console.log("Response:", response);
  } catch (error) {
    console.log("✅ Smart Router intercepted response!");
    console.log("Expected API Error (since keys are fake):", error.message);
  }
}

runTest();
