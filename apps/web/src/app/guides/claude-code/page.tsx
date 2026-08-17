import type { Metadata } from "next";
import Link from "next/link";

const url = "https://keyking.ledgion.in/guides/claude-code";

export const metadata: Metadata = {
  title: "Use Claude Code with Your Own AI Provider Quotas",
  description:
    "Route Claude Code through KeyKing AI's local gateway and explicit provider fallback ladder. Use models and quotas you already have access to.",
  alternates: { canonical: url },
  openGraph: { title: "Claude Code with KeyKing AI", description: "A transparent guide to routing Claude Code through a local multi-provider gateway.", url },
};

export default function ClaudeCodeGuidePage() {
  return (
    <main className="min-h-screen bg-[#fcf6e6] text-black">
      <nav className="max-w-5xl mx-auto px-5 py-6 flex justify-between font-bold"><Link href="/">← KeyKing AI</Link><Link href="/docs">Docs</Link></nav>
      <article className="max-w-4xl mx-auto px-5 py-12">
        <p className="font-mono font-bold uppercase text-[#d60062]">Claude Code workflow</p>
        <h1 className="font-display font-black text-5xl md:text-7xl uppercase leading-none mt-4">Route Claude Code through a local AI gateway</h1>
        <p className="text-xl leading-8 mt-8">KeyKing's `keyking-claude` wrapper sends compatible Claude Code traffic to the local Anthropic Messages adapter, then applies your configured provider/model Priority Ladder.</p>
        <div className="mt-8 border-4 border-black bg-[#fde047] p-5"><strong>Important:</strong> KeyKing does not provide Anthropic's paid service for free. You supply credentials and can route to models or providers for which you have access, including available free quotas.</div>
        <section className="mt-14">
          <h2 className="font-black text-3xl uppercase">1. Install and open KeyKing</h2>
          <pre className="mt-5 overflow-x-auto border-4 border-black bg-black text-[#00e676] p-5"><code>curl -fsSL https://keyking.ledgion.in/install.sh | bash</code></pre>
          <p className="mt-4 leading-7">Windows users can download the latest release. Add provider credentials in the desktop vault and start the local proxy.</p>
        </section>
        <section className="mt-14">
          <h2 className="font-black text-3xl uppercase">2. Configure a Priority Ladder</h2>
          <p className="mt-4 leading-7">Choose explicit provider/model pairs in the order you want KeyKing to try them. Verify that each selected provider supports the capabilities your Claude Code task requires.</p>
          <pre className="mt-5 overflow-x-auto border-4 border-black bg-black text-[#00e676] p-5 text-sm"><code>{`routingRules: [
  { provider: "Groq", model: "llama-3.3-70b-versatile" },
  { provider: "Anthropic", model: "claude-3-5-sonnet-20241022" },
  { provider: "OpenAI", model: "gpt-4o" }
]`}</code></pre>
        </section>
        <section className="mt-14">
          <h2 className="font-black text-3xl uppercase">3. Start the wrapper</h2>
          <pre className="mt-5 overflow-x-auto border-4 border-black bg-black text-[#00e676] p-5"><code>keyking-claude</code></pre>
          <p className="mt-4 leading-7">The wrapper targets KeyKing's local `/v1/messages` route. On eligible rate-limit or upstream failures, KeyKing moves to the next configured route.</p>
        </section>
        <section className="mt-14 border-t-4 border-black pt-8"><h2 className="font-black text-3xl uppercase">Compatibility notes</h2><ul className="mt-5 list-disc pl-6 space-y-3 leading-7"><li>Model behavior and tool support differ by provider.</li><li>A fallback model is not guaranteed to behave identically to an Anthropic model.</li><li>Requests sent upstream are governed by the selected provider's terms.</li><li>Use the decision logs to confirm which route served each request.</li></ul></section>
      </article>
    </main>
  );
}
