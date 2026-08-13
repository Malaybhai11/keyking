import type {
  Provider,
  ProviderConfig,
  RoutingRule,
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
    // GitHub Models moved off the legacy Azure host to models.github.ai.
    baseUrl: "https://models.github.ai/inference/chat/completions",
    openaiCompatible: true,
  },
  Nvidia: {
    baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    openaiCompatible: true,
  },
  OpencodeZen: {
    baseUrl: "https://opencode.ai/zen/v1/chat/completions",
    openaiCompatible: true,
  },
  Lumos: {
    baseUrl: "https://api.lumosel.vip/v1/messages",
    openaiCompatible: false,
  },
  TokenRouter: {
    baseUrl: "https://api.tokenrouter.com/v1/chat/completions",
    openaiCompatible: true,
  },
  Zai: {
    baseUrl: "https://api.z.ai/api/paas/v4/chat/completions",
    openaiCompatible: true,
  },
  ModelScope: {
    baseUrl: "https://api-inference.modelscope.cn/v1/chat/completions",
    openaiCompatible: true,
  },
  SiliconFlow: {
    baseUrl: "https://api.siliconflow.com/v1/chat/completions",
    openaiCompatible: true,
  },
  Requesty: {
    baseUrl: "https://router.requesty.ai/v1/chat/completions",
    openaiCompatible: true,
  },
  Chutes: {
    baseUrl: "https://llm.chutes.ai/v1/chat/completions",
    openaiCompatible: true,
  },
  OllamaCloud: {
    baseUrl: "https://ollama.com/v1/chat/completions",
    openaiCompatible: true,
  },
};

// ─── Model → Provider Mapping ────────────────────────────────────────────────

const MODEL_PREFIX_MAP: [string, Provider][] = [
  ["tokenrouter", "TokenRouter"],
  ["kimi", "TokenRouter"],
  ["moonshot", "TokenRouter"],
  ["lumos", "Lumos"],
  ["claude-opus-4", "Lumos"],
  ["claude-sonnet-4.5", "Lumos"],
  ["claude-haiku-4", "Lumos"],
  ["gpt-5.5", "Lumos"],
  ["glm", "Zai"],
  ["zai", "Zai"],
  ["modelscope", "ModelScope"],
  ["siliconflow", "SiliconFlow"],
  ["requesty", "Requesty"],
  ["chutes", "Chutes"],
  ["ollama", "OllamaCloud"],
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
  ["nvidia", "Nvidia"],
  ["nim", "Nvidia"],
  ["zen", "OpencodeZen"],
  ["gpt-5", "OpencodeZen"],
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
    "xAI", "DeepSeek", "OpenRouter", "Cohere", "Cerebras", "Sambanova", "Cloudflare", "Github", "Nvidia", "OpencodeZen", "Lumos", "TokenRouter", "Zai", "ModelScope", "SiliconFlow", "Requesty", "Chutes", "OllamaCloud"
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
  routingRules?: RoutingRule[];
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
    if (provider === "Anthropic" || provider === "Lumos") {
      const anthropicReq = toAnthropicRequest({ ...request, model });
      response = await fetch(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          "Authorization": `Bearer ${apiKey}`,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(anthropicReq),
        signal: controller.signal,
      });
    } else {
      // Gemini's OpenAI-compatible layer returns HTTP 400 for OpenAI-only fields
      // (store, logprobs, logit_bias, n, user, parallel_tool_calls), for
      // stream_options, and for frequency/presence penalties on gemini-2.5+
      // models. Strip them before dispatch.
      const GEMINI_UNSUPPORTED = new Set([
        "stream_options",
        "frequency_penalty",
        "presence_penalty",
        "store",
        "logprobs",
        "top_logprobs",
        "logit_bias",
        "n",
        "user",
        "parallel_tool_calls",
      ]);
      const rawBody: Record<string, unknown> = { ...request, model, stream: isStream };
      const body = provider === "Gemini"
        ? Object.fromEntries(Object.entries(rawBody).filter(([k, v]) => v !== undefined && !GEMINI_UNSUPPORTED.has(k)))
        : rawBody;
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
    if (provider === "Anthropic" || provider === "Lumos") {
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

  if (provider === "Anthropic" || provider === "Lumos") {
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
  
  const providerKeys = new Map<string, string[]>();
  for (const entry of vaultEntries) {
    if (!providerKeys.has(entry.provider)) providerKeys.set(entry.provider, []);
    providerKeys.get(entry.provider)!.push(entry.key);
  }

  const attempts: { provider: Provider; model: string; key: string }[] = [];

  if (config.routingRules && config.routingRules.length > 0) {
    for (const rule of config.routingRules) {
      const keys = providerKeys.get(rule.provider);
      if (!keys || keys.length === 0) continue;

      const validKeys = keys.filter(k => globalCircuitBreaker.isAvailable(k));
      const sortedKeys = globalQuotaMap.sortKeys(validKeys);
      for (const key of sortedKeys) {
        attempts.push({ provider: rule.provider, model: rule.model, key });
      }
    }
  } else {
    const primaryProvider = resolveProvider(originalModel);
    if (!primaryProvider) {
      throw new NoProviderError(originalModel);
    }
    
    const order = [primaryProvider, ...getFallbackProviders(primaryProvider)];
    for (const provider of order) {
      const keys = providerKeys.get(provider);
      if (!keys || keys.length === 0) continue;

      let targetModel = originalModel;
      if (provider !== primaryProvider) {
        if (provider === "Groq") {
          targetModel = mapToGroqModel(originalModel) || originalModel;
        } else if (provider === "Anthropic") {
          targetModel = mapToAnthropicModel(originalModel) || originalModel;
        }
      }
      
      const validKeys = keys.filter(k => globalCircuitBreaker.isAvailable(k));
      const sortedKeys = globalQuotaMap.sortKeys(validKeys);
      for (const key of sortedKeys) {
        attempts.push({ provider, model: targetModel, key });
      }
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
