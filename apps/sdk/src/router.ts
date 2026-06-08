import type {
  Provider,
  ProviderConfig,
  VaultEntry,
  ChatCompletionRequest,
  ChatCompletionResponse,
  AnthropicRequest,
  AnthropicResponse,
  AnthropicMessage,
} from "./types.js";

import {
  ProviderError,
  NoProviderError,
  AllProvidersFailedError,
} from "./types.js";

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
};

// ─── Model → Provider Mapping ────────────────────────────────────────────────

/** Model prefix rules — order matters, first match wins. */
const MODEL_PREFIX_MAP: [string, Provider][] = [
  // OpenAI
  ["gpt-", "OpenAI"],
  ["o1", "OpenAI"],
  ["o3", "OpenAI"],
  ["davinci", "OpenAI"],
  // Groq
  ["llama", "Groq"],
  ["groq", "Groq"],
  ["mixtral", "Groq"],
  ["gemma", "Groq"],
  // Gemini
  ["gemini", "Gemini"],
  // Anthropic
  ["claude", "Anthropic"],
  // Mistral
  ["mistral", "Mistral"],
  ["codestral", "Mistral"],
  // xAI
  ["grok", "xAI"],
  // DeepSeek
  ["deepseek", "DeepSeek"],
  // Cohere
  ["command", "Cohere"],
  ["cohere", "Cohere"],
];

/**
 * Determine the primary provider for a given model name.
 */
export function resolveProvider(model: string): Provider | null {
  const lowerModel = model.toLowerCase();
  for (const [prefix, provider] of MODEL_PREFIX_MAP) {
    if (lowerModel.startsWith(prefix)) {
      return provider;
    }
  }
  return null;
}

// ─── Groq Model Mapping (OpenAI → Groq equivalents) ─────────────────────────

const GROQ_MODEL_MAP: Record<string, string> = {
  "gpt-4o": "llama-3.3-70b-versatile",
  "gpt-4": "llama-3.3-70b-versatile",
  "gpt-4-turbo": "llama-3.3-70b-versatile",
  "gpt-3.5-turbo": "llama-3.1-8b-instant",
};

/**
 * Map an OpenAI model name to a Groq-equivalent model.
 * Returns null if no mapping exists.
 */
function mapToGroqModel(model: string): string | null {
  const lowerModel = model.toLowerCase();

  // Check exact matches first
  if (GROQ_MODEL_MAP[lowerModel]) {
    return GROQ_MODEL_MAP[lowerModel];
  }

  // Check prefix matches (e.g. "gpt-4o-mini" → use gpt-4o mapping)
  if (lowerModel.startsWith("gpt-4o")) return "llama-3.3-70b-versatile";
  if (lowerModel.startsWith("gpt-4")) return "llama-3.3-70b-versatile";
  if (lowerModel.startsWith("gpt-3.5")) return "llama-3.1-8b-instant";

  return null;
}

// ─── Fallback Provider Order ─────────────────────────────────────────────────

/**
 * Determine the fallback providers for a given primary provider.
 * Prioritizes providers that are likely to work as alternatives.
 */
function getFallbackProviders(primary: Provider): Provider[] {
  const allProviders: Provider[] = [
    "OpenAI", "Groq", "Anthropic", "Gemini", "Mistral",
    "xAI", "DeepSeek", "OpenRouter", "Cohere",
  ];

  // OpenRouter is always a good fallback since it routes to many providers
  const fallbacks: Provider[] = [];

  // Groq is a great fallback for OpenAI models
  if (primary === "OpenAI") {
    fallbacks.push("Groq", "OpenRouter");
  } else if (primary === "Groq") {
    fallbacks.push("OpenAI", "OpenRouter");
  } else {
    fallbacks.push("OpenRouter");
  }

  // Add remaining providers (excluding primary and already-added)
  for (const p of allProviders) {
    if (p !== primary && !fallbacks.includes(p)) {
      fallbacks.push(p);
    }
  }

  return fallbacks;
}

// ─── Anthropic Format Translation ────────────────────────────────────────────

/**
 * Convert an OpenAI-format request into Anthropic's format.
 */
function toAnthropicRequest(req: ChatCompletionRequest): AnthropicRequest {
  let systemPrompt: string | undefined;
  const messages: AnthropicMessage[] = [];

  for (const msg of req.messages) {
    if (msg.role === "system") {
      // Anthropic uses a top-level `system` field instead of a system message
      systemPrompt = (systemPrompt ? systemPrompt + "\n" : "") + (msg.content ?? "");
    } else if (msg.role === "user" || msg.role === "assistant") {
      messages.push({
        role: msg.role,
        content: msg.content ?? "",
      });
    }
    // Tool messages are not supported in this translation
  }

  const anthropicReq: AnthropicRequest = {
    model: req.model,
    max_tokens: req.max_tokens ?? 4096,
    messages,
  };

  if (systemPrompt) {
    anthropicReq.system = systemPrompt;
  }
  if (req.temperature !== undefined) {
    anthropicReq.temperature = req.temperature;
  }
  if (req.top_p !== undefined) {
    anthropicReq.top_p = req.top_p;
  }
  if (req.stop) {
    anthropicReq.stop_sequences = Array.isArray(req.stop) ? req.stop : [req.stop];
  }

  return anthropicReq;
}

/**
 * Convert an Anthropic response back to OpenAI format.
 */
