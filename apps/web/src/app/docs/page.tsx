"use client";

import React, { useState } from "react";
import { 
  NeoButton, 
  NeoCard, 
  NeoBadge 
} from "@/components/NeoBrutalist";
import { 
  Terminal, 
  Cpu, 
  Lock, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function Docs() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <main className="min-h-screen bg-[#f4f4f0] selection:bg-[#ff2a85] selection:text-white font-sans text-black pb-24 overflow-x-hidden">
      {/* NAVBAR */}
      <header className="max-w-7xl mx-auto px-4 md:px-8 pt-3 pb-1">
        <nav className="flex items-center justify-between border-[3px] border-black bg-white rounded-none py-2.5 px-4 shadow-[4px_4px_0px_0px_#000] sticky top-4 z-50">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-[#fde047] text-black border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                <img src="/finalKK.png" alt="KeyKing Logo" className="h-8 w-auto block select-none" />
              </div>
              <span className="font-display font-black text-xl uppercase tracking-tight hidden sm:inline">
                KeyKing
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8 font-display font-bold uppercase text-xs tracking-wider">
            <Link href="/" className="hover:text-[#ff2a85] transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <a href="https://github.com/Malaybhai11/keyking/releases/latest" target="_blank" rel="noopener noreferrer">
              <NeoButton variant="pink" size="sm">
                Get Client
              </NeoButton>
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative pt-12 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="max-w-3xl">
            <NeoBadge variant="pink" className="mb-6">Documentation</NeoBadge>
            <h1 className="font-display font-black text-4xl sm:text-6xl tracking-tight leading-[0.95] uppercase mb-6">
              Configure Your <br />
              <span className="relative inline-block z-10 px-2 py-0.5 my-0.5">
                <span className="absolute inset-0 bg-[#00e676] border-[3px] border-black -skew-x-2 -rotate-1 -z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></span>
                Ecosystem
              </span>
            </h1>
            <p className="text-sm sm:text-base text-neutral-800 font-medium leading-relaxed mb-6">
              Feed our context rules into Cursor, Copilot, or your favorite LLM. Get up and running with KeyKing's Desktop Proxy and Serverless SDK in minutes.
            </p>
            <div className="flex gap-4">
              <Link href="/docs/pro">
                <NeoButton variant="dark" size="lg">
                  Docs For Nerds
                </NeoButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* DOCS CONTENT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LLM Context Download */}
          <div className="lg:col-span-3 mb-4">
            <NeoCard titleBar="AI CODING CONTEXT" variant="yellow" shadowSize="md">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <h3 className="font-display font-extrabold text-xl uppercase tracking-tight">Rules for your AI Assistants</h3>
                  <p className="text-sm text-black/80 font-medium">
                    Download this markdown file and add it to your project root as `.cursorrules` or feed it to your LLM context window. It teaches your AI how to automatically configure KeyKing proxies and the SDK.
                  </p>
                </div>
                <a href="/prompts/keyking-llm-rules.md" download>
                  <NeoButton variant="dark" size="lg" className="flex items-center gap-2 whitespace-nowrap">
                    <Download className="w-5 h-5" /> Download Rules.md
                  </NeoButton>
                </a>
              </div>
            </NeoCard>
          </div>

          <NeoCard titleBar="WORKFLOW 1" variant="green" shadowSize="md" className="flex flex-col">
            <div className="space-y-4 flex-1">
              <Terminal className="w-8 h-8" />
              <h3 className="font-display font-extrabold text-xl uppercase tracking-tight">Desktop Proxy</h3>
              <p className="text-xs text-black/80 font-medium">
                Perfect for local vibe-coding. Run the proxy and configure your environment to route traffic through localhost.
              </p>
              
              <div className="pt-4 space-y-2">
                <div className="font-display font-bold text-xs uppercase tracking-wider text-black/60">Export Variables</div>
                <div className="bg-black text-[#00e676] border-[3px] border-black p-3 pr-10 font-mono text-[11px] shadow-inner relative rounded-lg overflow-x-auto whitespace-nowrap">
                  <div className="mb-2">export OPENAI_BASE_URL=http://localhost:8787/v1</div>
                  <div>export OPENAI_API_KEY=sk-keyking</div>
                  <button 
                    onClick={() => copyToClipboard("export OPENAI_BASE_URL=http://localhost:8787/v1\nexport OPENAI_API_KEY=sk-keyking", "env")}
                    className="absolute top-2 right-2 p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition"
                  >
                    {copiedText === "env" ? <Check className="w-4 h-4 text-[#00e676]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </NeoCard>

          <NeoCard titleBar="WORKFLOW 2" variant="cyan" shadowSize="md" className="flex flex-col">
            <div className="space-y-4 flex-1">
              <Cpu className="w-8 h-8" />
              <h3 className="font-display font-extrabold text-xl uppercase tracking-tight">Serverless SDK</h3>
              <p className="text-xs text-black/80 font-medium">
                Install the NPM SDK and use your exported `vault.kk` file in production without needing a server.
              </p>
              
              <div className="pt-4 space-y-2">
                <div className="font-display font-bold text-xs uppercase tracking-wider text-black/60">NPM Install</div>
                <div className="bg-black text-[#00bdff] border-[3px] border-black p-3 pr-10 font-mono text-[11px] shadow-inner relative rounded-lg overflow-x-auto whitespace-nowrap">
                  <div>npm install keyking-sdk</div>
                  <button 
                    onClick={() => copyToClipboard("npm install keyking-sdk", "npm")}
                    className="absolute top-2 right-2 p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition"
                  >
                    {copiedText === "npm" ? <Check className="w-4 h-4 text-[#00bdff]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </NeoCard>

          <NeoCard titleBar="WORKFLOW 3" variant="pink" shadowSize="md" className="flex flex-col">
            <div className="space-y-4 flex-1">
              <Lock className="w-8 h-8 text-white" />
              <h3 className="font-display font-extrabold text-xl uppercase tracking-tight text-white">Desktop Vault</h3>
              <p className="text-xs text-white/90 font-medium">
                The control plane where you securely add API keys and export your deployment vaults.
              </p>
              
              <div className="pt-4 space-y-2">
                <div className="font-display font-bold text-xs uppercase tracking-wider text-white/60">Generate Vault</div>
                <div className="bg-white text-[#ff2a85] border-[3px] border-white p-3 pr-10 font-mono text-[11px] shadow-inner relative rounded-lg overflow-x-auto whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" /> Export from Keys Tab
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Check className="w-4 h-4 shrink-0" /> Save as vault.kk
                  </div>
                </div>
              </div>
            </div>
          </NeoCard>

        </div>
      </section>
    </main>
  );
}
