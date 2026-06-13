import React from "react";
import { Server, Activity, Shuffle } from "lucide-react";

export default function ProxyPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-3xl md:text-5xl uppercase tracking-tighter text-black ">
 Local Axum Proxy
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#00f0ff] pl-4">
 The heart of KeyKing is a lightning-fast Rust (Axum) web server running on port <span className="bg-black text-[#00e676] px-1 py-0.5 font-mono text-xs border border-black uppercase font-bold">8787</span> that intercepts, normalizes, and intelligently routes all your LLM traffic.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-xl md:text-2xl uppercase text-black flex items-center gap-3">
 <Server className="w-6 h-6 text-[#00e676]" />
 System API Key Authentication
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 At startup, a unique UUID-based <span className="bg-black text-[#ff2a85] px-1 py-0.5 font-mono text-xs border border-black uppercase font-bold">SystemKey</span> is generated. The Axum proxy strictly requires all incoming requests to provide this key as a Bearer token in the Authorization header. This prevents unauthorized SSRF attacks on localhost.
 </p>
 <div className="border-[3px] border-black bg-black flex flex-col">
 <div className="border-b-[3px] border-black p-2 flex flex-col md:flex-row items-center justify-between bg-[#fde047]">
 <div className="flex gap-2">
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 </div>
 <span className="font-display font-black text-[10px] uppercase tracking-widest text-black">Terminal</span>
 </div>
 <pre className="font-mono text-sm leading-relaxed text-[#00e676] overflow-x-auto p-6 font-bold">
export OPENAI_BASE_URL=http://localhost:8787/v1{`\n`}
export OPENAI_API_KEY=&lt;System_API_Key&gt;
 </pre>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Shuffle className="w-6 h-6 text-[#fde047]" />
 Model Inference & Fallback
 </h2>
 
 {/* Mermaid Diagram injected via pre/code for standard markdown support if no Mermaid React component exists */}
 <div className="border-[3px] border-black p-4 md:p-6 bg-[#fcf6e6] space-y-4">
 <p className="text-sm font-medium mb-6">
 The router determines the target provider by inspecting the requested model string, aliasing it if necessary, and cascading if the primary upstream fails.
 </p>
 <pre className="language-mermaid text-sm font-mono p-4 border-[3px] border-black bg-black text-[#00e676] overflow-x-auto">
{`%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#000', 'primaryTextColor': '#00e676', 'primaryBorderColor': '#00e676', 'lineColor': '#fff', 'fontFamily': 'monospace' }}}%%
graph TD
 A[Client Request] -->|System API Key| B[Axum Proxy Port 8787]
 B --> C{Check Cache/Health}
 C -->|HTTP 429 Trip| D[Circuit Breaker: Open]
 C -->|Healthy| E[Primary Model Inference]
 E -->|Fail| F[Cascade Fallback Router]`}
 </pre>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Activity className="w-6 h-6 text-[#ff2a85]" />
 Rate-Limiting Circuit Breaker
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 The proxy maintains a health state (Closed, Open, HalfOpen) for every API key in the vault. 
 If an upstream returns <span className="bg-black text-[#ff6d00] px-1 py-0.5 font-mono text-xs border border-black uppercase font-bold">HTTP 429</span> or 5xx, it trips the circuit and applies exponential backoff starting at 60s. <span className="bg-black text-[#ff2a85] px-1 py-0.5 font-mono text-xs border border-black uppercase font-bold">HTTP 401</span> trips the circuit for 300s. The <code>QuotaMap</code> intercepts rate-limit headers (like <code>x-ratelimit-remaining-requests</code>) to select the "best key" with the highest remaining tokens for your next request.
 </p>
 </section>
 </div>
 );
}