function fromAnthropicResponse(resp: AnthropicResponse): ChatCompletionResponse {
  const text = resp.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  let finishReason: "stop" | "length" = "stop";
  if (resp.stop_reason === "max_tokens") {
    finishReason = "length";
  }

  return {
    id: resp.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: resp.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text,
        },
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

interface RouteOptions {
  timeout: number;
  debug: boolean;
}

/**
 * Send a chat completion request to a specific provider.
 */
async function sendToProvider(
  provider: Provider,
  apiKey: string,
  request: ChatCompletionRequest,
  model: string,
  opts: RouteOptions
): Promise<ChatCompletionResponse> {
  const config = PROVIDER_CONFIGS[provider];

  if (opts.debug) {
    console.error(`[keyking] → ${provider} (model: ${model})`);
  }

  let response: Response;

  if (provider === "Anthropic") {
    // ── Anthropic uses a completely different format ────────────────────
    const anthropicReq = toAnthropicRequest({ ...request, model });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

    try {
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
    } catch (err) {
      throw new ProviderError(
        `Request to ${provider} failed: ${err instanceof Error ? err.message : String(err)}`,
        provider
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ProviderError(
        `${provider} returned ${response.status}: ${body}`,
        provider,
        response.status
      );
    }

    const anthropicResp = (await response.json()) as AnthropicResponse;
    const result = fromAnthropicResponse(anthropicResp);
    result._keyking_provider = provider;
    return result;
  }

  // ── OpenAI-compatible providers ────────────────────────────────────────
  const body = {
    ...request,
    model,
    stream: false, // SDK doesn't support streaming yet
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

  try {
    response = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ProviderError(
      `Request to ${provider} failed: ${err instanceof Error ? err.message : String(err)}`,
      provider
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new ProviderError(
      `${provider} returned ${response.status}: ${responseBody}`,
      provider,
      response.status
    );
  }

  const result = (await response.json()) as ChatCompletionResponse;
  result._keyking_provider = provider;
  return result;
}

/**
 * Determines if an error is retryable (rate limit or server error).
 */
function isRetryable(err: ProviderError): boolean {
  if (!err.statusCode) return true; // Network errors are retryable
  return err.statusCode === 429 || err.statusCode >= 500;
}

// ─── Smart Router ────────────────────────────────────────────────────────────

export interface RouterConfig {
  timeout: number;
  maxRetries: number;
  debug: boolean;
}

/**
 * The smart router that handles provider selection, fallback, and model mapping.
 */
export async function routeRequest(
  request: ChatCompletionRequest,
  vaultEntries: VaultEntry[],
  config: RouterConfig
): Promise<ChatCompletionResponse> {
  const originalModel = request.model;
  const primaryProvider = resolveProvider(originalModel);

  if (!primaryProvider) {
    throw new NoProviderError(originalModel);
  }

  // Build a lookup map: provider → array of API keys
  const providerKeys = new Map<string, string[]>();
  for (const entry of vaultEntries) {
    if (!providerKeys.has(entry.provider)) {
      providerKeys.set(entry.provider, []);
    }
    providerKeys.get(entry.provider)!.push(entry.key);
  }

  // Build the ordered list of (provider, model, key) pairs to try
  const attempts: { provider: Provider; model: string; key: string }[] = [];

  // Primary provider first
  const primaryKeys = providerKeys.get(primaryProvider);
  if (primaryKeys) {
    for (const key of primaryKeys) {
      attempts.push({ provider: primaryProvider, model: originalModel, key });
    }
  }

  // Fallback providers
  const fallbacks = getFallbackProviders(primaryProvider);
  for (const fallbackProvider of fallbacks) {
    const keys = providerKeys.get(fallbackProvider);
    if (!keys) continue;

    let targetModel = originalModel;
    let shouldAdd = false;

    if (fallbackProvider === "Groq" && primaryProvider === "OpenAI") {
      // Map OpenAI model → Groq equivalent
      const groqModel = mapToGroqModel(originalModel);
      if (groqModel) {
        targetModel = groqModel;
        shouldAdd = true;
      }
    } else if (fallbackProvider === "OpenRouter") {
      // OpenRouter can handle most models directly
      shouldAdd = true;
    }
    
    if (shouldAdd) {
      for (const key of keys) {
        attempts.push({ provider: fallbackProvider, model: targetModel, key });
      }
    }
  }

  if (attempts.length === 0) {
    throw new NoProviderError(originalModel);
  }

  // Limit attempts
  const maxAttempts = Math.min(attempts.length, config.maxRetries);
  const errors: ProviderError[] = [];

  for (let i = 0; i < maxAttempts; i++) {
    const { provider, model, key } = attempts[i];

    try {
      return await sendToProvider(provider, key, request, model, {
        timeout: config.timeout,
        debug: config.debug,
      });
    } catch (err) {
      const providerError =
        err instanceof ProviderError
          ? err
          : new ProviderError(
              err instanceof Error ? err.message : String(err),
              provider
            );

      errors.push(providerError);

      if (config.debug) {
        console.error(
          `[keyking] ✗ ${provider} failed (${providerError.statusCode ?? "network"}): ${providerError.message}`
        );
      }

      // Only retry on retryable errors
      if (!isRetryable(providerError)) {
        throw providerError;
      }
    }
  }

  throw new AllProvidersFailedError(originalModel, errors);
}
