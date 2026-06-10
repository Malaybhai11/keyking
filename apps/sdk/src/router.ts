import type {
  Provider,
  ProviderConfig,
  VaultEntry,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  AnthropicRequest,
  AnthropicResponse,
  AnthropicMessage,
} from "./types.js";

import {
  ProviderError,
  NoProviderError,
  AllProvidersFailedError,
} from "./types.js";

import { globalCircuitBreaker, globalQuotaMap, extractQuotaHeaders } from "./quota.js";

// ─── Provider Endpoints ──────────────────────────────────────────────────────

const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  OpenAI: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    openaiCompatible: true,
  },
  Groq: {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    openaiCompatible: true,
  },
  Anthropic: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    openaiCompatible: false,
  },
  Gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    openaiCompatible: true,
  },
  Mistral: {
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    openaiCompatible: true,
  },
  xAI: {
    baseUrl: "https://api.x.ai/v1/chat/completions",
    openaiCompatible: true,
  },
  DeepSeek: {
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    openaiCompatible: true,
  },
  OpenRouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    openaiCompatible: true,
  },
  Cohere: {
    baseUrl: "https://api.cohere.ai/v1/chat/completions",
    openaiCompatible: true,
  },
  Cerebras: {
    baseUrl: "https://api.cerebras.ai/v1/chat/completions",
    openaiCompatible: true,
  },
  Sambanova: {
    baseUrl: "https://api.sambanova.ai/v1/chat/completions",
    openaiCompatible: true,
  },
  Cloudflare: {
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/default/ai/v1/chat/completions",
    openaiCompatible: true,
  },
  Github: {
    baseUrl: "https://models.inference.ai.azure.com/chat/completions",
    openaiCompatible: true,
  },
};

// ─── Model → Provider Mapping ────────────────────────────────────────────────

const MODEL_PREFIX_MAP: [string, Provider][] = [
  ["gpt-", "OpenAI"],
  ["o1", "OpenAI"],
  ["o3", "OpenAI"],
  ["davinci", "OpenAI"],
  ["llama", "Groq"],
  ["groq", "Groq"],
  ["mixtral", "Groq"],
  ["gemma", "Groq"],
  ["gemini", "Gemini"],
  ["claude", "Anthropic"],
  ["mistral", "Mistral"],
  ["codestral", "Mistral"],
  ["grok", "xAI"],
  ["deepseek", "DeepSeek"],
  ["command", "Cohere"],
  ["cohere", "Cohere"],
];

export function resolveProvider(model: string): Provider | null {
  const lowerModel = model.toLowerCase();
  for (const [prefix, provider] of MODEL_PREFIX_MAP) {
    if (lowerModel.startsWith(prefix)) return provider;
  }
  return null;
}

// ─── Model Mapping (OpenAI → Groq/Anthropic equivalents) ─────────────────────────

const GROQ_MODEL_MAP: Record<string, string> = {
  "gpt-4o": "llama-3.3-70b-versatile",
  "gpt-4": "llama-3.3-70b-versatile",
  "gpt-4-turbo": "llama-3.3-70b-versatile",
  "gpt-3.5-turbo": "llama-3.1-8b-instant",
};

function mapToGroqModel(model: string): string | null {
  const lowerModel = model.toLowerCase();
  if (GROQ_MODEL_MAP[lowerModel]) return GROQ_MODEL_MAP[lowerModel];
  if (lowerModel.startsWith("gpt-4o")) return "llama-3.3-70b-versatile";
  if (lowerModel.startsWith("gpt-4")) return "llama-3.3-70b-versatile";
  if (lowerModel.startsWith("gpt-3.5")) return "llama-3.1-8b-instant";
  return null;
}

const ANTHROPIC_MODEL_MAP: Record<string, string> = {
  "gpt-4o": "claude-3-5-sonnet-20241022",
  "gpt-4": "claude-3-5-sonnet-20241022",
  "claude-sonnet-4": "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
};

function mapToAnthropicModel(model: string): string | null {
  const lowerModel = model.toLowerCase();
  if (ANTHROPIC_MODEL_MAP[lowerModel]) return ANTHROPIC_MODEL_MAP[lowerModel];
  if (lowerModel.startsWith("gpt-4")) return "claude-3-5-sonnet-20241022";
  return null;
}

// ─── Fallback Provider Order ─────────────────────────────────────────────────

