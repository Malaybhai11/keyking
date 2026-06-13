import React from "react";
import { Activity } from "lucide-react";

export default function RateLimitsPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Rate Limit Bypassing
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#ff2a85] pl-4">
 Stop worrying about 429 errors. KeyKing routes around them automatically.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Activity className="w-6 h-6 text-[#ff6d00]" />
 The QuotaMap
 </h2>
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] space-y-4">
 <p className="text-sm font-medium ">
 Every time an API request completes, the provider returns headers like <code>x-ratelimit-remaining-requests</code>. KeyKing intercepts these headers to track the exact capacity of every key.
 </p>
 <p className="text-sm font-medium ">
 When you make a new request, KeyKing sorts the available keys by remaining capacity, ensuring you always use the key least likely to fail. If a key hits 0 capacity, the circuit trips for a cool-down period.
 </p>
 </div>
 </section>
 </div>
 );
}
