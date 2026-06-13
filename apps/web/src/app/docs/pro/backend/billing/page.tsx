import React from "react";
import { CreditCard, AlertTriangle } from "lucide-react";

export default function BackendBillingPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Billing & Quotas
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#fde047] pl-4">
 The Control Plane tightly integrates with Stripe to manage Ultra tier subscriptions and enforces machine limits securely via server-side validations.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <CreditCard className="w-6 h-6 text-[#ff2a85]" />
 Tier-Based Machine Limits
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 Free tier users are mathematically restricted by the Control Plane to registering a maximum of <strong>2 machines</strong>. If a user attempts to register a 3rd machine, the <code>/machines/register</code> endpoint returns an HTTP 403 error and explicitly provides an <code>upgrade_url</code> routing them to the Stripe checkout.
 </p>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <CreditCard className="w-6 h-6 text-[#00f0ff]" />
 Stripe Integration
 </h2>
 <div className="border-[3px] border-black bg-[#fcf6e6] p-4 md:p-6 space-y-4">
 <ul className="list-disc pl-4 space-y-2 text-sm font-medium ">
 <li><strong>Checkout (<code>/billing/checkout</code>):</strong> Creates a Stripe session in subscription mode using the predefined <code>price_keyking_ultra</code> ID.</li>
 <li><strong>Webhooks (<code>/billing/webhook</code>):</strong> Validates Stripe event signatures securely to intercept <code>checkout.session.completed</code> events and automatically upgrade users to the Ultra tier instantly.</li>
 <li><strong>Portal (<code>/billing/portal</code>):</strong> Seamless pass-through to the official Stripe Customer Portal for subscription management.</li>
 </ul>
 </div>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <AlertTriangle className="w-6 h-6 text-[#ff6d00]" />
 Anomaly Detection
 </h2>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed">
 The Control Plane monitors the telemetry stream for suspicious usage spikes or security anomalies flagged for a user's keys. These are surfaced via the <code>/anomaly/{"{user_id}"}</code> feed and can be resolved using a dedicated patch endpoint.
 </p>
 </section>
 </div>
 );
}
