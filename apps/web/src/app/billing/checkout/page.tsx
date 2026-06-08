"use client";

import React, { useState, useEffect } from "react";
import { NeoCard, NeoBadge } from "@/components/NeoBrutalist";
import { Copy, Check } from "lucide-react";

export default function CheckoutPage() {
  const [isWindows, setIsWindows] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    setIsWindows(navigator.userAgent.toLowerCase().includes("win"));
  }, []);

  const installCommand = isWindows 
    ? "iwr https://keyking.ledgion.in/install.ps1 -useb | iex" 
    : "curl -fsSL https://keyking.ledgion.in/install.sh | bash";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText("install");
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center justify-center p-6 bg-neo-bg">
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
            <p className="font-bold leading-relaxed px-4">
              We are giving <span className="bg-[#ff2a85] text-white px-3 py-1 border-[3px] border-black inline-block -rotate-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-2 hover:rotate-0 transition-transform">ULTRA ACCESS</span> to every new user, and you are one of them!
            </p>
            <div className="flex justify-center pt-4 w-full px-4 md:px-8">
              <div 
                className="relative group w-full cursor-pointer flex" 
                onClick={() => copyToClipboard(installCommand)}
                title="Click to copy"
              >
                <div className="w-full flex items-center justify-between bg-black text-[#00f0ff] p-4 border-[3px] border-black font-mono text-sm md:text-base shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-active:translate-y-1 group-active:translate-x-1 group-active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <span className="truncate pr-4 text-left w-full">$ {installCommand}</span>
                  {copiedText === "install" ? (
                    <Check className="w-5 h-5 text-green-400 shrink-0" />
                  ) : (
                    <Copy className="w-5 h-5 text-white shrink-0 group-hover:text-[#ff2a85] transition-colors" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </NeoCard>
      </div>
    </div>
  );
}
