import React from "react";
import { RefreshCcw, Fingerprint } from "lucide-react";

export default function BackendSyncPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Vault Syncing & Identity
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#9d4edd] pl-4">
 The Control Plane (FastAPI) manages machine identity and aggregates quota usage across your entire ecosystem.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Fingerprint className="w-6 h-6 text-[#00f0ff]" />
 Machine Fingerprinting
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 Every device running KeyKing generates a 64-character hex <code>machine_hash</code>. The Control Plane endpoint <code>/machines/register</code> validates this hash and deterministically generates an internal 16-character SHA-256 <code>machine_id</code> paired with your <code>user_id</code>. It strictly tracks metadata such as <code>registered_at</code>, <code>label</code>, and <code>last_seen</code>.
 </p>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed mt-4">
 The <code>/machines/verify</code> endpoint constantly validates whether a specific hash is authorized to communicate with the control plane, actively blocking devices marked as <code>is_revoked</code>.
 </p>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <RefreshCcw className="w-6 h-6 text-[#00e676]" />
 Quota Sync Service
 </h2>
 <div className="border-[3px] border-black bg-[#fcf6e6] p-4 md:p-6 space-y-4">
 <p className="text-sm font-medium ">
 Your local proxies are constantly executing API calls. To prevent you from flying blind, they report back to the Control Plane:
 </p>
 <ul className="list-disc pl-4 space-y-2 text-sm font-medium ">
 <li><strong>/quota/sync:</strong> Machines report usage payloads containing <code>machine_id</code>, <code>provider</code>, and exactly how many <code>remaining_requests</code> and <code>remaining_tokens</code> are left in real-time.</li>
 <li><strong>/quota/summary:</strong> Aggregates the synced quota usage history for your entire user account across all registered machines into a single unified dashboard view.</li>
 </ul>
 </div>
 </section>
 </div>
 );
}
