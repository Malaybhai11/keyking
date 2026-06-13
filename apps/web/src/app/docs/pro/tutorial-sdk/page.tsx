import React from "react";
import { Package } from "lucide-react";

export default function TutorialSDKPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 SDK Integration Tutorial
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#ff2a85] pl-4">
 Stop messing with bloat. Learn how to ruthlessly deploy KeyKing to Vercel or AWS using our stripped-down, zero-dependency NPM package.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Package className="w-6 h-6 text-[#fde047]" />
 Step-by-Step
 </h2>
 <div className="space-y-6">
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] ">
 <h3 className="font-display font-black text-xl uppercase mb-2 flex items-center gap-2">
 <span className="bg-[#ff6d00] text-black px-2 py-0.5 border-2 border-black">1</span>
 Export the Vault
 </h3>
 <p className="text-sm font-medium ">Rip the vault out of the Desktop App. Smash "Deploy to Serverless", forge a password, and copy the encrypted payload.</p>
 </div>
 
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] ">
 <h3 className="font-display font-black text-xl uppercase mb-2 flex items-center gap-2">
 <span className="bg-[#9d4edd] text-white px-2 py-0.5 border-2 border-black">2</span>
 Set Environment Variables
 </h3>
 <p className="text-sm font-medium ">In Vercel, inject <span className="bg-black text-[#00e676] px-1 py-0.5 font-mono text-xs border border-black uppercase font-bold">KEYKING_VAULT</span> and <span className="bg-black text-[#00e676] px-1 py-0.5 font-mono text-xs border border-black uppercase font-bold">KEYKING_PASSWORD</span> into your project settings. Lock it down.</p>
 </div>

 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] ">
 <h3 className="font-display font-black text-xl uppercase mb-4 flex items-center gap-2">
 <span className="bg-[#ff2a85] text-white px-2 py-0.5 border-2 border-black">3</span>
 Install & Initialize
 </h3>
 <div className="border-[3px] border-black bg-black flex flex-col">
 <div className="border-b-[3px] border-black p-2 flex items-center justify-between bg-[#00f0ff]">
 <div className="flex gap-2">
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 </div>
 <span className="font-display font-black text-[10px] uppercase tracking-widest text-black">index.ts</span>
 </div>
 <pre className="font-mono text-sm leading-relaxed text-[#eaeaea] overflow-x-auto p-6 font-bold">
<span className="text-neutral-500 italic">// Terminal</span>{`\n`}
npm install keyking-sdk{`\n\n`}

<span className="text-neutral-500 italic">// Code</span>{`\n`}
<span className="text-[#ff2a85]">import</span> {`{ KeyKing }`} <span className="text-[#ff2a85]">from</span> <span className="text-[#00e676]">"keyking-sdk"</span>;{`\n`}
<span className="text-[#ff2a85]">const</span> keyking = <span className="text-[#ff2a85]">new</span> KeyKing(); <span className="text-neutral-500 italic">// Auto-loads from env</span>
 </pre>
 </div>
 </div>
 </div>
 </section>
 </div>
 );
}
