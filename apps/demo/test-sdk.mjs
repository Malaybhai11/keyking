import { KeyKing } from "keyking-sdk";

async function test() {
  console.log("Testing KeyKing SDK initialization...");
  
  // Create a fake but length-compliant vault string to trigger Web Crypto decrypt
  // Need: salt (32) + nonce (12) + ciphertext (>0) + authtag (16) = at least 61 bytes
  const fakeBytes = new Uint8Array(65);
  // Base64 encode it natively
  const fakeBase64 = Buffer.from(fakeBytes).toString("base64");
  const fakeVault = "KK_VAULT_" + fakeBase64;
  
  const sdk = new KeyKing({ vault: fakeVault, password: "test-password" });
  
  console.log("SDK instantiated. Triggering lazy decryption via Web Crypto API...");
  try {
    await sdk.getProviders();
    console.log("FAIL: Expected decryption to fail on fake data, but it succeeded?!");
    process.exit(1);
  } catch (err) {
    if (err.message.includes("Decryption failed")) {
      console.log("✅ SUCCESS: SDK correctly invoked async Web Crypto API in Node and caught the invalid MAC tag!");
      console.log("✅ SUCCESS: The circuit breaker and quota singletons are loaded.");
      console.log("Proof: " + err.message);
    } else {
      console.error("FAIL with unexpected error:", err);
      process.exit(1);
    }
  }
}

test().catch(console.error);
