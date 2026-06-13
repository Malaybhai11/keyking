"use client";

import React, { useState, useEffect } from "react";
import { NeoButton, NeoCard, NeoBadge } from "@/components/NeoBrutalist";
import { Download, Terminal, Check, Copy, Monitor, Apple, ArrowLeft, Server } from "lucide-react";
import Link from "next/link";

export default function DownloadPage() {
  const [os, setOs] = useState<"windows" | "mac" | "linux" | "unknown">("unknown");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string>("LATEST RELEASE");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) setOs("windows");
    else if (userAgent.includes("mac")) setOs("mac");
    else if (userAgent.includes("linux")) setOs("linux");

    // Fetch the absolute latest release tag from GitHub (bypassing any GitHub caching or pre-release issues)
    fetch("https://api.github.com/repos/Malaybhai11/keyking/releases")
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setLatestVersion(data[0].tag_name);
        }
      })
      .catch(err => console.error("Error fetching release:", err));
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
  
  // Create download link depending on the actual fetched latest version, fallback to /latest/
  const versionPath = latestVersion !== "LATEST RELEASE" ? `download/${latestVersion}` : "latest/download";

  const getDownloadLink = () => {
    if (os === "mac") return `https://github.com/${GITHUB_REPO}/releases/${versionPath}/keyking_darwin_universal.tar.gz`;
    if (os === "linux") return `https://github.com/${GITHUB_REPO}/releases/${versionPath}/keyking_linux_amd64.tar.gz`;
    return `https://github.com/${GITHUB_REPO}/releases/${versionPath}/keyking_windows_amd64.zip`;
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-body p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-4">
          <Link href="/" className="inline-block">
            <NeoButton variant="light" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </NeoButton>
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h1 className="text-2xl font-black font-display uppercase tracking-tighter">KEYKING</h1>
            <NeoBadge variant="pink">{latestVersion}</NeoBadge>
          </div>
        </header>

        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black font-display uppercase tracking-tighter mb-6 leading-none">
            Get the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2a85] to-[#9d4edd] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">Proxy</span>
          </h2>
          <p className="text-base sm:text-xl font-medium max-w-2xl mx-auto border-[3px] border-black bg-white p-3 sm:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
              <div className="bg-black text-[#00e676] border-[3px] border-black p-4 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] relative select-all flex items-start sm:items-center justify-between gap-4">
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
            <div className="flex-1 mb-8 flex flex-col justify-center">
              <p className="mb-6 text-sm font-medium text-center">
                Prefer to download the portable binaries manually? We've detected your OS and prepared the latest version for you.
              </p>
              
              <div className="flex flex-col gap-4 mt-4">
                <a href={getDownloadLink()} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <NeoButton 
                    variant="pink" 
                    size="lg"
                    className="w-full flex items-center justify-center gap-3 text-lg py-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {os === "mac" ? <Apple className="w-6 h-6" /> : os === "linux" ? <Server className="w-6 h-6" /> : <Monitor className="w-6 h-6" />} 
                    <span>Download Latest Release</span>
                    <Download className="w-6 h-6 ml-1" />
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
