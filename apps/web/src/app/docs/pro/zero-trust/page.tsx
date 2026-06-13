import React from "react";
import { Shield } from "lucide-react";

export default function ZeroTrustPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Zero-Trust Vault
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#00e676] pl-4">
 Keys belong to you, and only you. The vault ensures your secrets never leave your local environment.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Shield className="w-6 h-6 text-[#fde047]" />
 How It Works
 </h2>
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] space-y-4">
 <p className="text-sm font-medium ">
 We use a combination of PBKDF2 for key derivation and AES-GCM for symmetric encryption. This prevents offline dictionary attacks if someone steals your <code>vault.kk</code> file.
 </p>
 <p className="text-sm font-medium ">
 In the Desktop app, decryption is handled strictly in memory and keys are garbage collected immediately after use.
 </p>
 </div>
 </section>
 </div>
 );
}
