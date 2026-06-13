import React from "react";
import { Lock, Shield, LayoutGrid } from "lucide-react";

export default function AppVaultPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Credential Management
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#ff2a85] pl-4">
 The Desktop Vault securely encrypts, stores, and manages your LLM API keys locally using an unbreakable Zero-Trust Cryptographic Pipeline.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Shield className="w-6 h-6 text-[#00f0ff]" />
 Zero-Trust Encryption Pipeline
 </h2>
 
 <div className="flex flex-col gap-3 font-mono text-xs uppercase tracking-widest font-bold my-8">
 <div className="border-[3px] border-black p-4 bg-[#fde047] text-black shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear">
 01 / Read Local Hardware Fingerprint
 </div>
 <div className="border-[3px] border-black p-4 bg-[#00f0ff] text-black shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear">
 02 / Derive PBKDF2 Key from System Salt
 </div>
 <div className="border-[3px] border-black p-4 bg-[#ff2a85] text-white shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:-translate-y-1 transition-all duration-75 ease-linear">
 03 / Encrypt Payload via AES-256-GCM
 </div>
 </div>
 
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 The raw keys are never stored in plaintext on disk. When decrypted in the desktop app, they exist strictly in memory and are garbage collected immediately.
 </p>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <LayoutGrid className="w-6 h-6 text-[#00e676]" />
 Supported Providers
 </h2>
 <div className="border-[3px] border-black bg-[#fcf6e6] p-6 hover:shadow-[8px_8px_0_0_#000] :shadow-[8px_8px_0_0_#00e676] transition-all duration-75 ease-linear">
 <p className="text-sm font-medium mb-6">
 The vault supports over 15+ native providers. It includes a built-in catalog of over 100+ free models (e.g., Mistral, Groq, Gemini) with estimated monthly free limits and direct dashboard links.
 </p>
 <div className="flex flex-wrap gap-3">
 {["OpenAI", "Groq", "Gemini", "Mistral", "Anthropic", "xAI", "DeepSeek", "OpenRouter", "Cohere", "Cerebras", "Sambanova", "Cloudflare", "Nvidia"].map(p => (
 <span key={p} className="bg-black text-[#fde047] border-[3px] border-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#ff2a85]">{p}</span>
 ))}
 </div>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Lock className="w-6 h-6 text-[#ff6d00]" />
 Key Validation
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 Click the Checkmark button next to any key in your vault table to execute an active ping to the provider. Instantly verify that the API key is active and has valid billing/permissions without writing a single line of code.
 </p>
 </section>
 </div>
 );
}
