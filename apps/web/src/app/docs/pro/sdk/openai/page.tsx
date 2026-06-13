import React from "react";
import { Cpu } from "lucide-react";

export default function SDKOpenAIPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 OpenAI Wrapper & Translation
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#00e676] pl-4">
 The SDK acts as a true drop-in replacement client with an interface identical to OpenAI's. You do not need to learn a new API to use KeyKing.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Cpu className="w-6 h-6 text-[#ff6d00]" />
 Native Format Translation
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 You can send standard OpenAI-formatted messages and tools to non-OpenAI providers. The SDK automatically translates standard OpenAI chat roles (including <code>system</code> and <code>developer</code>) into the specific data structures required by Anthropic, Gemini, or Groq on the fly.
 </p>
 
 <div className="border-[3px] border-black bg-black p-6 relative group">
 <div className="absolute top-0 right-0 bg-[#00e676] text-black px-3 py-1 font-display font-bold text-[10px] uppercase tracking-widest border-l-[3px] border-b-[3px] border-black">
 TypeScript
 </div>
 <pre className="font-mono text-sm leading-relaxed text-[#eaeaea] overflow-x-auto pt-4">
<span className="text-neutral-500 italic">// Even though the model is Anthropic, use standard OpenAI format.</span>{`\n`}
<span className="text-[#ff2a85] font-bold">const</span> response = <span className="text-[#ff2a85] font-bold">await</span> keyking.chat.completions.create({`{\n`}
 model: <span className="text-[#00e676]">"claude-3-opus"</span>,{`\n`}
 messages: [{`\n`}
 {`{ role: `}<span className="text-[#00e676]">"system"</span>{`, content: `}<span className="text-[#00e676]">"You are a helpful assistant."</span>{` },\n`}
 {`{ role: `}<span className="text-[#00e676]">"user"</span>{`, content: `}<span className="text-[#00e676]">"Explain quantum computing."</span>{` }\n`}
 ]{`\n`}
 {"});"}
 </pre>
 </div>
 </section>

 <section className="border-[3px] border-[#ff2a85] bg-[#ff2a85]/10 p-6 rounded-none">
 <h3 className="font-display font-black uppercase text-[#ff2a85] mb-2">No Global Monkey-Patching</h3>
 <p className="text-sm font-medium text-black ">
 Unlike older proxy SDKs, KeyKing <strong>does not</strong> override <code>globalThis.fetch</code> globally, nor does it dangerously patch the official <code>openai</code> NPM package prototype. It executes HTTP requests using the native <code>fetch</code> API directly to the provider endpoints, injecting the decrypted API keys locally.
 </p>
 </section>

 </div>
 );
}
