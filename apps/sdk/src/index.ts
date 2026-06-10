import { decryptVault } from "./vault.js";
import { routeRequest, resolveProvider } from "./router.js";
import type {
  KeyKingConfig,
  VaultEntry,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  Provider,
} from "./types.js";
import {
  KeyKingError,
  VaultDecryptionError,
  ProviderError,
  NoProviderError,
  AllProvidersFailedError,
} from "./types.js";

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type {
  KeyKingConfig,
  VaultEntry,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  ChatCompletionChoice,
  ChatCompletionChunk,
  ChatCompletionChunkChoice,
  CompletionUsage,
  Tool,
  ToolCall,
  ResponseFormat,
  Provider,
} from "./types.js";

export {
  KeyKingError,
  VaultDecryptionError,
  ProviderError,
  NoProviderError,
  AllProvidersFailedError,
} from "./types.js";

export { decryptVault } from "./vault.js";
export { resolveProvider } from "./router.js";

// ─── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 3;

// ─── Completions API ─────────────────────────────────────────────────────────

class Completions {
  private readonly getEntries: () => Promise<VaultEntry[]>;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly debug: boolean;

  constructor(
    getEntries: () => Promise<VaultEntry[]>,
    timeout: number,
    maxRetries: number,
    debug: boolean
  ) {
    this.getEntries = getEntries;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.debug = debug;
  }

  /**
   * Create a chat completion. Uses the same interface as OpenAI's SDK.
   *
   * @example
   * ```ts
   * const response = await keyking.chat.completions.create({
   *   model: "gpt-4o",
   *   messages: [{ role: "user", content: "Hello!" }],
   * });
   * console.log(response.choices[0].message.content);
   * ```
   */
  async create(request: ChatCompletionRequest & { stream: true }): Promise<AsyncGenerator<ChatCompletionChunk, void, unknown>>;
  async create(request: ChatCompletionRequest & { stream?: false | undefined }): Promise<ChatCompletionResponse>;
  async create(request: ChatCompletionRequest): Promise<ChatCompletionResponse | AsyncGenerator<ChatCompletionChunk, void, unknown>> {
    const entries = await this.getEntries();

    if (this.debug) {
      const providers = [...new Set(entries.map((e) => e.provider))];
      console.error(`[keyking] Vault loaded: ${entries.length} keys [${providers.join(", ")}]`);
      const primary = resolveProvider(request.model);
      console.error(`[keyking] Model "${request.model}" → primary: ${primary ?? "unknown"}`);
    }

    return routeRequest(request, entries, {
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      debug: this.debug,
    });
  }
}

// ─── Chat Namespace ──────────────────────────────────────────────────────────

class Chat {
  public readonly completions: Completions;

  constructor(
    getEntries: () => Promise<VaultEntry[]>,
    timeout: number,
    maxRetries: number,
    debug: boolean
  ) {
    this.completions = new Completions(getEntries, timeout, maxRetries, debug);
  }
}

// ─── KeyKing Client ──────────────────────────────────────────────────────────

/**
 * The main KeyKing SDK client.
 *
 * @example
 * ```ts
 * import { KeyKing } from "keyking-sdk";
 *
 * const keyking = new KeyKing({
 *   vault: process.env.KEYKING_VAULT,
 *   password: process.env.KEYKING_PASSWORD,
 * });
 *
 * const response = await keyking.chat.completions.create({
 *   model: "gpt-4o",
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * ```
 */
export class KeyKing {
  public readonly chat: Chat;

  private readonly vaultString: string;
  private readonly password: string;
  private readonly debug: boolean;

  /** Cached decrypted vault entries (lazy decryption). */
  private cachedEntries: Promise<VaultEntry[]> | null = null;

  constructor(config: KeyKingConfig = {}) {
    const vault = config.vault ?? process.env.KEYKING_VAULT;
    const password = config.password ?? process.env.KEYKING_PASSWORD;

    if (!vault) {
      throw new KeyKingError(
        "No vault provided. Pass `vault` in config or set the KEYKING_VAULT environment variable.",
        "MISSING_VAULT"
      );
    }
    if (!password) {
      throw new KeyKingError(
        "No password provided. Pass `password` in config or set the KEYKING_PASSWORD environment variable.",
        "MISSING_PASSWORD"
      );
    }

    this.vaultString = vault;
    this.password = password;
    this.debug = config.debug ?? false;

    const timeout = config.timeout ?? DEFAULT_TIMEOUT;
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

    // Bind the lazy getter so vault is decrypted on first use, not at construction
    this.chat = new Chat(
      () => this.getEntries(),
      timeout,
      maxRetries,
      this.debug
    );
  }

  /**
   * Get decrypted vault entries, decrypting on first access.
   * Results are cached for subsequent calls.
   */
  private async getEntries(): Promise<VaultEntry[]> {
    if (this.cachedEntries === null) {
      if (this.debug) {
        console.error("[keyking] Decrypting vault...");
      }
      this.cachedEntries = decryptVault(this.vaultString, this.password).then((entries) => {
        if (this.debug) {
          console.error(`[keyking] Vault decrypted: ${entries.length} entries`);
        }
        return entries;
      });
    }
    return this.cachedEntries;
  }

  /**
   * Get the list of providers available in the vault.
   */
  async getProviders(): Promise<Provider[]> {
    const entries = await this.getEntries();
    return [...new Set(entries.map((e) => e.provider))] as Provider[];
  }

  /**
   * Check if the vault contains a key for the given provider.
   */
  async hasProvider(provider: Provider): Promise<boolean> {
    const entries = await this.getEntries();
    return entries.some((e) => e.provider === provider);
  }

  /**
   * Resolve which provider will handle a given model.
   * Returns null if the model is not recognized.
   */
  resolveModel(model: string): Provider | null {
    return resolveProvider(model);
  }
}

// ─── Default Export ──────────────────────────────────────────────────────────

export default KeyKing;
