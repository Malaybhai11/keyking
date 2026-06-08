"use client";

import React from "react";
import { NeoCard, NeoButton, NeoBadge } from "@/components/NeoBrutalist";

export default function CheckoutPage() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 bg-neo-bg">
      <div className="w-full max-w-3xl">
        <NeoCard variant="light" shadowSize="xl" className="p-8 md:p-14 text-center space-y-10 flex flex-col items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-center mb-4">
            <NeoBadge variant="pink" className="text-sm md:text-base px-4 py-2 scale-110 -rotate-2">
              🎉 SPECIAL LIMITED OFFER 🎉
            </NeoBadge>
          </div>
          
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase tracking-tighter leading-tight mt-0">
            You're In Luck!
          </h1>
          
          <div className="space-y-8 text-xl md:text-2xl font-medium border-y-[4px] border-black py-10 w-full relative bg-[#fcf6e6]">
            {/* Decorative dots/elements can go here if we had more context, but keeping it clean */}
            <p className="font-bold leading-relaxed px-4">
              We are giving <span className="bg-[#ff2a85] text-white px-3 py-1 border-[3px] border-black inline-block -rotate-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-2 hover:rotate-0 transition-transform">ULTRA ACCESS</span> to every new user, and you are one of them!
            </p>
            <div className="flex justify-center pt-4">
              <p className="font-mono font-bold text-sm md:text-lg bg-[#00f0ff] px-6 py-4 border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-1 hover:-rotate-1 transition-transform">
                {">>>"} Create your account to claim your upgrade.
              </p>
            </div>
          </div>
          
          <div className="pt-6 w-full flex justify-center">
            <NeoButton variant="green" size="lg" className="w-full md:w-auto text-xl md:text-2xl px-12 py-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
              Create Account to Claim
            </NeoButton>
          </div>
        </NeoCard>
      </div>
    </div>
  );
}
