import React from "react";
import { GitMerge } from "lucide-react";

export default function ArchitecturePage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 System Architecture
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#9d4edd] pl-4">
 A brutal dissection of our system architecture. Watch how the Vault, Proxy, and SDK orchestrate a flawless, unstoppable API interception pipeline.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <GitMerge className="w-6 h-6 text-[#00f0ff]" />
 The Flow
 </h2>
 
 <div className="flex flex-col gap-4 font-mono text-sm uppercase tracking-wider font-bold">
 <div className="border-[3px] border-black p-6 bg-[#fde047] text-black shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear">
 <span className="block text-[#ff2a85] mb-1">01 / Storage Layer</span>
 <span className="text-xs font-medium normal-case font-body">Your keys are locked down in a `.kk` encrypted vault on disk using military-grade PBKDF2/AES-GCM. Unbreakable.</span>
 </div>
 <div className="border-[3px] border-black p-6 bg-[#00f0ff] text-black shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear">
 <span className="block text-[#ff2a85] mb-1">02 / Interception Layer</span>
 <span className="text-xs font-medium normal-case font-body">The ultra-fast Axum Proxy (`localhost:8787`) acts as the absolute gateway, hijacking your normal OpenAI API calls with ruthless efficiency.</span>
 </div>
 <div className="border-[3px] border-black p-6 bg-[#ff2a85] text-white shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear">
 <span className="block text-[#fde047] mb-1">03 / Translation Layer</span>
 <span className="text-xs font-medium normal-case font-body">Standard OpenAI payloads are ripped apart and violently mutated into provider-specific schemas (like Anthropic XML) on the fly.</span>
 </div>
 <div className="border-[3px] border-black p-6 bg-[#00e676] text-black shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear">
 <span className="block text-[#ff2a85] mb-1">04 / Execution Layer</span>
 <span className="text-xs font-medium normal-case font-body">The request is fired natively at the provider. We devour rate limit headers and inject them back into our QuotaMap to ensure total domination of free tiers.</span>
 </div>
 </div>
 </section>
 </div>
 );
}
