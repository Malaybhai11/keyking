import React from "react";
import { Zap, Activity } from "lucide-react";

export default function SDKRoutingPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Smart Routing & Quotas
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#ff6d00] pl-4">
 The SDK features a sophisticated, in-memory QuotaMap and Circuit Breaker that tracks rate limits across your entire vault in real-time to guarantee high availability.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Zap className="w-6 h-6 text-[#fde047]" />
 The Priority Ladder (Zero-Trust Fallbacks)
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 By default, the SDK automatically maps failing requests to equivalent models on other providers. But for production resilience, you can define an exact <strong>Priority Ladder</strong>. If the primary provider hits a 429 Rate Limit or 5xx Server Error, the SDK instantly cascades down your predefined chain of Provider-Model pairings.
 </p>
 
 <div className="border-[3px] border-black bg-black p-6 relative group">
 <div className="absolute top-0 right-0 bg-[#00f0ff] text-black px-3 py-1 font-display font-bold text-[10px] uppercase tracking-widest border-l-[3px] border-b-[3px] border-black">
 TypeScript
 </div>
 <pre className="font-mono text-sm leading-relaxed text-[#eaeaea] overflow-x-auto pt-4">
<span className="text-[#ff2a85] font-bold">const</span> keyking = <span className="text-[#ff2a85] font-bold">new</span> KeyKing({`{\n`}
  routingRules: [
    {`{ provider: `}<span className="text-[#00e676]">"Groq"</span>{`,      model: `}<span className="text-[#00e676]">"llama-3.3-70b-versatile"</span>{` },`}{`\n`}
    {`{ provider: `}<span className="text-[#00e676]">"Anthropic"</span>{`, model: `}<span className="text-[#00e676]">"claude-3-5-sonnet-20241022"</span>{` },`}{`\n`}
    {`{ provider: `}<span className="text-[#00e676]">"OpenAI"</span>{`,    model: `}<span className="text-[#00e676]">"gpt-4o"</span>{` }`}{`\n`}
  ]
{`});\n\n`}
<span className="text-[#ff2a85] font-bold">const</span> response = <span className="text-[#ff2a85] font-bold">await</span> keyking.chat.completions.create({`{\n`}
  model: <span className="text-[#00e676]">"any-model"</span>, <span className="text-neutral-500 italic">// Ignored when routingRules are set</span>{`\n`}
  messages: [{`{ role: `}<span className="text-[#00e676]">"user"</span>{`, content: `}<span className="text-[#00e676]">"Hello!"</span>{` }`}],{`\n`}
{`});\n\n`}
<span className="text-neutral-500 italic">// Verify which provider handled the request</span>{`\n`}
console.log(response._keyking_provider); 
 </pre>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Activity className="w-6 h-6 text-[#ff2a85]" />
 Circuit Breaker
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 The SDK actively tracks rate-limit headers (like <code>x-ratelimit-remaining-requests</code>) returned by providers. It uses an in-memory Circuit Breaker to temporarily quarantine keys that hit rate limits or return 401 Unauthorized errors for 5 minutes. The QuotaMap sorting algorithm strictly prioritizes keys with the highest remaining tokens/requests to optimize latency.
 </p>
 </section>

 </div>
 );
}
