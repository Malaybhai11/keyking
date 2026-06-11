// ─── Vault Types ──────────────────────────────────────────────────────────────

/** A single entry stored in the encrypted KeyKing vault. */
export interface VaultEntry {
  provider: string;
  key: string;
}

// ─── Provider Types ──────────────────────────────────────────────────────────

/** Supported LLM provider identifiers. */
export type Provider =
  | "OpenAI"
  | "Groq"
  | "Anthropic"
  | "Gemini"
  | "Mistral"
  | "xAI"
  | "DeepSeek"
  | "OpenRouter"
  | "Cohere"
  | "Cerebras"
  | "Sambanova"
  | "Cloudflare"
  | "Github"
  | "Nvidia"
  | "OpencodeZen";

/** Provider endpoint configuration. */
export interface ProviderConfig {
  baseUrl: string;
  /** Whether this provider uses the standard OpenAI-compatible format. */
  openaiCompatible: boolean;
}

// ─── Chat Completion Types (OpenAI-compatible) ───────────────────────────────

export interface ChatMessage {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ResponseFormat {
  type: "text" | "json_object";
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  tools?: Tool[];
  tool_choice?: "none" | "auto" | "required" | { type: "function"; function: { name: string } };
  response_format?: ResponseFormat;
  seed?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: CompletionUsage;
  system_fingerprint?: string;
  /** The provider that actually served this request. */
  _keyking_provider?: string;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: {
    role?: "system" | "developer" | "user" | "assistant" | "tool";
    content?: string | null;
  };
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
}

// ─── Anthropic-specific types (internal) ─────────────────────────────────────

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
}

export interface AnthropicContentBlock {
  type: "text";
  text: string;
}

export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ─── SDK Configuration ──────────────────────────────────────────────────────

export interface KeyKingConfig {
  /**
   * The encrypted vault string exported from the KeyKing desktop app.
   * Starts with "KK_VAULT_".
   * Can also be read from the KEYKING_VAULT environment variable.
   */
  vault?: string;

  /**
   * The password used to encrypt the vault.
   * Can also be read from the KEYKING_PASSWORD environment variable.
   */
  password?: string;

  /**
   * Request timeout in milliseconds. Defaults to 60000 (60s).
   */
  timeout?: number;

  /**
   * Maximum number of fallback providers to try before giving up.
   * Defaults to 3.
   */
  maxRetries?: number;

  /**
   * Enable debug logging to stderr.
   */
  debug?: boolean;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export class KeyKingError extends Error {
  public readonly code: string;
  public readonly provider?: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string, provider?: string, statusCode?: number) {
    super(message);
    this.name = "KeyKingError";
    this.code = code;
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export class VaultDecryptionError extends KeyKingError {
  constructor(message: string) {
    super(message, "VAULT_DECRYPTION_ERROR");
    this.name = "VaultDecryptionError";
  }
}

export class ProviderError extends KeyKingError {
  constructor(message: string, provider: string, statusCode?: number) {
    super(message, "PROVIDER_ERROR", provider, statusCode);
    this.name = "ProviderError";
  }
}

export class NoProviderError extends KeyKingError {
  constructor(model: string) {
    super(
      `No provider found for model "${model}". Check your vault contains a key for this model's provider.`,
      "NO_PROVIDER"
    );
    this.name = "NoProviderError";
  }
}

export class AllProvidersFailedError extends KeyKingError {
  public readonly errors: ProviderError[];

  constructor(model: string, errors: ProviderError[]) {
    const summary = errors.map(e => `${e.provider}: ${e.message}`).join("; ");
    super(
      `All providers failed for model "${model}": ${summary}`,
      "ALL_PROVIDERS_FAILED"
    );
    this.name = "AllProvidersFailedError";
    this.errors = errors;
  }
}
