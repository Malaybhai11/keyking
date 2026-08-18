# 👑 KeyKing Ecosystem — Full Security Vulnerability Report

**Date:** 2026-07-25
**Scope:** Entire monorepo — SDK v3.0.1, Demo App, Web App, Desktop App (Tauri/Rust), Infrastructure
**Methodology:** 5 independent expert agents auditing source code, configuration, crypto implementation, and architecture

---

## 🚨 CRITICAL VULNERABILITIES (4)

### C1. Weak Vault Password + Low PBKDF2 Iterations = Instant Decryption
**Source:** Agent 1 (SDK Crypto), Agent 3 (Infrastructure)

- **Files:** `apps/demo/.env:2` + `apps/sdk/src/vault.ts:8`
- **Values:** `KEYKING_PASSWORD="malay1234"` + `PBKDF2_ITERATIONS = 100_000`
- **The issue:** Password is 9-char lowercase alphanumeric (~53 bits entropy). PBKDF2 at 100k iterations is **6x below** current OWASP recommendation (600k). Combined, a consumer GPU can crack this in **minutes**.
- **Attack scenario:** Anyone who gets the vault string (env file leak, SSRF, build artifact) can brute-force all API keys offline.
- **Fix:** Generate a 40+ char random password. Bump iterations to 600k (or switch to Argon2id).

### C2. No Rate Limiting on `/api/chat` �� Unlimited API Credit Drain
**Source:** Agent 2 (Demo & Web), Agent 3 (Infrastructure)

- **File:** `apps/demo/src/app/api/chat/route.ts:59-127`
- **The issue:** Anyone who discovers the demo URL can send infinite requests. Each request triggers the SDK's priority ladder, consuming tokens across all providers �� on **your** billing account. Also no request body size limit.
- **Attack scenario:** A script sending 1000 requests/min drains Groq/OpenAI/Anthropic credits in minutes. In serverless, you also pay compute per invocation.
- **Fix:** Add IP-based rate limiting (10 req/min), request size cap (1MB), message count cap (100 msgs), and token budget.

### C3. Desktop Vault Encryption Key Derived from Machine UID (Not User Secret)
**Source:** Agent 4 (Desktop App)

- **File:** `apps/desktop/src-tauri/src/vault/crypto.rs` (derives key from `machine_uid::get()` + static salt)
- **The issue:** The desktop app encrypts all stored API keys using a key derived **solely from the machine's hardware UID**. There is no user password, no OS keychain integration. Any process on the same machine can read `vault.json`, derive the same key, and decrypt all keys.
- **Attack scenario:** Malware, another app, or a compromised dev tool on the same machine silently exfiltrates all LLM API keys.
- **Fix:** Integrate with OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret), or require a user-chosen master password.

### C4. Production Secrets on Disk — Including Turso DB Read-Write JWT
**Source:** Agent 3 (Infrastructure)

- **Files:** `apps/demo/.env`, `apps/web/.env.local`, `apps/web/.env`
- **What's exposed:** `KEYKING_VAULT`, `KEYKING_PASSWORD`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (Turso JWT with `"a":"rw"` — read-write to production database)
- **Attack scenario:** A compromised dev machine, CI runner, or build artifact leaks all these. The Turso token gives database read-write access. Google client secret allows OAuth impersonation.
- **Fix:** Rotate ALL secrets immediately. Remove from `.env` files. Configure as Netlify env vars only.

---

## 🔴 HIGH VULNERABILITIES (6)

### H1. Session Tokens Leaked via Redirect URL (Web App OAuth)
**Source:** Agent 2 (Demo & Web)

- **File:** `apps/web/src/app/auth/app-callback/page.tsx:86-89`
- **The issue:** After successful Google OAuth, the raw `session.id`, `user.id`, and `email` are passed as URL query parameters in a redirect to `http://localhost:8787` (HTTP, not HTTPS). The URL is visible in browser history, address bar, and the `Referer` header.
- **Fix:** Use a short-lived authorization code or `postMessage` instead of passing tokens in the URL.

