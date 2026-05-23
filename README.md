# Key King

Zero-trust AI API aggregator with machine-fingerprint key vault, quota-aware routing, and drop-in OpenAI-compatible local proxy.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Tauri Agent │────▶│ Local Proxy │────▶│ AI Providers│
│  (Desktop)  │◄────│  (Axum)     │◄────│ (9+ APIs)   │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │                   ▼
       │          ┌──────────────┐
       │          │Key Vault     │
       │          │(AES-256-GCM) │
       │          └──────┬───────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Control Plane│  │ Quota Router │
│ (FastAPI)    │  │ (In-memory)  │
└──────────────┘  └──────────────┘
```

## How It Works

1. **Zero-trust vault**: API keys encrypt with AES-256-GCM using a key derived from your machine's hardware fingerprint.
2. **Drop-in proxy**: Point any OpenAI client at `http://localhost:8787/v1` — no code changes needed.
3. **Smart routing**: Automatically routes between providers based on real-time quota, with circuit breaker fallback.
4. **Aggregate analytics**: Track usage across all providers in a unified dashboard.
5. **Control plane**: Machine registration, anomaly detection, and tier management via Supabase-backed API.

## Supported Providers

| Provider | Models | Free Tier |
|----------|--------|-----------|
| OpenAI | gpt-4o, gpt-3.5-turbo | 3 req/min |
| Groq | llama-3.3-70b, llama-3.1-8b | 20 req/min |
| Gemini | gemini-2.0-flash, gemini-1.5-flash | 60 req/min |
| Mistral | mistral-large, mistral-small | 2 req/sec |
| Anthropic | claude-sonnet-4 | 5 req/min |
| xAI | grok-4 | 10 req/min |
| DeepSeek | deepseek-chat | 1 req/sec |
| OpenRouter | openai/gpt-4o | 20 req/day |
| Cohere | command-r-plus | 10 req/min |

## Quick Start

```bash
# Clone
git clone https://github.com/Malaybhai11/keyking.git
cd keyking

# Install dependencies
npm install
cargo build --release
pip install -r apps/control-plane/requirements.txt

# Start proxy & desktop
npm run tauri dev
```

## Security Model

Keys never leave your device. Encryption uses AES-256-GCM with a key derived from your machine's hardware fingerprint via PBKDF2-HMAC-SHA256 (310,000 iterations). The control plane only sees SHA-256 hashes for counting — never plaintext keys.

## Free vs Ultra

| Feature | Free | Ultra ($2/mo) |
|---------|------|-----------------|
| Keys | 2 | Unlimited |
| Machines | 2 | Unlimited |
| Rate limit | 30 req/min | Unlimited |
| Routing | Basic | Smart + priority |

## License

MIT
