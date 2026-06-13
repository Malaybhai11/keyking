import React from "react";
import { Play } from "lucide-react";

export default function TutorialProxyPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Proxy Setup Tutorial
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#00f0ff] pl-4">
 Learn how to slam any local Python or Node.js script straight through the KeyKing Axum Proxy in under 60 seconds. No excuses.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Play className="w-6 h-6 text-[#00e676]" />
 Step-by-Step
 </h2>
 <div className="space-y-6">
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] ">
 <h3 className="font-display font-black text-xl uppercase mb-2 flex items-center gap-2">
 <span className="bg-[#fde047] text-black px-2 py-0.5 border-2 border-black">1</span>
 Start the Proxy
 </h3>
 <p className="text-sm font-medium ">Fire up the KeyKing Desktop App. Make sure the "Proxy Running" indicator is blazing green. It violently binds to port <span className="bg-black text-[#00e676] px-1 py-0.5 font-mono text-xs border border-black uppercase font-bold">8787</span> by default.</p>
 </div>
 
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] ">
 <h3 className="font-display font-black text-xl uppercase mb-2 flex items-center gap-2">
 <span className="bg-[#00f0ff] text-black px-2 py-0.5 border-2 border-black">2</span>
 Copy System Key
 </h3>
 <p className="text-sm font-medium ">Navigate to the Dashboard. Click the "Copy System Key" button. This is your local authentication token.</p>
 </div>

 <div className="border-[3px] border-black bg-[#fcf6e6] p-6">
 <h3 className="font-display font-black text-xl uppercase mb-4 flex items-center gap-2">
 <span className="bg-[#ff2a85] text-white px-2 py-0.5 border-2 border-black">3</span>
 Point your code to Localhost
 </h3>
 
 <div className="border-[3px] border-black bg-black flex flex-col">
 <div className="border-b-[3px] border-black p-2 flex items-center justify-between bg-[#00e676]">
 <div className="flex gap-2">
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 </div>
 <span className="font-display font-black text-[10px] uppercase tracking-widest text-black">Terminal</span>
 </div>
 <pre className="font-mono text-sm bg-black text-[#00e676] p-6 font-bold overflow-x-auto">
export OPENAI_BASE_URL=http://localhost:8787/v1{`\n`}
export OPENAI_API_KEY=&lt;YOUR_SYSTEM_KEY&gt;{`\n`}
python test.py
 </pre>
 </div>
 </div>
 </div>
 </section>
 </div>
 );
}
