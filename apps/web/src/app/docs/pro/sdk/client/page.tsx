import React from "react";
import { Terminal, Shield } from "lucide-react";

export default function SDKClientPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Client Initialization
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#9d4edd] pl-4">
 The KeyKing Node.js SDK operates natively in Edge and serverless environments. It uses Zero-Trust Lazy Decryption to ensure your keys are never stored in plaintext memory until the exact moment a request is fired.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Shield className="w-6 h-6 text-[#00e676]" />
 Zero-Trust Lazy Decryption
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 The SDK derives a 256-bit encryption key from your password using PBKDF2 (100,000 iterations, SHA-256) combined with a 32-byte salt from your <code>vault.kk</code> payload. Decryption is performed purely in memory using the native Web Crypto API (<code>globalThis.crypto.subtle</code>), meaning zero heavy runtime dependencies.
 </p>
 
 <div className="border-[3px] border-black bg-black p-6 relative group">
 <div className="absolute top-0 right-0 bg-[#9d4edd] text-white px-3 py-1 font-display font-bold text-[10px] uppercase tracking-widest border-l-[3px] border-b-[3px] border-black">
 TypeScript
 </div>
 <pre className="font-mono text-sm leading-relaxed text-[#eaeaea] overflow-x-auto pt-4">
<span className="text-[#ff2a85] font-bold">import</span> {`{ KeyKing }`} <span className="text-[#ff2a85] font-bold">from</span> <span className="text-[#00e676]">"keyking-sdk"</span>;{`\n\n`}
<span className="text-neutral-500 italic">// Decrypts lazily on the first API call</span>{`\n`}
<span className="text-[#ff2a85] font-bold">const</span> keyking = <span className="text-[#ff2a85] font-bold">new</span> KeyKing({`{\n`}
 vault: process.env.KEYKING_VAULT,{`\n`}
 password: process.env.KEYKING_PASSWORD{`\n`}
{`});`}
 </pre>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Terminal className="w-6 h-6 text-[#ff6d00]" />
 Exposed Methods
 </h2>
 <ul className="space-y-4">
 <li className="border-[3px] border-black bg-[#fcf6e6] p-4">
 <code className="font-mono text-[#ff2a85] font-bold">keyking.chat.completions.create(request)</code>
 <p className="text-sm font-medium mt-2 ">Drop-in replacement for OpenAI. Supports standard params and Server-Sent Events (SSE) streaming for all providers.</p>
 </li>
 <li className="border-[3px] border-black bg-[#fcf6e6] p-4">
 <code className="font-mono text-[#ff2a85] font-bold">keyking.getProviders()</code>
 <p className="text-sm font-medium mt-2 ">Returns a Promise of all available providers present in the loaded vault.</p>
 </li>
 <li className="border-[3px] border-black bg-[#fcf6e6] p-4">
 <code className="font-mono text-[#ff2a85] font-bold">keyking.hasProvider(provider)</code>
 <p className="text-sm font-medium mt-2 ">Returns a boolean indicating if a specific provider's key is available.</p>
 </li>
 </ul>
 </section>

 </div>
 );
}
