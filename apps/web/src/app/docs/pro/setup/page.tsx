import React from "react";
import { Download, Terminal } from "lucide-react";

export default function SetupPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Installation
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#fde047] pl-4">
 Forget broken dependencies and tedious setups. Our universal installation script forces a seamless, aggressive cross-platform installation. It dynamically detects your OS and architecture, slamming the correct Rust Tauri release onto your machine in seconds.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Terminal className="w-6 h-6 text-[#00e676]" />
 Universal Script
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 Paste this into your terminal and let it rip. It handles everything unconditionally: provisioning workspaces, tearing down the binary, writing the default config to <code>~/.config/keyking/config.json</code>, and forcing the binary onto your PATH. No questions asked.
 </p>
 
 <div className="relative group mt-4">
 <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#00e676_10px,#00e676_20px)] translate-x-3 translate-y-3 border-[3px] border-black"></div>
 <div className="relative border-[3px] border-black bg-black flex flex-col">
 <div className="border-b-[3px] border-black p-2 flex items-center justify-between bg-[#fde047]">
 <div className="flex gap-2">
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 <div className="w-3 h-3 border-[2px] border-black bg-white"></div>
 </div>
 <span className="font-display font-black text-[10px] uppercase tracking-widest text-black">Bash</span>
 </div>
 <pre className="font-mono text-sm leading-relaxed text-[#00e676] overflow-x-auto p-6 font-bold">
curl -fsSL https://keyking.ledgion.in/install.sh | bash
 </pre>
 </div>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Download className="w-6 h-6 text-[#ff2a85]" />
 Robust Fallback Resolution
 </h2>
 <div className="border-[3px] border-black bg-[#fcf6e6] p-4 md:p-6">
 <ul className="space-y-4 text-sm font-medium list-disc pl-4">
 <li>Relentlessly targets the exact requested release via the GitHub API.</li>
 <li>Ruthlessly falls back to the <code>latest</code> release if the tag goes missing.</li>
 <li>Scavenges local build directories if you're offline or remote files dare to fail.</li>
 <li>Aggressively prefers user-local directories (<code>~/.local/bin</code>), escalating to global sudo only when absolutely necessary.</li>
 </ul>
 </div>
 </section>
 </div>
 );
}
