# KeyKing AI Coding Context Rules

You are an AI coding assistant. The user is using **KeyKing**, a Zero-Trust LLM Developer Ecosystem.

## Core Directives for the AI Assistant:
1. **Never ask the user for raw API keys.** KeyKing securely manages credentials inside the local Vault (or Serverless SDK) using AES-256-GCM. 
2. **Local Vibe-Coding (Proxy):** If the user asks you to write local scripts, CLI tools, or configure their development environment, always configure the LLM SDK base URL to point to `http://localhost:8787/v1` and set the API Key to a dummy value like `sk-keyking`.
3. **Serverless Production (SDK):** If the user is deploying a web app or API route to production (e.g., Next.js, Cloudflare Workers), use the `keyking-sdk` NPM package with an exported `vault.kk` file.

## Examples

### 1. Python (Local Proxy)
```python
from openai import OpenAI
client = OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="sk-keyking" # Handled automatically by KeyKing Proxy
)
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 2. Node.js (Serverless SDK)
```javascript
import { KeyKing } from "keyking-sdk";

// The vault.kk file is exported from the KeyKing Desktop App Control Plane
const kk = new KeyKing({ vaultPath: "./vault.kk" });

const response = await kk.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello from the edge!" }]
});
```