function getFallbackProviders(primary: Provider): Provider[] {
  const allProviders: Provider[] = [
    "OpenAI", "Groq", "Anthropic", "Gemini", "Mistral",
    "xAI", "DeepSeek", "OpenRouter", "Cohere", "Cerebras", "Sambanova", "Cloudflare", "Github"
  ];
  
  const fallbacks: Provider[] = [];
  if (primary === "OpenAI") {
    fallbacks.push("Groq", "OpenRouter");
  } else if (primary === "Groq") {
    fallbacks.push("OpenAI", "OpenRouter");
  } else {
    fallbacks.push("OpenRouter");
  }

  for (const p of allProviders) {
    if (p !== primary && !fallbacks.includes(p)) fallbacks.push(p);
  }
  return fallbacks;
}

// ─── Anthropic Format Translation ────────────────────────────────────────────

function toAnthropicRequest(req: ChatCompletionRequest): AnthropicRequest {
  let systemPrompt: string | undefined;
  const messages: AnthropicMessage[] = [];

  for (const msg of req.messages) {
    if (msg.role === "system") {
      systemPrompt = (systemPrompt ? systemPrompt + "\n" : "") + (msg.content ?? "");
    } else if (msg.role === "developer") {
      messages.push({ role: "user", content: msg.content ?? "" });
    } else if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content ?? "" });
    }
  }

  let mappedModel = req.model;
  const anthropicMapped = mapToAnthropicModel(req.model);
  if (anthropicMapped) mappedModel = anthropicMapped;

  const anthropicReq: AnthropicRequest = {
    model: mappedModel,
    max_tokens: req.max_tokens ?? 4096,
    messages,
  };

  if (systemPrompt) anthropicReq.system = systemPrompt;
  if (req.temperature !== undefined) anthropicReq.temperature = req.temperature;
  if (req.top_p !== undefined) anthropicReq.top_p = req.top_p;
  if (req.stop) anthropicReq.stop_sequences = Array.isArray(req.stop) ? req.stop : [req.stop];

  return anthropicReq;
}

function fromAnthropicResponse(resp: AnthropicResponse): ChatCompletionResponse {
  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  let finishReason: "stop" | "length" = "stop";
  if (resp.stop_reason === "max_tokens") finishReason = "length";

  return {
    id: resp.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: resp.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: resp.usage.input_tokens,
      completion_tokens: resp.usage.output_tokens,
      total_tokens: resp.usage.input_tokens + resp.usage.output_tokens,
    },
  };
}

// ─── Request Execution ──────────────────────────────────────────────────────

export interface RouterConfig {
  timeout: number;
  maxRetries: number;
  debug: boolean;
}

async function sendToProvider(
  provider: Provider,
  apiKey: string,
  request: ChatCompletionRequest,
  model: string,
  opts: { timeout: number; debug: boolean }
): Promise<ChatCompletionResponse | AsyncGenerator<ChatCompletionChunk, void, unknown>> {
  const config = PROVIDER_CONFIGS[provider];
  const isStream = request.stream === true;

  if (opts.debug) {
    console.error(`[keyking] → ${provider} (model: ${model}, stream: ${isStream})`);
  }

  let response: Response | undefined;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

  try {
    if (provider === "Anthropic") {
      const anthropicReq = toAnthropicRequest({ ...request, model });
      response = await fetch(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(anthropicReq),
        signal: controller.signal,
      });
    } else {
      const body = { ...request, model, stream: isStream };
      response = await fetch(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://keyking.ledgion.in",
          "X-Title": "KeyKing",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw new ProviderError(
      `Request to ${provider} failed: ${err instanceof Error ? err.message : String(err)}`,
      provider
    );
  }

  clearTimeout(timeoutId);

  if (response) {
    extractQuotaHeaders(response, provider, apiKey);
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new ProviderError(
      `${provider} returned ${response.status}: ${responseBody}`,
      provider,
      response.status
    );
  }

  if (isStream) {
    if (provider === "Anthropic") {
      const anthropicResp = (await response.json()) as AnthropicResponse;
      const fullResp = fromAnthropicResponse(anthropicResp);
      
      return (async function* () {
        const chunk: ChatCompletionChunk = {
          id: fullResp.id,
          object: "chat.completion.chunk",
          created: fullResp.created,
          model: fullResp.model,
          choices: [{
            index: 0,
            delta: { role: "assistant", content: fullResp.choices[0].message.content },
            finish_reason: "stop"
          }]
        };
        yield chunk;
      })();
    }

    return (async function* () {
      if (!response!.body) return;
      const reader = response!.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          
          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const chunkText = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);
            
            if (chunkText.startsWith("data: ")) {
              const data = chunkText.slice(6);
              if (data === "[DONE]") return;
              try {
                yield JSON.parse(data) as ChatCompletionChunk;
              } catch (e) {
                // Ignore incomplete JSON chunks silently
              }
            }
            boundary = buffer.indexOf("\n\n");
          }
        }
      } finally {
        reader.releaseLock();
      }
    })();
  }

  if (provider === "Anthropic") {
    const anthropicResp = (await response.json()) as AnthropicResponse;
    const result = fromAnthropicResponse(anthropicResp);
    result._keyking_provider = provider;
    return result;
  }

  const result = (await response.json()) as ChatCompletionResponse;
  result._keyking_provider = provider;
  return result;
}

