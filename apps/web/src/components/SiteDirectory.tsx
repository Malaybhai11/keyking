import Link from "next/link";

const primaryLinks = [
  { href: "/ai-api-key-manager", label: "AI API Key Manager", description: "Local encrypted key vault and one compatible endpoint" },
  { href: "/security", label: "Security Model", description: "Encryption, trust boundaries, and credential flow" },
  { href: "/guides/claude-code", label: "Claude Code Guide", description: "Route Claude Code through your provider ladder" },
  { href: "/compare/litellm", label: "KeyKing vs LiteLLM", description: "Desktop-first and server-proxy workflows compared" },
  { href: "/docs", label: "Documentation", description: "Install, configure, and integrate KeyKing AI" },
  { href: "/download", label: "Download", description: "Get the latest KeyKing AI desktop release" },
];

export default function SiteDirectory() {
  return (
    <section aria-labelledby="keyking-directory-title" className="border-t-4 border-black bg-white text-black">
      <div className="max-w-7xl mx-auto px-5 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#d60062]">Explore KeyKing AI</p>
            <h2 id="keyking-directory-title" className="font-display font-black text-3xl md:text-4xl uppercase mt-2">Local AI gateway resources</h2>
          </div>
          <Link href="/" className="font-black underline underline-offset-4">KeyKing AI home</Link>
        </div>
        <nav aria-label="KeyKing AI site directory" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="border-3 border-black p-5 bg-[#fcf6e6] shadow-[4px_4px_0_#000] hover:-translate-y-1 transition-transform">
              <span className="block font-display font-black uppercase text-lg">{link.label}</span>
              <span className="block text-sm leading-6 mt-2 text-neutral-700">{link.description}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-10 pt-6 border-t-2 border-black flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
          <a href="https://github.com/Malaybhai11/keyking">GitHub repository</a>
          <a href="https://github.com/Malaybhai11/keyking/releases/latest">Latest release</a>
          <a href="/llms.txt">LLM context</a>
          <a href="/sitemap.xml">XML sitemap</a>
        </div>
      </div>
    </section>
  );
}
