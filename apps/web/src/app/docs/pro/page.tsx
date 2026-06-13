import React from "react";
import { Terminal, Database, Server, Zap, Lock } from "lucide-react";

export default function ProDocsPage() {
 return (
 <div className="space-y-24">
 
 {/* HEADER SECTION */}
 <div className="space-y-6">
 <div className="inline-block border-[3px] border-black bg-[#00e676] text-black px-3 py-1 font-display font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_#000] -rotate-1 mb-4">
 Production Ready
 </div>
 <h1 className="font-display font-black text-5xl md:text-7xl uppercase tracking-tighter leading-[0.9] text-black ">
 The <span className="text-transparent [-webkit-text-stroke:2px_black] :2px_white] text-[#ff2a85] ">Zero-Trust</span> <br /> Architecture.
 </h1>
 <p className="text-xl font-medium text-neutral-800 leading-relaxed border-l-[6px] border-[#fde047] pl-6 py-2 max-w-2xl">
 KeyKing isn't some fragile API proxy. It’s a ruthless, local-first credential fortress. We violently intercept your requests and crush your API bills by forcing traffic through your combined free tiers. Zero limits. Zero apologies.
 </p>
 </div>

 {/* QUICK CARDS */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="border-[4px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_#000] hover:-translate-y-2 hover:-rotate-1 hover:shadow-[12px_12px_0px_0px_#000] :shadow-[12px_12px_0px_0px_#ff2a85] active:translate-x-[12px] active:translate-y-[12px] active:shadow-none transition-all duration-75 ease-linear cursor-pointer group">
 <Server className="w-10 h-10 mb-6 text-[#00f0ff] group-hover:scale-110 transition-transform duration-75 ease-linear" />
 <h3 className="font-display font-black text-2xl uppercase mb-3 text-black ">Build an AI App</h3>
 <p className="text-sm font-medium text-neutral-600 leading-relaxed">
 Stop reading theory. Ship code. Use our brutally efficient NPM SDK and Next.js to build a serverless AI integration that actually scales without bankrupting you.
 </p>
 </div>
 
 <div className="border-[4px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_#000] hover:-translate-y-2 hover:rotate-1 hover:shadow-[12px_12px_0px_0px_#000] :shadow-[12px_12px_0px_0px_#00e676] active:translate-x-[12px] active:translate-y-[12px] active:shadow-none transition-all duration-75 ease-linear cursor-pointer group">
 <Database className="w-10 h-10 mb-6 text-[#ff6d00] group-hover:scale-110 transition-transform duration-75 ease-linear" />
 <h3 className="font-display font-black text-2xl uppercase mb-3 text-black ">Understanding Routing</h3>
 <p className="text-sm font-medium text-neutral-600 leading-relaxed">
 Rip open the hood of our Rust-powered Axum proxy. Learn exactly how our savage load balancing algorithms bypass rate limits and squeeze every drop of free tier quota.
 </p>
 </div>
 </div>

 <hr className="border-t-[4px] border-black " />

 {/* QUICKSTART SECTION */}
 <section id="quickstart" className="space-y-8 scroll-mt-32">
 <h2 className="font-display font-black text-3xl md:text-4xl uppercase text-black flex items-center gap-4">
 <span className="bg-[#fde047] text-black border-[3px] border-black px-3 py-1 shadow-[4px_4px_0px_0px_#000]">1</span>
 Quickstart
 </h2>
 
 <div className="prose prose-lg max-w-none">
 <p className="text-lg font-medium text-neutral-700 ">
 The KeyKing desktop client is the beating heart of your AI stack. Encrypted vault. Relentless local proxy. Your absolute control plane. Run the universal install script and take back your compute:
 </p>
 </div>

 <div className="relative group mt-6">
 <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#fde047_10px,#fde047_20px)] translate-x-3 translate-y-3 border-[3px] border-black"></div>
 <div className="relative bg-black border-[3px] border-black flex flex-col md:flex-row">
 <div className="border-b-[3px] md:border-b-0 md:border-r-[3px] border-black p-2 flex md:flex-col items-center justify-between bg-[#00e676]">
 <div className="flex gap-2">
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 </div>
 <span className="font-display font-black text-[10px] uppercase tracking-widest text-black">Terminal</span>
 </div>
 <code className="font-mono text-[#00e676] text-sm md:text-base p-6 block">
 curl -fsSL https://keyking.ledgion.in/install.sh | bash
 </code>
 </div>
 </div>
 </section>

 {/* PROXY SECTION */}
 <section id="proxy" className="space-y-8 scroll-mt-32">
 <h2 className="font-display font-black text-3xl md:text-4xl uppercase text-black flex items-center gap-4">
 <span className="bg-[#00f0ff] text-black border-[3px] border-black px-3 py-1 shadow-[4px_4px_0px_0px_#000]">2</span>
 Local Proxy
 </h2>
 
 <div className="prose prose-lg max-w-none mb-8">
 <p className="text-lg font-medium text-neutral-700 ">
 The local proxy runs a lightning-fast Rust (Axum) web server on <code className="bg-black text-white px-2 py-0.5 rounded-sm font-bold">localhost:8787</code>. It intercepts any OpenAI-compatible API request and aggressively routes it to the provider with the most remaining quota.
 </p>
 </div>

 <div className="border-[4px] border-black bg-black flex flex-col">
 <div className="border-b-[4px] border-black p-2 flex flex-col md:flex-row items-center justify-between bg-[#fde047] ">
 <div className="flex gap-2">
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 </div>
 <span className="font-display font-black text-[10px] uppercase tracking-widest text-black">Python_Script.py</span>
 </div>
 <pre className="font-mono text-sm leading-relaxed text-black overflow-x-auto p-6">
<span className="text-[#ff2a85] font-bold">from</span> openai <span className="text-[#ff2a85] font-bold">import</span> OpenAI{`\n\n`}
<span className="text-neutral-500 italic"># Point the client to KeyKing instead of OpenAI</span>{`\n`}
client = OpenAI({`\n`}
 base_url=<span className="text-[#00e676]">"http://localhost:8787/v1"</span>,{`\n`}
 api_key=<span className="text-[#00e676]">"kk-zero-config"</span>{`\n`}
){`\n\n`}
response = client.chat.completions.create({`\n`}
 model=<span className="text-[#00e676]">"gpt-4"</span>,{`\n`}
 messages=[{`{"role": "user", "content": "Hello!"}`}]{`\n`}
)
 </pre>
 </div>
 </section>

 {/* CLAUDE CODE SECTION */}
 <section id="claude" className="space-y-8 scroll-mt-32">
 <h2 className="font-display font-black text-3xl md:text-4xl uppercase text-black flex items-center gap-4">
 <span className="bg-[#ff2a85] text-white border-[3px] border-black px-3 py-1 shadow-[4px_4px_0px_0px_#000]">3</span>
 Claude Code
 </h2>
 
 <div className="prose prose-lg max-w-none">
 <p className="text-lg font-medium text-neutral-700 ">
 Anthropic's claude-code agent is a beast, but it will annihilate your API budget in hours. Stop paying for compute. KeyKing hijacks its requests with a zero-config wrapper so you can run it completely free. Bleed them dry, not yourself.
 </p>
 </div>

 <div className="flex flex-col md:flex-row items-center gap-6 p-4 md:p-6 border-[4px] border-black bg-black">
 <Terminal className="w-12 h-12 text-[#ff2a85] shrink-0" />
 <div>
 <div className="font-display font-bold text-[#fde047] text-xs uppercase tracking-widest mb-1">Zero-Config Terminal Wrapper</div>
 <code className="font-mono text-white text-lg md:text-2xl font-bold">
 $ keyking-claude
 </code>
 </div>
 </div>
 </section>

 </div>
 );
}