### H2. SDK Tarballs (.tgz) Tracked in Git — Binary Opaque Diffs
**Source:** Agent 3 (Infrastructure)

- **Files:** `apps/sdk/keyking-sdk-{2.1.0,3.0.0,3.0.1}.tgz` (confirmed in `git ls-files`)
- **The issue:** Binary `.tgz` blobs are in git history. Changes are opaque in code review. An attacker with write access could replace a tarball with a backdoored version — no reviewer could see the diff.
- **Fix:** Remove from git, add `.gitignore` entry, use npm workspaces instead.

### H3. `package-lock.json` Excluded from Git — No Reproducible Builds
**Source:** Agent 3 (Infrastructure)

- **File:** Root `.gitignore` includes `package-lock.json`
- **The issue:** Without a committed lockfile, `npm install` resolves dependency versions at build time. A malicious transitive dependency update could pass unnoticed. No integrity verification.
- **Fix:** Remove `package-lock.json` from `.gitignore`, commit all lockfiles, use `npm ci` in deploy.

### H4. System Key Printed to stdout at Desktop App Startup
**Source:** Agent 4 (Desktop App), Agent 5 (Architecture)

- **File:** `apps/desktop/src-tauri/src/main.rs:66` — `println!("Key King system key: {}", &*system_key);`
- **The issue:** The proxy authentication key is written to stdout every launch. Captured in terminal scrollback, CI logs, systemd journals. Any process on the machine can use it to call the proxy with all decrypted API keys.
- **Fix:** Remove or gate behind `#[cfg(debug_assertions)]`.

### H5. Decrypted Keys Cached in Process Memory Indefinitely
**Source:** Agent 1 (SDK Crypto), Agent 5 (Architecture)

- **File:** `apps/sdk/src/index.ts:153-154` — `private cachedEntries: Promise<VaultEntry[]> | null = null`
- **The issue:** On first use, the SDK decrypts the **entire vault** and caches all raw API keys in a module-level variable for the lifetime of the KeyKing instance. In serverless warm containers, this spans multiple requests. A heap dump, V8 snapshot, or `/proc/self/mem` can recover all keys.
- **Fix:** Decrypt individual keys on demand, add a `clearCache()` method, or at minimum document this behavior.

### H6. No CORS Restrictions on Any API Route
**Source:** Agent 3 (Infrastructure)

- **File:** `apps/demo/next.config.ts` (empty), `apps/web/next.config.ts` (empty)
- **The issue:** `/api/chat`, `/api/providers`, `/api/check-version`, and auth routes respond to any origin. Cross-origin requests from malicious sites are possible.
- **Fix:** Configure CORS headers in `next.config.ts` to restrict to known origins.

---

## 🟠 MEDIUM VULNERABILITIES (9)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| M1 | **No Content-Security-Policy** — No defense against XSS | Both `next.config.ts` + `netlify.toml` | Add CSP with `default-src 'self'` |
| M2 | **No HSTS** — Vulnerable to SSL-strip on first visit | `netlify.toml` | Add `Strict-Transport-Security` |
| M3 | **Error messages leak provider internals** — Full SDK errors returned to client | `chat/route.ts:120-125` | Return generic error, log full error server-side |
| M4 | **Hardcoded `debug: true`** in production | `chat/route.ts:107` | Change to `NODE_ENV === 'development'` |
| M5 | **`trustHost: true`** in better-auth — Host header injection risk | `apps/web/src/lib/auth.ts:17` | Set explicit `baseURL` instead |
| M6 | **No input validation** on chat request body | `chat/route.ts:80` | Validate messages array, model, routingRules shape |
| M7 | **Error info disclosure through `AllProvidersFailedError`** | SDK `types.ts` | Sanitize error messages of provider response bodies |
| M8 | **Client controls routing rules** — Could select expensive providers | `chat/route.ts:109-113` | Whitelist allowed providers, cap rule count |
| M9 | **Root `.gitignore` misses `.env.*` patterns** | Root `.gitignore` | Add `.env.*` pattern |

