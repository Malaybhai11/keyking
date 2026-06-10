import type { Provider } from "./types.js";

export type CircuitState =
  | { status: "Closed" }
  | { status: "Open"; until: number; failureDuration: number }
  | { status: "HalfOpen"; failureDuration: number };

export class CircuitBreaker {
  private states = new Map<string, CircuitState>();

  trip(keyId: string, durationMs: number) {
    this.states.set(keyId, { status: "Open", until: Date.now() + durationMs, failureDuration: durationMs });
  }

  isAvailable(keyId: string): boolean {
    const state = this.states.get(keyId);
    if (!state) return true;
    if (state.status === "Closed") return true;
    if (state.status === "HalfOpen") return true;
    if (state.status === "Open") {
      if (Date.now() >= state.until) {
        this.states.set(keyId, { status: "HalfOpen", failureDuration: state.failureDuration });
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(keyId: string) {
    const state = this.states.get(keyId);
    if (state?.status === "HalfOpen") {
      this.states.set(keyId, { status: "Closed" });
    }
  }

  recordFailure(keyId: string, isUnauthorized: boolean) {
    let state = this.states.get(keyId);
    if (!state || state.status === "Closed") {
      state = { status: "Open", until: 0, failureDuration: 60000 };
      this.states.set(keyId, state);
    }
    
    if (isUnauthorized) {
      this.trip(keyId, 300_000); // 5 minutes quarantine for 401
    } else {
      const newDuration = Math.min(state.failureDuration * 2, 300000);
      this.states.set(keyId, { status: "Open", until: Date.now() + newDuration, failureDuration: newDuration });
    }
  }
}

export interface QuotaState {
  provider: Provider;
  remaining_requests?: number;
  remaining_tokens?: number;
  last_updated: number;
}

export class QuotaMap {
  private quotas = new Map<string, QuotaState>();

  update(keyId: string, state: QuotaState) {
    this.quotas.set(keyId, state);
  }

  get(keyId: string): QuotaState | undefined {
    return this.quotas.get(keyId);
  }

  sortKeys(candidates: string[]): string[] {
    return [...candidates].sort((a, b) => {
      const qa = this.quotas.get(a);
      const qb = this.quotas.get(b);

      if (qa?.remaining_requests === 0) return 1;
      if (qb?.remaining_requests === 0) return -1;

      const tokA = qa?.remaining_tokens ?? Number.MAX_SAFE_INTEGER;
      const tokB = qb?.remaining_tokens ?? Number.MAX_SAFE_INTEGER;
      return tokB - tokA; // Descending
    });
  }
}

export const globalCircuitBreaker = new CircuitBreaker();
export const globalQuotaMap = new QuotaMap();

export function extractQuotaHeaders(response: Response, provider: Provider, keyId: string) {
  let remainingRequests: number | undefined;
  let remainingTokens: number | undefined;

  if (provider === "Anthropic") {
    const reqs = response.headers.get("anthropic-ratelimit-requests-remaining");
    const toks = response.headers.get("anthropic-ratelimit-tokens-remaining");
    if (reqs) remainingRequests = parseInt(reqs, 10);
    if (toks) remainingTokens = parseInt(toks, 10);
  } else {
    const reqs = response.headers.get("x-ratelimit-remaining-requests") || response.headers.get("ratelimit-remaining");
    const toks = response.headers.get("x-ratelimit-remaining-tokens");
    if (reqs) remainingRequests = parseInt(reqs, 10);
    if (toks) remainingTokens = parseInt(toks, 10);
  }

  if (remainingRequests !== undefined || remainingTokens !== undefined) {
    globalQuotaMap.update(keyId, {
      provider,
      remaining_requests: Number.isNaN(remainingRequests) ? undefined : remainingRequests,
      remaining_tokens: Number.isNaN(remainingTokens) ? undefined : remainingTokens,
      last_updated: Date.now(),
    });
  }
}
