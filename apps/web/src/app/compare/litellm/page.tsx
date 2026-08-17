import type { Metadata } from "next";
import Link from "next/link";

const url = "https://keyking.ledgion.in/compare/litellm";

export const metadata: Metadata = {
  title: "KeyKing AI vs LiteLLM: Local Desktop Gateway Comparison",
  description:
    "Compare KeyKing AI and LiteLLM by deployment model, credential storage, local desktop workflow, routing, SDK compatibility, and ideal use case.",
  alternates: { canonical: url },
  openGraph: { title: "KeyKing AI vs LiteLLM", description: "Choose between a desktop-first local gateway and a general-purpose proxy platform.", url },
};

const rows = [
  ["Primary orientation", "Desktop-first local AI gateway", "General-purpose LLM proxy and SDK platform"],
  ["Credential workflow", "Encrypted local desktop vault", "Configuration and secret handling depend on deployment"],
  ["OpenAI-compatible API", "Yes", "Yes"],
  ["Multi-provider routing", "Explicit Priority Ladder", "Routing and fallback features"],
  ["Desktop application", "Core product experience", "Not the primary product model"],
  ["Self-hosted server use", "Local proxy plus serverless SDK workflow", "Strong fit for centrally deployed proxy services"],
  ["Best fit", "Individuals wanting local key custody and coding-agent routing", "Teams wanting a flexible proxy platform and broader server deployment options"],
];

export default function KeyKingVsLiteLLMPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f0] text-black">
      <nav className="max-w-6xl mx-auto px-5 py-6 flex justify-between font-bold"><Link href="/">← KeyKing AI</Link><a href="https://github.com/Malaybhai11/keyking">GitHub</a></nav>
      <article className="max-w-5xl mx-auto px-5 py-12">
        <p className="font-mono font-bold uppercase text-[#d60062]">Honest comparison</p>
        <h1 className="font-display font-black text-5xl md:text-7xl uppercase leading-none mt-4">KeyKing AI vs LiteLLM</h1>
        <p className="text-xl leading-8 mt-8 max-w-4xl">Both projects help applications work across model providers, but they start from different workflows. KeyKing AI is optimized for a developer's local machine and encrypted desktop vault. LiteLLM is a broader proxy and SDK platform commonly deployed as shared infrastructure.</p>
        <div className="overflow-x-auto mt-12"><table className="w-full border-collapse bg-white"><thead><tr><th className="border-4 border-black p-4 text-left">Need</th><th className="border-4 border-black p-4 text-left bg-[#fde047]">KeyKing AI</th><th className="border-4 border-black p-4 text-left">LiteLLM</th></tr></thead><tbody>{rows.map(([need, keyking, litellm]) => <tr key={need}><td className="border-4 border-black p-4 font-bold">{need}</td><td className="border-4 border-black p-4">{keyking}</td><td className="border-4 border-black p-4">{litellm}</td></tr>)}</tbody></table></div>
        <section className="grid md:grid-cols-2 gap-6 mt-14"><div className="border-4 border-black bg-[#00e676] p-6"><h2 className="font-black text-2xl uppercase">Choose KeyKing AI when</h2><ul className="mt-4 list-disc pl-6 space-y-2"><li>You want credentials encrypted in a local desktop vault.</li><li>Your main clients are local apps or coding agents.</li><li>You prefer an explicit, visual provider fallback ladder.</li></ul></div><div className="border-4 border-black bg-white p-6"><h2 className="font-black text-2xl uppercase">Consider LiteLLM when</h2><ul className="mt-4 list-disc pl-6 space-y-2"><li>You need a centrally hosted proxy for a team.</li><li>You want a mature general-purpose proxy configuration surface.</li><li>Your deployment model is server infrastructure rather than a desktop app.</li></ul></div></section>
        <p className="mt-12 text-sm leading-6">Comparison reflects publicly described product orientations as of August 2026. Capabilities change; verify current requirements against each project's official documentation. LiteLLM is a trademark of its respective owner, and this page is not affiliated with or endorsed by LiteLLM.</p>
      </article>
    </main>
  );
}
