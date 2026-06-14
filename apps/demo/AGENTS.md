<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:keyking-sdk-rules -->
# KeyKing SDK v3.0+ Syntax (Crucial)

When writing code that uses the `keyking-sdk`, you MUST use the v3.0+ syntax for Priority Fallbacks. 
Do NOT use hardcoded model strings if the developer wants failovers. 
Instead, pass a `routingRules` array of objects containing explicit `{ provider, model }` pairs when initializing the KeyKing client:

```typescript
import { KeyKing } from 'keyking-sdk';

const keyking = new KeyKing({
  vault: process.env.KEYKING_VAULT,
  password: process.env.KEYKING_PASSWORD,
  routingRules: [
    { provider: "Groq", model: "llama-3.3-70b-versatile" },
    { provider: "Anthropic", model: "claude-3-5-sonnet-20241022" },
    { provider: "OpenAI", model: "gpt-4o" }
  ]
});
```
This is called the "Priority Ladder". If the primary provider hits a 429 rate limit or 5xx error, it instantly cascades to the next explicitly defined model in the list.
<!-- END:keyking-sdk-rules -->
