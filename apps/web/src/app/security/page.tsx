import type { Metadata } from "next";
import Link from "next/link";

const url = "https://keyking.ledgion.in/security";

export const metadata: Metadata = {
  title: "How KeyKing AI Protects Your API Keys",
  description:
    "Understand KeyKing AI's local encryption, credential flow, trust boundaries, provider requests, vault handling, and security limitations.",
  alternates: { canonical: url },
  openGraph: { title: "KeyKing AI Security Model", description: "A transparent guide to KeyKing's encrypted local vault and trust boundaries.", url },
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f0] text-black">
      <nav className="max-w-5xl mx-auto px-5 py-6 flex justify-between font-bold"><Link href="/">← KeyKing AI</Link><a href="https://github.com/Malaybhai11/keyking/blob/main/SECURITY.md">Security checklist</a></nav>
      <article className="max-w-4xl mx-auto px-5 py-12">
        <p className="font-mono font-bold uppercase text-[#d60062]">Security, without hand-waving</p>
        <h1 className="font-display font-black text-5xl md:text-7xl uppercase leading-none mt-4">How KeyKing protects AI API keys</h1>
        <p className="text-xl leading-8 mt-8">KeyKing AI is designed so the desktop credential workflow happens on your machine. Keys are encrypted at rest, decrypted locally when needed, and sent only to the upstream provider selected for a request.</p>
        <section className="mt-14 border-4 border-black bg-white p-6 shadow-[7px_7px_0_#000]">
          <h2 className="font-black text-2xl uppercase">Credential flow</h2>
          <pre className="mt-5 overflow-x-auto bg-black text-[#00e676] p-5 text-sm"><code>{`Provider API key
  → AES-256-GCM encrypted local vault
  → local KeyKing proxy
  → selected provider API
  → response to your application`}</code></pre>
        </section>
        <section className="mt-16 grid md:grid-cols-2 gap-6">
          {[
            ["Encryption at rest", "The documented desktop design uses AES-256-GCM with a random 12-byte nonce. Password-based derivation uses PBKDF2-HMAC-SHA256 with 310,000 iterations."],
            ["Decryption boundary", "The selected credential is decrypted locally when KeyKing needs to authenticate an upstream request. Plaintext credentials should not be written to logs."],
            ["What providers see", "The selected model provider receives the request content and credential required to serve it. That provider's privacy, retention, and security terms still apply."],
            ["What KeyKing does not solve", "KeyKing cannot protect an already compromised machine. Malware or an attacker with sufficient local access may observe memory, traffic, or unlocked credentials."],
          ].map(([title, body]) => <div key={title} className="border-4 border-black p-6 bg-[#fde047]"><h2 className="font-black text-xl uppercase">{title}</h2><p className="mt-3 leading-7">{body}</p></div>)}
        </section>
        <section className="mt-16">
          <h2 className="font-display font-black text-4xl uppercase">Local proxy vs serverless SDK</h2>
          <div className="overflow-x-auto mt-6"><table className="w-full border-collapse bg-white"><thead><tr><th className="border-4 border-black p-4 text-left">Concern</th><th className="border-4 border-black p-4 text-left">Desktop proxy</th><th className="border-4 border-black p-4 text-left">Serverless SDK</th></tr></thead><tbody><tr><td className="border-4 border-black p-4 font-bold">Where it runs</td><td className="border-4 border-black p-4">Developer machine</td><td className="border-4 border-black p-4">Application runtime</td></tr><tr><td className="border-4 border-black p-4 font-bold">Vault use</td><td className="border-4 border-black p-4">Local desktop vault</td><td className="border-4 border-black p-4">Exported encrypted vault</td></tr><tr><td className="border-4 border-black p-4 font-bold">Plaintext lifetime</td><td className="border-4 border-black p-4">In local process memory when required</td><td className="border-4 border-black p-4">In runtime memory when required</td></tr></tbody></table></div>
        </section>
        <aside className="mt-16 border-4 border-black bg-[#00e676] p-6"><h2 className="font-black text-2xl uppercase">Report a vulnerability responsibly</h2><p className="mt-3">Do not publish exploit details before maintainers have had a reasonable chance to investigate. Contact <a className="underline font-bold" href="mailto:malay@ledgion.in">malay@ledgion.in</a> with reproduction steps and impact.</p></aside>
      </article>
    </main>
  );
}
