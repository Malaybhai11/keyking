# 🔐 keyking-sdk

**Zero-Trust Serverless SDK for KeyKing** — Route LLM API calls with automatic failover, no proxy needed.

Use your encrypted KeyKing vault directly in serverless environments like Vercel, AWS Lambda, and Cloudflare Workers. No sidecar, no proxy server, no plaintext keys in your codebase.

---

## Features

- 🔒 **Zero-trust encryption** — Your API keys are AES-256-GCM encrypted. Decrypted only in memory at runtime.
- 🔄 **Smart fallback routing** — Automatic failover on 429 (rate limit) or 5xx errors.
- 🤖 **Multi-provider support** — OpenAI, Groq, Anthropic, Gemini, Mistral, xAI, DeepSeek, OpenRouter, Cohere.
- 📦 **Zero runtime dependencies** — Only uses Node.js built-in `crypto` and native `fetch`.
- ⚡ **OpenAI-compatible API** — Drop-in replacement interface: `keyking.chat.completions.create()`.
- 🦥 **Lazy decryption** — Vault is decrypted on first API call, not at import time.

---

## Quick Start

### 1. Install

```bash
npm install keyking-sdk
```

### 2. Export your vault from the KeyKing desktop app

In the KeyKing desktop app, go to **Settings → Export Vault** to get your encrypted vault string. It looks like:

```
KK_VAULT_eyJhbGciOiJIUzI1NiIs...
```

### 3. Set environment variables

```bash
# .env (or your hosting provider's secrets manager)
KEYKING_VAULT="KK_VAULT_eyJhbGciOiJIUzI1NiIs..."
KEYKING_PASSWORD="your-vault-password"
```

### 4. Use it

```typescript
import { KeyKing } from "keyking-sdk";

const keyking = new KeyKing();
// Reads KEYKING_VAULT and KEYKING_PASSWORD from environment

const response = await keyking.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Explain quantum computing in one sentence." }],
});

console.log(response.choices[0].message.content);
```

---

## How It Works

```
┌──────────────────┐
│  Your App Code   │
│                  │
│  keyking.chat.   │
│  completions.    │
│  create(...)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│   KeyKing SDK    │     │  Encrypted Vault  │
│                  │◄────│  (env variable)   │
│  1. Decrypt vault│     └──────────────────┘
│  2. Route model  │
│  3. Try primary  │
│  4. Fallback     │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ OpenAI │ │  Groq  │  (fallback)
└────────┘ └────────┘
```

1. **Decrypt** — On first call, the SDK decrypts your vault using PBKDF2 + AES-256-GCM (same algorithm as the Rust desktop app).
2. **Route** — The model name determines which provider to use (e.g., `gpt-4o` → OpenAI, `claude-3-opus` → Anthropic).
3. **Fallback** — If the primary provider returns 429 or 5xx, the SDK automatically tries the next available provider with an equivalent model.

---

## API Reference

### `new KeyKing(config?)`

| Option       | Type      | Default                      | Description                          |
|-------------|-----------|------------------------------|--------------------------------------|
| `vault`        | `string`        | `process.env.KEYKING_VAULT`  | Encrypted vault string               |
| `password`     | `string`        | `process.env.KEYKING_PASSWORD` | Vault decryption password          |
| `timeout`      | `number`        | `60000`                      | Request timeout in ms                |
| `maxRetries`   | `number`        | `3`                          | Max fallback attempts                |
| `routingRules` | `RoutingRule[]` | `undefined`                  | Array of `{ provider, model }` pairs for strict, ordered fallback routing. If provided, disables default auto-mapping fallback behavior. |
| `debug`        | `boolean`       | `false`                      | Log routing decisions to stderr      |

### Example: Strict Priority Routing (The Moat)

```typescript
const keyking = new KeyKing({
  routingRules: [
    { provider: "Groq",      model: "llama-3.3-70b-versatile" },
    { provider: "Anthropic", model: "claude-3-5-sonnet-20241022" },
    { provider: "OpenAI",    model: "gpt-4o" }
  ]
});
```

### `keyking.chat.completions.create(request)`