// ─── Smart Router ────────────────────────────────────────────────────────────

export async function routeRequest(
  request: ChatCompletionRequest,
  vaultEntries: VaultEntry[],
  config: RouterConfig
): Promise<ChatCompletionResponse | AsyncGenerator<ChatCompletionChunk, void, unknown>> {
  const originalModel = request.model;
  const primaryProvider = resolveProvider(originalModel);

  if (!primaryProvider) {
    throw new NoProviderError(originalModel);
  }

  const providerKeys = new Map<string, string[]>();
  for (const entry of vaultEntries) {
    if (!providerKeys.has(entry.provider)) providerKeys.set(entry.provider, []);
    providerKeys.get(entry.provider)!.push(entry.key);
  }

  const attempts: { provider: Provider; model: string; key: string }[] = [];

  const primaryKeys = providerKeys.get(primaryProvider);
  if (primaryKeys) {
    const validKeys = primaryKeys.filter(k => globalCircuitBreaker.isAvailable(k));
    const sortedKeys = globalQuotaMap.sortKeys(validKeys);
    for (const key of sortedKeys) {
      attempts.push({ provider: primaryProvider, model: originalModel, key });
    }
  }

  const fallbacks = getFallbackProviders(primaryProvider);
  for (const fallbackProvider of fallbacks) {
    const keys = providerKeys.get(fallbackProvider);
    if (!keys) continue;

    let targetModel = originalModel;
    if (fallbackProvider === "Groq" && primaryProvider === "OpenAI") {
      const groqModel = mapToGroqModel(originalModel);
      if (groqModel) targetModel = groqModel;
    } else if (fallbackProvider === "Anthropic" && primaryProvider === "OpenAI") {
      const anthropicModel = mapToAnthropicModel(originalModel);
      if (anthropicModel) targetModel = anthropicModel;
    }
    
    const validKeys = keys.filter(k => globalCircuitBreaker.isAvailable(k));
    const sortedKeys = globalQuotaMap.sortKeys(validKeys);
    for (const key of sortedKeys) {
      attempts.push({ provider: fallbackProvider, model: targetModel, key });
    }
  }

  if (attempts.length === 0) {
    throw new NoProviderError(originalModel);
  }

  const maxAttempts = Math.min(attempts.length, config.maxRetries);
  const errors: ProviderError[] = [];

  for (let i = 0; i < maxAttempts; i++) {
    const { provider, model, key } = attempts[i];

    try {
      const result = await sendToProvider(provider, key, request, model, {
        timeout: config.timeout,
        debug: config.debug,
      });
      globalCircuitBreaker.recordSuccess(key);
      return result;
    } catch (err) {
      const providerError =
        err instanceof ProviderError
          ? err
          : new ProviderError(err instanceof Error ? err.message : String(err), provider);

      errors.push(providerError);

      if (providerError.statusCode === 401) {
        globalCircuitBreaker.recordFailure(key, true);
      } else {
        globalCircuitBreaker.recordFailure(key, false);
      }

      if (config.debug) {
        console.error(`[keyking] ✗ ${provider} failed (${providerError.statusCode ?? "network"}): ${providerError.message}`);
      }
    }
  }

  throw new AllProvidersFailedError(originalModel, errors);
}
