import React from "react";
import { Shuffle, ArrowDownUp } from "lucide-react";

export default function AppPriorityPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black">
          Priority Routing
        </h1>
        <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#ff6d00] pl-4">
          Take absolute control over your API fallbacks. The Desktop app lets you aggressively rank your provider preferences using a drag-and-drop interface, guaranteeing you only burn paid credits when your free tiers are entirely exhausted.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
          <ArrowDownUp className="w-6 h-6 text-[#00e676]" />
          Global Fallback Order
        </h2>
        
        <div className="flex flex-col gap-3 font-mono text-sm tracking-wider font-bold my-8">
          <div className="border-[3px] border-black p-3 md:p-4 bg-white text-black shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="bg-[#fde047] text-black border-2 border-black px-2 py-0.5">PRIORITY 1</span>
            <span className="text-black">Llama-3.3-70b-versatile (Groq - FREE)</span>
          </div>
          <div className="border-[3px] border-black p-3 md:p-4 bg-white text-black shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="bg-[#00f0ff] text-black border-2 border-black px-2 py-0.5">PRIORITY 2</span>
            <span className="text-black">Gemini-1.5-Pro (Google - FREE)</span>
          </div>
          <div className="border-[3px] border-black p-3 md:p-4 bg-black text-white shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="bg-[#ff2a85] text-white border-2 border-white px-2 py-0.5">PRIORITY 3</span>
            <span className="text-white">GPT-4o (OpenAI - PAID)</span>
          </div>
        </div>
        
        <p className="text-sm font-medium text-neutral-700 leading-relaxed">
          Navigate to the <strong>Priority</strong> page in the desktop app. You can drag and drop these models to forge your Global Fallback Order. The Axum Proxy enforces this strictly. 
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
          <Shuffle className="w-6 h-6 text-[#9d4edd]" />
          How The Router Recovers
        </h2>
        <div className="border-[3px] border-black bg-[#fcf6e6] p-4 md:p-6 shadow-[4px_4px_0_0_#000]">
          <p className="text-sm font-medium text-black mb-4">
            If <strong>Priority 1</strong> goes down due to a <span className="bg-black text-[#00e676] px-1 py-0.5 font-mono text-xs border border-black uppercase font-bold">HTTP 429</span> Rate Limit or a hard crash, traffic is instantly violently redirected to <strong>Priority 2</strong>.
          </p>
          <p className="text-sm font-medium text-black">
            The Circuit Breaker continues to ping Priority 1 in the background. The exact second Priority 1 is healthy again, traffic snaps back to the top of the chain to preserve your backup quotas.
          </p>
        </div>
      </section>
    </div>
  );
}