Accepts the same parameters as [OpenAI's Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create):

```typescript
interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string | string[];
  tools?: Tool[];
  tool_choice?: "none" | "auto" | "required";
  response_format?: { type: "text" | "json_object" };
  // ... and more
}
```

Returns a `ChatCompletionResponse` with an extra `_keyking_provider` field indicating which provider served the request.

### Utility Methods

```typescript
// Get available providers from vault
keyking.providers; // ["OpenAI", "Groq", "Anthropic"]

// Check if a provider is available
keyking.hasProvider("OpenAI"); // true

// Resolve which provider handles a model
keyking.resolveModel("gpt-4o"); // "OpenAI"
keyking.resolveModel("claude-3-opus"); // "Anthropic"
```

### Standalone Utilities

```typescript
import { decryptVault, resolveProvider } from "keyking-sdk";

// Decrypt vault manually
const entries = decryptVault(vaultString, password);
// [{ provider: "OpenAI", key: "sk-..." }, ...]

// Resolve model → provider
resolveProvider("gpt-4o"); // "OpenAI"
```

---

## Supported Providers & Models

| Provider    | Model Prefixes                    | Endpoint                          |
|------------|----------------------------------|-----------------------------------|
| OpenAI     | `gpt-*`, `o1*`, `o3*`, `davinci*` | `api.openai.com`                 |
| Groq       | `llama*`, `groq*`, `mixtral*`, `gemma*` | `api.groq.com`              |
| Anthropic  | `claude*`                         | `api.anthropic.com`               |
| Gemini     | `gemini*`                         | `generativelanguage.googleapis.com` |
| Mistral    | `mistral*`, `codestral*`          | `api.mistral.ai`                  |
| xAI        | `grok*`                           | `api.x.ai`                        |
| DeepSeek   | `deepseek*`                       | `api.deepseek.com`                |
| OpenRouter | *(fallback only)*                 | `openrouter.ai`                   |
| Cohere     | `command*`, `cohere*`             | `api.cohere.ai`                   |

---

## Fallback Behavior

When the primary provider fails with a retryable error (HTTP 429 or 5xx):

- **OpenAI → Groq**: Model is automatically mapped (e.g., `gpt-4o` → `llama-3.3-70b-versatile`)
- **Any → OpenRouter**: The original model name is forwarded to OpenRouter
- **Non-retryable errors** (400, 401, 403): Thrown immediately, no fallback

---

## Error Handling

```typescript
import { KeyKing, KeyKingError, AllProvidersFailedError } from "keyking-sdk";

try {
  const response = await keyking.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello" }],
  });
} catch (err) {
  if (err instanceof AllProvidersFailedError) {
    console.error("All providers failed:", err.errors);
  } else if (err instanceof KeyKingError) {
    console.error(`KeyKing error [${err.code}]:`, err.message);
  }
}
```

---

## Framework Examples

### Next.js API Route

```typescript
// app/api/chat/route.ts
import { KeyKing } from "keyking-sdk";

const keyking = new KeyKing(); // reads from env

export async function POST(req: Request) {
  const { message } = await req.json();

  const response = await keyking.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: message }],
  });

  return Response.json({
    reply: response.choices[0].message.content,
    provider: response._keyking_provider,
  });
}
```

### Vercel AI SDK

```typescript
import { KeyKing } from "keyking-sdk";

const keyking = new KeyKing();

// Use in any serverless function
export default async function handler(req, res) {
  const completion = await keyking.chat.completions.create({
    model: "claude-3-opus-20240229",
    messages: req.body.messages,
    max_tokens: 1024,
  });

  res.json(completion);
}
```

---

## Security

- **No plaintext keys** — API keys are encrypted with AES-256-GCM and never stored in plaintext.
- **Memory-only decryption** — Keys exist in memory only during the function execution.
- **No network exposure** — The SDK calls providers directly; no intermediate proxy to compromise.
- **PBKDF2 key derivation** — 100,000 iterations with SHA-256 makes brute-force impractical.

---

## Requirements

- Node.js ≥ 18.0.0 (for native `fetch` and `crypto` support)
- A KeyKing vault exported from the [KeyKing desktop app](https://github.com/Malaybhai11/keyking)

---

## License

MIT © [Malaybhai11](https://github.com/Malaybhai11)
