import type { Metadata } from "next";
import Link from "next/link";

const url = "https://keyking.ledgion.in/ai-api-key-manager";

export const metadata: Metadata = {
  title: "Local AI API Key Manager with Automatic Fallback",
  description:
    "Manage OpenAI, Anthropic, Groq, Gemini, Mistral, and other AI API keys in one encrypted local vault. Use one OpenAI-compatible endpoint with provider fallback.",
  alternates: { canonical: url },
  openGraph: {
    title: "KeyKing AI — Local AI API Key Manager",
    description: "Encrypted local key storage, one endpoint, and automatic LLM provider fallback.",
    url,
  },
};

const faq = [
  ["What is an AI API key manager?", "An AI API key manager stores and organizes credentials used to call model providers. KeyKing AI combines local encrypted storage with a gateway, so applications call one local endpoint instead of handling every provider key directly."],
  ["Do my provider keys go to KeyKing servers?", "The desktop workflow is designed around a local encrypted vault and local proxy. The proxy decrypts the selected credential locally when it needs to call the upstream provider."],
  ["Can one endpoint use several providers?", "Yes. OpenAI-compatible clients can point at the local KeyKing endpoint while the Priority Ladder selects and fails over between configured provider/model pairs."],
  ["Does KeyKing provide free model tokens?", "No. KeyKing routes through credentials and quotas you supply. You can include providers or models that offer you a free tier, but KeyKing does not create unlimited third-party usage."],
];

export default function AiApiKeyManagerPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text },
    })),
  };

  return (
    <main className="min-h-screen bg-[#fcf6e6] text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="max-w-6xl mx-auto px-5 py-6 flex items-center justify-between font-bold">
        <Link href="/">← KeyKing AI</Link><Link href="/docs">Documentation</Link>
      </nav>
      <article className="max-w-4xl mx-auto px-5 py-12">
        <p className="font-mono font-bold uppercase text-[#d60062]">Local-first developer infrastructure</p>
        <h1 className="font-display font-black text-5xl md:text-7xl uppercase leading-[0.95] mt-4">Your AI keys.<br />One local endpoint.</h1>
        <p className="text-xl leading-8 mt-8 max-w-3xl">KeyKing AI is a local AI API key manager and multi-provider gateway. Store provider credentials in an encrypted vault on your computer, connect tools to one OpenAI-compatible endpoint, and automatically move to the next provider when a route fails.</p>
        <div className="flex flex-wrap gap-4 mt-8">
          <a className="border-4 border-black bg-[#00e676] px-6 py-3 font-black shadow-[5px_5px_0_#000]" href="https://github.com/Malaybhai11/keyking/releases/latest">Download KeyKing AI</a>
          <Link className="border-4 border-black bg-white px-6 py-3 font-black shadow-[5px_5px_0_#000]" href="/security">Read the security model</Link>
        </div>
        <section className="grid md:grid-cols-3 gap-5 mt-16">
          {[
            ["Encrypted locally", "Provider keys are stored in an AES-256-GCM encrypted local vault."],
            ["One compatible API", "Point OpenAI-compatible clients at http://127.0.0.1:8787/v1."],
            ["Priority fallback", "Define an ordered ladder of explicit provider and model pairs."],
          ].map(([title, body]) => <div key={title} className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000]"><h2 className="font-black text-xl uppercase">{title}</h2><p className="mt-3 leading-7">{body}</p></div>)}
        </section>
        <section className="mt-20">
          <h2 className="font-display font-black text-4xl uppercase">How the local gateway works</h2>
          <ol className="mt-8 space-y-4 text-lg">
            <li><strong>1. Add keys:</strong> save your user-supplied provider credentials in the desktop vault.</li>
            <li><strong>2. Configure routes:</strong> order provider/model pairs in your Priority Ladder.</li>
            <li><strong>3. Connect once:</strong> use KeyKing's local base URL in a compatible SDK or coding agent.</li>
            <li><strong>4. Fail over:</strong> when an eligible route is rate-limited or unavailable, KeyKing tries the next configured route.</li>
          </ol>
          <pre className="mt-8 overflow-x-auto border-4 border-black bg-black text-[#00e676] p-6 text-sm"><code>{`const client = new OpenAI({
  baseURL: "http://127.0.0.1:8787/v1",
  apiKey: "your-local-keyking-token"
});`}</code></pre>
        </section>
        <section className="mt-20">
          <h2 className="font-display font-black text-4xl uppercase">Frequently asked questions</h2>
          <div className="mt-8 space-y-5">{faq.map(([q, a]) => <div key={q} className="border-t-4 border-black pt-5"><h3 className="font-black text-xl">{q}</h3><p className="mt-2 leading-7">{a}</p></div>)}</div>
        </section>
      </article>
    </main>
  );
}
