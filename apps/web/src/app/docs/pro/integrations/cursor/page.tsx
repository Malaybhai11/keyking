import React from "react";
import { Terminal } from "lucide-react";

export default function CursorPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Cursor IDE Integration
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-black pl-4">
 Use your own aggregated API keys within Cursor to bypass their subscription limits.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Terminal className="w-6 h-6 text-[#00f0ff]" />
 Setup Instructions
 </h2>
 <div className="space-y-4">
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] ">
 <h3 className="font-display font-bold uppercase mb-2 ">1. Open Cursor Settings</h3>
 <p className="text-sm font-medium ">Navigate to Settings &gt; Models.</p>
 </div>
 
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] ">
 <h3 className="font-display font-bold uppercase mb-2 ">2. Set Custom OpenAI Base URL</h3>
 <p className="text-sm font-medium ">Enable "Override OpenAI Base URL" and enter <code>http://localhost:8787/v1</code></p>
 </div>

 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] ">
 <h3 className="font-display font-bold uppercase mb-2 ">3. Enter System Key</h3>
 <p className="text-sm font-medium ">Paste your KeyKing <code>SystemKey</code> into the OpenAI API Key field. Cursor will now route all chat requests through your local proxy.</p>
 </div>
 </div>
 </section>
 </div>
 );
}