---

## 🔵 LOW / INFO VULNERABILITIES (7)

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| L1 | Static PBKDF2 salt instead of random per-export | LOW | Use random salt per vault export (already done in SDK — desktop crypto.rs uses static salt) |
| L2 | Version drift — Demo pins SDK 3.0.0, SDK is 3.0.1 | INFO | Update to `keyking-sdk-3.0.1.tgz` |
| L3 | No CSRF token on chat POST endpoint | LOW | Add Origin/Referer validation |
| L4 | No key rotation or revocation mechanism | INFO | Design key rotation workflow |
| L5 | Global mutable state (circuit breaker) unreliable in serverless | LOW | Accept as known limitation or use external store |
| L6 | Atob() in vault.ts is not binary-safe in all Node.js runtimes | LOW | Use `Buffer.from()` for base64 decode in Node.js |
| L7 | Desktop CSP set to `null` in Tauri config (webview XSS defense) | MEDIUM* | Set strict CSP in `tauri.conf.json:22` |

---

## ✅ SECURE BY DESIGN (What's actually done right)

| Area | Status | Why |
|------|--------|-----|
| **AES-256-GCM + random nonces** | ✅ Secure | Proper 12-byte nonce, 128-bit auth tag, correct IV handling |
| **Vault export encryption** | ✅ Secure | PBKDF2 + random salt + AES-256-GCM — sound wire format |
| **SSE streaming encoding** | ✅ Secure | All chunks `JSON.stringify`'d, no injection vector |
| **ReactMarkdown without `rehypeRaw`** | ✅ Secure | Raw HTML stripped by default, no `dangerouslySetInnerHTML` |
| **SSRF protection** | ✅ Secure | Provider URLs are hardcoded in SDK, not user-controllable |
| **`runtime: 'nodejs'`** | ✅ Correct | Web Crypto API needs Node.js, not Edge Runtime |
| **`.env` files gitignored** | ✅ Secure | Both root and demo `.gitignore` properly exclude them |

---

## ☢️ BLAST RADIUS ANALYSIS

| Compromise Scenario | What the attacker gets | Fix urgency |
|--------------------|----------------------|-------------|
| `.env` file leaks | All 6 provider API keys + Turso DB + Google OAuth | **NOW** |
| SDK process compromised (SSRF/RCE) | All decrypted API keys in memory | **HIGH** |
| Desktop machine infected with malware | All API keys via machine-UID vault decryption | **HIGH** |
| Netlify build env breached | Vault string + password + DB tokens | **IMMEDIATE** |

---

## 🎯 PRIORITY REMEDIATION ROADMAP

### 🔥 Do NOW (minutes)
1. Rotate `KEYKING_PASSWORD` to a 40+ char random string
2. Rotate `GOOGLE_CLIENT_SECRET` in Google Cloud Console
3. Rotate Turso `DATABASE_AUTH_TOKEN` (revoke and reissue)
4. Rotate `BETTER_AUTH_SECRET`
5. Set all secrets as Netlify env vars — remove from `.env` files

### ⏰ Do TODAY (hours)
6. Add rate limiting to `/api/chat`
7. Add CSP + HSTS + CORS in `next.config.ts` and `netlify.toml`
8. Remove `package-lock.json` from `.gitignore`, commit lockfile, use `npm ci`
9. Remove SDK tarballs from git, use npm workspaces
10. Fix OAuth session token redirect (use `postMessage` not URL params)

### 📅 Do THIS WEEK (days)
11. Increase PBKDF2 iterations to 600k in both SDK and desktop
12. Add input validation to chat API route
13. Disable `debug: true` in production
14. Fix desktop vault encryption to use OS keychain instead of machine-UID
15. Remove system key `println!` from desktop main.rs
16. Add destroy/clearCache method to SDK for key cleanup

---

*Report compiled from 5 independent security agent audits across SDK crypto, demo/web app, infrastructure, desktop app, and system architecture.*
