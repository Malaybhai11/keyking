"use client";

import React, { useState, useEffect } from "react";
import { NeoButton, NeoCard, NeoBadge } from "@/components/NeoBrutalist";
import { Download, Terminal, Check, Copy, Monitor, Apple, ArrowLeft, Command, Server } from "lucide-react";
import Link from "next/link";

export default function DownloadPage() {
  const [os, setOs] = useState<"windows" | "mac" | "linux" | "unknown">("unknown");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) setOs("windows");
    else if (userAgent.includes("mac")) setOs("mac");
    else if (userAgent.includes("linux")) setOs("linux");
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getCommandLine = () => {
    return os === "windows" 
      ? "iwr https://keyking.ledgion.in/install.ps1 -useb | iex"
      : "curl -fsSL https://keyking.ledgion.in/install.sh | bash";
  };

  const GITHUB_REPO = "Malaybhai11/keyking";
  
  const DOWNLOAD_LINKS = {
    windows: `https://github.com/${GITHUB_REPO}/releases/latest/download/keyking_windows_amd64.zip`,
    mac: `https://github.com/${GITHUB_REPO}/releases/latest/download/keyking_darwin_universal.tar.gz`,
    linux: `https://github.com/${GITHUB_REPO}/releases/latest/download/keyking_linux_amd64.tar.gz`,
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-body p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex justify-between items-center">
          <Link href="/" className="inline-block">
            <NeoButton variant="light" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </NeoButton>
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black font-display uppercase tracking-tighter">KEYKING</h1>
            <NeoBadge variant="pink">LATEST RELEASE</NeoBadge>
          </div>
        </header>

        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-black font-display uppercase tracking-tighter mb-6 leading-none">
            Get the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2a85] to-[#9d4edd] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">Proxy</span>
          </h2>
          <p className="text-xl font-medium max-w-2xl mx-auto border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Install the KeyKing Desktop app to start routing local LLM requests and manage your secure API vault.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* CLI Download Section */}
          <NeoCard title="Terminal Install (Recommended)" className="flex flex-col h-full bg-[#fde047]">
            <div className="flex-1 mb-8">
              <p className="mb-6 text-sm font-medium">
                The fastest way to install KeyKing. Automatically configures your PATH and installs the correct binary for your system.
              </p>
              <div className="bg-black text-[#00e676] border-[3px] border-black p-4 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] relative select-all flex items-center justify-between gap-4">
                <span className="break-all">{getCommandLine()}</span>
                <button 
                  onClick={() => copyToClipboard(getCommandLine(), "cli")}
                  className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-700 transition shrink-0 cursor-pointer"
                  title="Copy command"
                >
                  {copiedText === "cli" ? <Check className="w-5 h-5 text-[#00e676]" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2">
                <Terminal className="w-4 h-4" /> Detected System: {os === "windows" ? "Windows" : os === "mac" ? "macOS" : "Linux"}
              </div>
            </div>
          </NeoCard>

          {/* Direct Download Section */}
          <NeoCard title="Direct Download" className="flex flex-col h-full bg-white">
            <div className="flex-1 mb-8">
              <p className="mb-6 text-sm font-medium">
                Prefer to download the portable binaries manually? Grab the pre-compiled version for your operating system below.
              </p>
              
              <div className="flex flex-col gap-4">
                <a href={DOWNLOAD_LINKS.windows} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <NeoButton 
                    variant={os === "windows" ? "pink" : "light"} 
                    className="w-full flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Monitor className="w-5 h-5" /> Windows (x64)</span>
                    <Download className="w-5 h-5" />
                  </NeoButton>
                </a>
                
                <a href={DOWNLOAD_LINKS.mac} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <NeoButton 
                    variant={os === "mac" ? "cyan" : "light"} 
                    className="w-full flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Apple className="w-5 h-5" /> macOS (Universal)</span>
                    <Download className="w-5 h-5" />
                  </NeoButton>
                </a>

                <a href={DOWNLOAD_LINKS.linux} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <NeoButton 
                    variant={os === "linux" ? "green" : "light"} 
                    className="w-full flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Server className="w-5 h-5" /> Linux (amd64)</span>
                    <Download className="w-5 h-5" />
                  </NeoButton>
                </a>
              </div>
            </div>
          </NeoCard>
        </div>

      </div>
    </div>
  );
}
