import React from "react";
import { Copy, Key } from "lucide-react";

export default function AppExportPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Exporting Vaults
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#ff2a85] pl-4">
 KeyKing securely bundles and exports your entire local vault as an encrypted text string that can be safely loaded into any serverless environment (Vercel Edge, Cloudflare Workers, etc.).
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Copy className="w-6 h-6 text-[#fde047]" />
 How to Export
 </h2>
 <div className="border-[3px] border-black bg-[#fcf6e6] p-6 space-y-4">
 <ol className="list-decimal pl-4 space-y-3 text-sm font-medium ">
 <li>Click the <strong>"Deploy to Serverless"</strong> button on the Provider Keys page in the Desktop App.</li>
 <li>You will be prompted to enter a custom <strong>Vault Password</strong>. This ensures your keys are strictly re-encrypted against this password before leaving the app.</li>
 <li>Click <strong>"Encrypt & Export"</strong>. The app returns a single encrypted base64-like string representing your entire vault.</li>
 </ol>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Key className="w-6 h-6 text-[#00e676]" />
 Serverless Usage
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 Paste the exported string into your serverless environment variables as <code>KEYKING_VAULT</code>, and the password you created as <code>KEYKING_PASSWORD</code>. The Node.js SDK will automatically detect these variables and lazily decrypt your vault in memory when your first API request is fired.
 </p>
 </section>
 </div>
 );
}
