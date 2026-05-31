"use client";

import React, { useState, useEffect } from "react";
import { 
  NeoButton, 
  NeoCard, 
  NeoBadge, 
  NeoInput 
} from "@/components/NeoBrutalist";
import { 
  Key, 
  Terminal, 
  ShieldAlert, 
  Zap, 
  ShieldCheck, 
  RotateCw, 
  Activity, 
  Copy, 
  Check, 
  ChevronRight, 
  HelpCircle, 
  Database,
  Cpu,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Layers,
  Lock,
  Crown,
  Star,
  X
} from "lucide-react";

export default function Home() {
  // Navigation & Interactive Tabs
  const [activeTab, setActiveTab] = useState<"curl" | "python" | "node" | "env" | "sdk">("curl");
  
  // Coming Soon Popup Modal State
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  // Playground Simulator State
  const [simState, setSimState] = useState<"idle" | "decrypting" | "routing" | "success" | "streaming">("idle");
  const [simOutput, setSimOutput] = useState<string>("");
  const [simLatency, setSimLatency] = useState<number | null>(null);
  const [simTokens, setSimTokens] = useState<number>(0);
  const [simRoute, setSimRoute] = useState<string>("");
  
  // FAQ toggles
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Copied utility states
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // System State simulation
  const [metricKeys, setMetricKeys] = useState(3);
  const [metricRequests, setMetricRequests] = useState(1280);
  const [metricSaved, setMetricSaved] = useState(48.20);
  const [systemKey, setSystemKey] = useState("kk-5a3d8f92b7c64e018d9f1c");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Run mock request simulation
  const triggerSimulation = () => {
    if (simState !== "idle") return;
    
    setSimState("decrypting");
    setSimOutput(">>> Initializing secure transaction...\n>>> Extracting system hardware UUID...\n>>> Deriving AES-256-GCM vault key (310,000 iterations PBKDF2)...");
    
    setTimeout(() => {
      setSimState("routing");
      setSimOutput(prev => prev + "\n>>> Successfully decrypted provider keys locally.\n>>> Querying QuotaMap for priority key selection...\n>>> Found valid OpenAI key with remaining token quota (38,209 tokens remaining).\n>>> Found valid Gemini key (rate limit: 60 RPM).\n>>> Routing to optimal provider: OpenAI (gpt-4o)...");
      setSimRoute("OpenAI");
    }, 1200);

    setTimeout(() => {
      setSimState("streaming");
      setSimLatency(184);
      setSimOutput(prev => prev + "\n>>> Connection established. Upstream response headers read:\n    x-ratelimit-remaining-requests: 29\n    x-ratelimit-remaining-tokens: 37900\n>>> Streaming response tokens:\n\n");
    }, 2400);

    // Simulate token streaming typing
    let tokenIndex = 0;
    const tokens = [
      "{\n",
      "  \"id\": \"chatcmpl-8F2jks0d28jns88\",\n",
      "  \"object\": \"chat.completion.chunk\",\n",
      "  \"created\": 1780149237,\n",
      "  \"model\": \"gpt-4o\",\n",
      "  \"choices\": [\n",
      "    {\n",
      "      \"index\": 0,\n",
      "      \"message\": {\n",
      "        \"role\": \"assistant\",\n",
      "        \"content\": \"Hello! I am Key King. Your zero-trust local proxy is fully operational!\"\n",
      "      },\n",
      "      \"finish_reason\": \"stop\"\n",
      "    }\n",
      "  ],\n",
      "  \"usage\": {\n",
      "    \"prompt_tokens\": 12,\n",
      "    \"completion_tokens\": 16,\n",
      "    \"total_tokens\": 28\n",
      "  }\n",
      "}"
    ];

    let interval: NodeJS.Timeout;
    setTimeout(() => {
      interval = setInterval(() => {
        if (tokenIndex < tokens.length) {
          setSimOutput(prev => prev + tokens[tokenIndex]);
          setSimTokens(prev => prev + (tokenIndex * 2 + 3));
          tokenIndex++;
        } else {
          clearInterval(interval);
          setSimState("success");
          setMetricRequests(prev => prev + 1);
          setMetricSaved(prev => prev + 0.04);
        }
      }, 80);
    }, 3200);
  };

  const resetSimulation = () => {
    setSimState("idle");
    setSimOutput("");
    setSimLatency(null);
    setSimTokens(0);
    setSimRoute("");
  };

  // Code templates
  const codeTemplates = {
    curl: `curl http://localhost:8787/v1/chat/completions \\
  -H "Authorization: Bearer ${systemKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7
  }'`,
    python: `import openai

client = openai.OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="${systemKey}"
)

completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(completion.choices[0].message.content)`,
    node: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://localhost:8787/v1",
  apiKey: "${systemKey}"
});

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(response.choices[0].message.content);`,
    env: `# Set environment variables to override standard SDK routing
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=${systemKey}`,
    sdk: `import { KeyKing } from "@keyking/sdk";

// Initialize KeyKing SDK with your exported vault
const kk = new KeyKing({ vaultPath: "./vault.kk" });

const response = await kk.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello from Serverless!" }],
});
console.log(response.choices[0].message.content);`
  };

  return (
    <div className="min-h-screen bg-[#fcf6e6] text-black pb-20 selection:bg-[#00f0ff] selection:text-black font-body overflow-x-hidden">
      
      <div className="bg-black text-white border-b-[4px] border-black py-2.5 overflow-hidden whitespace-nowrap font-display font-extrabold text-xs uppercase tracking-widest select-none">
        <div className="inline-block animate-[marquee_30s_linear_infinite] w-full">
          <span className="inline-flex items-center gap-4">
            <Sparkles className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
            <Crown className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
            <span>DESKTOP PROXY FOR VIBE-CODING</span>
            <Sparkles className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
            <span>SERVERLESS NPM SDK FOR PRODUCTION</span>
            <Sparkles className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
            <span>ZERO-TRUST DESKTOP VAULT</span>
            <Sparkles className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
            <span>DROP-IN OPENAI SDK COMPATIBLE</span>
            <Sparkles className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
            <span>DYNAMIC ROUTING & FALLBACK</span>
            <Sparkles className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
            <span>v4.0.0 STABLE RELEASES AVAILABLE NOW</span>
            <Sparkles className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
            <Crown className="w-3.5 h-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
          </span>
        </div>
      </div>

      {/* NAVBAR */}
      <header className="max-w-7xl mx-auto px-4 md:px-8 pt-3 pb-1">
        <nav className="flex items-center justify-between border-[3px] border-black bg-white rounded-none py-2.5 px-4 shadow-[4px_4px_0px_0px_#000] sticky top-4 z-50">
          <div className="flex items-center gap-3">
            <div className="bg-[#fde047] text-black border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
              <img src="/finalKK.png" alt="KeyKing Logo" className="h-8 w-auto block select-none" />
            </div>
            <span className="font-display font-black text-xl uppercase tracking-tight hidden sm:inline">
              KeyKing
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 font-display font-bold uppercase text-xs tracking-wider">
            <a href="#features" className="hover:text-[#ff2a85] transition-colors">Features</a>
            <a href="#playground" className="hover:text-[#ff2a85] transition-colors">cURL Playground</a>
            <a href="#pricing" className="hover:text-[#ff2a85] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#ff2a85] transition-colors">Developer FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowComingSoon(true)}
              className="text-xs font-display font-bold uppercase hover:underline hidden sm:inline pr-2 cursor-pointer bg-transparent border-none text-black"
            >
              Sign In
            </button>
            <a href="https://github.com/Malaybhai11/keyking/releases/latest" target="_blank" rel="noopener noreferrer">
              <NeoButton variant="pink" size="sm">
                Get Client
              </NeoButton>
            </a>
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-3 pb-8 lg:py-6 lg:min-h-[calc(100vh-140px)] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* HERO LEFT COLUMN */}
          <div className="lg:col-span-5 space-y-4 min-w-0">
            <div className="inline-flex">
              <NeoBadge variant="green" interactive className="text-[10px] tracking-widest font-mono">
                <Star className="w-3.5 h-3.5 fill-current" /> Will be trusted by 10k developers Soon,
              </NeoBadge>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-[54px] tracking-tight leading-[0.95] uppercase">
              The KeyKing <br />
              Developer <br />
              <span className="relative inline-block z-10 px-2 py-0.5 my-0.5">
                <span className="absolute inset-0 bg-[#fde047] border-[3px] border-black -skew-x-2 -rotate-1 -z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></span>
                Ecosystem
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-neutral-800 font-medium leading-relaxed max-w-xl">
              A comprehensive toolchain for secure LLM API access. Use the Desktop Proxy for local vibe-coding, deploy the NPM SDK to production, and manage everything securely in the Desktop Vault.
            </p>

            <div className="max-w-xl bg-black text-[#00e676] border-[3px] border-black p-2.5 font-mono text-[11px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative select-all flex items-center justify-between gap-3">
              <div className="truncate flex items-center gap-1.5">
                <span className="text-[#ff2a85] font-bold">$</span> 
                <span>curl -fsSL http://localhost:3000/install.sh | bash</span>
              </div>
              <button 
                onClick={() => copyToClipboard("curl -fsSL http://localhost:3000/install.sh | bash", "install")}
                className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-700 transition shrink-0 cursor-pointer"
                title="Copy installer command"
              >
                {copiedText === "install" ? <Check className="w-3.5 h-3.5 text-[#00e676]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <a href="https://github.com/Malaybhai11/keyking/releases/latest" target="_blank" rel="noopener noreferrer" className="inline-block">
                <NeoButton variant="green" size="md" shadowColor="dark" className="flex items-center gap-2">
                  <span>Download Desktop Client</span>
                  <ArrowRight className="w-4 h-4" />
                </NeoButton>
              </a>
              <a href="https://github.com/Malaybhai11/keyking" target="_blank" rel="noopener noreferrer" className="inline-block">
                <NeoButton variant="yellow" size="md" shadowColor="dark" className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-current text-black animate-pulse" />
                  <span>Star on GitHub</span>
                </NeoButton>
              </a>
              <a href="#playground">
                <NeoButton variant="light" size="md" shadowColor="dark" className="border-dashed">
                  Try cURL Playground
                </NeoButton>
              </a>
            </div>

            <div className="flex flex-wrap gap-4 pt-1.5 font-display font-black text-[10px] uppercase tracking-wide text-neutral-600">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0 text-black" /> No Cloud Storage</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0 text-black" /> Local Axum Proxy</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0 text-black" /> 9+ Model Providers</span>
            </div>
          </div>

        {/* HERO RIGHT COLUMN: HIGH FIDELITY DESKTOP APP MOCKUP */}
        <div className="lg:col-span-7 px-4 sm:px-8 py-8 min-w-0">
          <div className="relative">
          
          {/* Floating neo-brutalist callouts exactly like screenshot styling */}
          <div className="absolute -top-6 -left-6 z-20 hidden sm:block animate-bounce" style={{ animationDuration: '4s' }}>
            <div className="bg-[#ff2a85] text-white border-[3px] border-black font-display font-black text-xs uppercase tracking-wide px-3 py-1.5 shadow-[4px_4px_0px_0px_#000] flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-white text-white animate-pulse" /> PROXY RUNNING: PORT 8787
            </div>
          </div>

          <div className="absolute -bottom-6 -right-6 z-20 hidden sm:block">
            <div className="bg-[#9d4edd] text-white border-[3px] border-black font-display font-black text-xs uppercase tracking-wide px-3 py-1.5 shadow-[4px_4px_0px_0px_#000] rotate-[2.5deg] flex items-center gap-1.5">
              <Lock className="w-4 h-4 fill-white text-white" /> HARDWARE DERIVED VAULT
            </div>
          </div>

          {/* Browser Container Window */}
          <div className="border-[3px] border-black bg-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col font-mono text-xs w-full">
            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b-[3px] border-black bg-white select-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#ff5f56] rounded-full border border-black inline-block"></span>
                <span className="w-3 h-3 bg-[#ffbd2e] rounded-full border border-black inline-block"></span>
                <span className="w-3 h-3 bg-[#27c93f] rounded-full border border-black inline-block"></span>
              </div>
              <span className="font-display font-black text-xs uppercase text-black tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> KEYKING DESKTOP - v4.0.0
              </span>
              <div className="w-10"></div>
            </div>

            {/* Simulated Desktop App Body */}
            <div className="grid grid-cols-12 bg-[#121212] text-white min-h-[350px]">
              
              {/* Sidebar */}
              <div className="col-span-3 border-r border-neutral-800 p-3 space-y-4 text-[11px] text-neutral-400 font-sans hidden xl:block">
                <div className="space-y-1">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-neutral-600 px-2 py-1">Monitor</div>
                  <div className="flex items-center gap-2 bg-neutral-800 text-white px-2 py-1.5 rounded-sm cursor-pointer">
                    <Activity className="w-3.5 h-3.5 text-[#fde047]" /> Dashboard
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 hover:text-white transition-colors cursor-pointer">
                    <Key className="w-3.5 h-3.5" /> API Keys
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 hover:text-white transition-colors cursor-pointer">
                    <Terminal className="w-3.5 h-3.5" /> Routing Logs
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 hover:text-white transition-colors cursor-pointer font-bold text-[#ff2a85]">
                    <ShieldAlert className="w-3.5 h-3.5" /> Anomalies <span className="bg-[#ff2a85] text-white text-[8px] px-1 rounded-full">0</span>
                  </div>
                </div>
                
                <div className="space-y-1 pt-2">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-neutral-600 px-2 py-1">Setup</div>
                  <div className="flex items-center gap-2 px-2 py-1.5 hover:text-white transition-colors cursor-pointer">
                    <Cpu className="w-3.5 h-3.5" /> Machines
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 hover:text-white transition-colors cursor-pointer">
                    <Database className="w-3.5 h-3.5" /> Settings
                  </div>
                </div>
              </div>

              {/* Main Content Area inside app */}
              <div className="col-span-12 xl:col-span-9 p-4 space-y-4 flex flex-col justify-between">
                
                {/* Simulated Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <span className="font-display font-black text-sm uppercase text-[#fde047]">Dashboard Metrics</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-pulse"></span>
                    <span className="text-[10px] text-neutral-400">PROXY PORT: 8787</span>
                  </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-neutral-900 border border-neutral-800 p-2.5">
                    <span className="block text-neutral-500 text-[9px] uppercase">Active Keys</span>
                    <span className="block text-lg font-bold text-white font-mono">{metricKeys}</span>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 p-2.5">
                    <span className="block text-neutral-500 text-[9px] uppercase">Requests (24h)</span>
                    <span className="block text-lg font-bold text-[#00e676] font-mono">{metricRequests.toLocaleString()}</span>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 p-2.5">
                    <span className="block text-neutral-500 text-[9px] uppercase">Latency Savings</span>
                    <span className="block text-lg font-bold text-[#ff2a85] font-mono">-140ms</span>
                  </div>
                </div>

                {/* Key Status List */}
                <div className="bg-neutral-950 border border-neutral-850 p-2.5 rounded-sm font-mono text-[10px] space-y-1.5">
                  <div className="text-neutral-500 uppercase tracking-widest text-[8px] font-bold">Encrypted Providers</div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300">OpenAI (Primary)</span>
                    <span className="text-[#00e676] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> SECURE & ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300">Gemini (Fallback)</span>
                    <span className="text-[#00e676] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> SECURE & ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300">Groq (Smart Quota)</span>
                    <span className="text-[#00e676] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> SECURE & ACTIVE
                    </span>
                  </div>
                </div>

                {/* Simulated Logs Stream */}
                <div className="bg-black p-3 font-mono text-[9px] border border-neutral-850 rounded-sm space-y-1 min-h-[90px]">
                  <div className="text-neutral-500 flex items-center justify-between mb-1.5">
                    <span>LIVE DECISION LOGS</span>
                    <span className="text-[#00e676]">● ONLINE</span>
                  </div>
                  <div className="text-neutral-400 select-none">
                    <span className="text-neutral-600">[19:04:12]</span> <span className="text-neutral-500">POST /v1/chat/completion</span> ➔ Decrypted local OpenAI API key
                  </div>
                  <div className="text-neutral-400 select-none">
                    <span className="text-neutral-600">[19:04:13]</span> <span className="text-neutral-500">POST /v1/chat/completion</span> ➔ Route status: <span className="text-[#00e676]">200 OK</span> (OpenAI, 184ms)
                  </div>
                  <div className="text-[#ff2a85] select-none animate-pulse">
                    <span className="text-neutral-600">[19:12:01]</span> <span className="text-neutral-500">POST /v1/chat/completion</span> ➔ OpenAI 429 Quota Exhausted! Circuit Tripped.
                  </div>
                  <div className="text-[#00f0ff] select-none">
                    <span className="text-neutral-600">[19:12:01]</span> <span className="text-neutral-500">POST /v1/chat/completion</span> ➔ Executing fallback sequence: Mapping request ➔ Groq (llama-3.3)
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>

      </div>

      </section>

      {/* CORE VALUE PILLARS SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t-[4px] border-black">
        
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight">
            One Ecosystem, Three Powerful Workflows
          </h2>
          <p className="text-sm text-neutral-700 font-medium">
            Whether you are vibe-coding locally or scaling a serverless production app, KeyKing provides the ultimate infrastructure for LLM API security.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <NeoCard titleBar="LOCAL DEVELOPMENT" variant="green" hoverExpand shadowSize="md">
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <Terminal className="w-8 h-8 text-black" />
                <h3 className="font-display font-extrabold text-lg uppercase tracking-tight leading-tight">Desktop Proxy</h3>
                <p className="text-xs text-black/80 leading-relaxed font-medium">
                  Ideal for "Vibe-coding". Run the KeyKing local proxy that binds to <code>localhost:8787</code>. Route your local AI assistants and scripts through the proxy to automatically securely attach credentials and balance limits without exposing your plaintext API keys in dotfiles.
                </p>
              </div>
              <NeoBadge variant="dark" className="self-start mt-2">Localhost:8787</NeoBadge>
            </div>
          </NeoCard>

          <NeoCard titleBar="PRODUCTION DEPLOYMENT" variant="cyan" hoverExpand shadowSize="md">
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <Cpu className="w-8 h-8 text-black" />
                <h3 className="font-display font-extrabold text-lg uppercase tracking-tight leading-tight">Serverless SDK</h3>
                <p className="text-xs text-black/80 leading-relaxed font-medium">
                  Deploy to production with zero friction using <code>@keyking/sdk</code>. Purpose-built for serverless environments (Vercel, AWS Lambda, Cloudflare Workers). It natively unpacks exported encrypted vaults in memory, providing secure multi-provider routing on the edge.
                </p>
              </div>
              <NeoBadge variant="dark" className="self-start mt-2">NPM SDK</NeoBadge>
            </div>
          </NeoCard>

          <NeoCard titleBar="KEY MANAGEMENT" variant="yellow" hoverExpand shadowSize="md">
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <Lock className="w-8 h-8 text-[#ff2a85]" />
                <h3 className="font-display font-extrabold text-lg uppercase tracking-tight leading-tight">Desktop App Vault</h3>
                <p className="text-xs text-black/80 leading-relaxed font-medium">
                  Your mission control for credentials. Securely store and manage all your LLM API keys locally. Generate encrypted vault files that you can safely commit to your repository or bundle in your serverless deployments to be unpacked by the KeyKing SDK.
                </p>
              </div>
              <NeoBadge variant="dark" className="self-start mt-2">Zero-Trust AES-256</NeoBadge>
            </div>
          </NeoCard>

        </div>

      </section>

      {/* INTERACTIVE PLAYGROUND (cURL / SIMULATOR) */}
      <section id="playground" className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t-[4px] border-black">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left panel: Info & Trigger controls */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight leading-none">
              Interactive Proxy <br />
              <span className="relative inline-block z-10 px-1 py-0.5 my-1">
                <span className="absolute inset-0 bg-[#00e676] border-[3px] border-black -skew-x-2 -rotate-1 -z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></span>
                Playground
              </span>
            </h2>

            <p className="text-sm text-neutral-800 font-medium leading-relaxed">
              Experience the routing engine without downloading the desktop client. Switch between developer code integrations below, and click the simulation button to watch Key King's local proxy decrypt, select quotas, execute, and stream responses.
            </p>

            {/* Tabs Selector */}
            <div className="flex flex-col gap-2 font-display text-xs font-bold uppercase tracking-wider">
              {(["curl", "python", "node", "env", "sdk"] as const).map((tab) => {
                const label = {
                  curl: "cURL Command",
                  python: "OpenAI Python SDK",
                  node: "OpenAI Node.js SDK",
                  env: "Environment Setup",
                  sdk: "@keyking/sdk (NPM)"
                }[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-left p-3.5 border-[3px] border-black tracking-wide transition-all flex items-center justify-between cursor-pointer ${
                      activeTab === tab 
                        ? "bg-[#fde047] text-black shadow-[4px_4px_0px_0px_#000] -translate-x-[2px] -translate-y-[2px]"
                        : "bg-white text-neutral-600 hover:bg-neutral-50 shadow-[2px_2px_0px_0px_#000]"
                    }`}
                  >
                    <span>{label}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            {/* Sim trigger button */}
            <div className="pt-2">
              <NeoButton 
                variant="pink" 
                size="lg" 
                onClick={triggerSimulation} 
                disabled={simState !== "idle" && simState !== "success"}
                className="w-full flex items-center justify-center gap-3"
              >
                {simState === "idle" && (
                  <>
                    <Zap className="w-5 h-5 fill-white" />
                    <span>Send Test Request</span>
                  </>
                )}
                {simState === "decrypting" && (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin" />
                    <span>Decrypting Vault Key...</span>
                  </>
                )}
                {simState === "routing" && (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin" />
                    <span>Evaluating Upstream Quotas...</span>
                  </>
                )}
                {simState === "streaming" && (
                  <>
                    <Sparkles className="w-5 h-5 animate-bounce" />
                    <span>Streaming Tokens...</span>
                  </>
                )}
                {simState === "success" && (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Simulation Finished!</span>
                  </>
                )}
              </NeoButton>
              {simState === "success" && (
                <button 
                  onClick={resetSimulation} 
                  className="mt-2 text-xs font-bold font-display uppercase tracking-widest text-[#ff2a85] block mx-auto underline hover:text-black transition"
                >
                  Reset Simulator
                </button>
              )}
            </div>
          </div>

          {/* Right panel: Live Terminal and code preview */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Code Block Container */}
            <NeoCard titleBar={`CODE TEMPLATE // ${activeTab.toUpperCase()}`} variant="dark" shadowSize="md">
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(codeTemplates[activeTab], "code")}
                  className="absolute top-0 right-0 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded border border-neutral-700 transition flex items-center gap-1 text-[10px] font-sans"
                  title="Copy code"
                >
                  {copiedText === "code" ? <Check className="w-3.5 h-3.5 text-[#00e676]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText === "code" ? "Copied!" : "Copy"}
                </button>
                <pre className="font-mono text-xs text-neutral-300 overflow-x-auto pr-16 max-h-[220px] whitespace-pre leading-relaxed select-all">
                  {codeTemplates[activeTab]}
                </pre>
              </div>
            </NeoCard>

            {/* Sandbox Simulation Window */}
            <div className="flex-1 flex flex-col">
              <NeoCard titleBar="LOCAL PROXY STDOUT (SIMULATOR)" variant="dark" shadowSize="md" className="flex-1 flex flex-col min-h-[280px]">
                <div className="flex-1 flex flex-col justify-between font-mono text-xs">
                  
                  {/* Output content */}
                  <div className="space-y-2 whitespace-pre-wrap max-h-[300px] overflow-y-auto select-none text-neutral-300">
                    {simState === "idle" && (
                      <div className="text-neutral-500 italic py-10 text-center flex flex-col items-center gap-3">
                        <Terminal className="w-8 h-8 text-neutral-600 animate-pulse" />
                        <span>Ready. Trigger "Send Test Request" to begin transaction.</span>
                      </div>
                    )}
                    {simState !== "idle" && (
                      <div className="leading-relaxed text-[11px]">
                        {simOutput}
                      </div>
                    )}
                  </div>

                  {/* Transaction metadata */}
                  {simState !== "idle" && (
                    <div className="border-t border-neutral-800 pt-3 mt-4 flex flex-wrap items-center justify-between text-[10px] text-neutral-500">
                      <div className="flex items-center gap-4">
                        <span>ROUTE: <strong className="text-[#00f0ff]">{simRoute || "EVALUATING..."}</strong></span>
                        <span>LATENCY: <strong className="text-[#ff2a85]">{simLatency ? `${simLatency}ms` : "PENDING..."}</strong></span>
                        <span>TOKENS: <strong className="text-[#fde047]">{simTokens || 0}</strong></span>
                      </div>
                      <div>
                        {simState === "streaming" && <span className="text-[#00e676] animate-pulse">● STREAMING</span>}
                        {simState === "success" && <span className="text-[#00e676]">● COMPLETE</span>}
                      </div>
                    </div>
                  )}

                </div>
              </NeoCard>
            </div>

          </div>

        </div>

      </section>

      {/* PRICING GRID SECTION */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t-[4px] border-black">
        
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight">
            Transparent, developer-first billing
          </h2>
          <p className="text-sm text-neutral-700 font-medium">
            Deploy locally at no cost, or scale seamlessly with our enterprise Ultra subscription plan. Payment processing and subscription management are handled securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          
          {/* FREE PLAN */}
          <NeoCard titleBar="FREE WORKSPACE" variant="light" shadowSize="lg" hoverExpand>
            <div className="space-y-6 flex-1 flex flex-col justify-between p-2">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-display font-black text-2xl uppercase tracking-tight">Community Free</h3>
                  <p className="text-xs text-neutral-500 font-mono">LOCAL DEVELOPMENT ENVIRONMENT</p>
                </div>
                
                <div className="flex items-baseline gap-1 border-y-2 border-black py-4">
                  <span className="font-display font-black text-5xl">$0</span>
                  <span className="text-xs font-mono font-bold text-neutral-500 uppercase">/ forever</span>
                </div>

                <ul className="space-y-3 font-display font-bold text-xs uppercase tracking-wide">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Lock up to 2 API keys
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Register up to 2 machines
                  </li>
                  <li className="flex items-center gap-2 text-neutral-400">
                    <X className="w-4 h-4 text-neutral-400 shrink-0" /> Basic routing (no priorities)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Rate limit: 30 requests/minute
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Full AES-256-GCM local storage
                  </li>
                </ul>
              </div>

              <NeoButton variant="dark" shadowColor="none" className="w-full">
                Active on Installation
              </NeoButton>
            </div>
          </NeoCard>

          {/* ULTRA PLAN */}
          <NeoCard 
            titleBar={
              <span className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 fill-[#fde047] text-[#fde047]" /> KEYKING ULTRA // RECOMMENDED
              </span>
            } 
            variant="yellow" 
            shadowSize="xl" 
            hoverExpand
          >
            <div className="space-y-6 flex-1 flex flex-col justify-between p-2">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-2xl uppercase tracking-tight">Ultra Plan</h3>
                    <p className="text-xs text-neutral-600 font-mono">PRODUCTION-GRADE MANAGEMENT PLATFORM</p>
                  </div>
                  <NeoBadge variant="pink" className="shadow-[2px_2px_0px_0px_#000]">PREMIUM</NeoBadge>
                </div>
                
                <div className="flex items-baseline gap-1 border-y-2 border-black py-4">
                  <span className="font-display font-black text-5xl">$2</span>
                  <span className="text-xs font-mono font-bold text-neutral-700 uppercase">/ month</span>
                </div>

                <ul className="space-y-3 font-display font-bold text-xs uppercase tracking-wide">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Unlimited API keys & vault space
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Unlimited machine registrations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Smart prioritized quota routing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Unlimited request speed rates
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-black shrink-0" /> Instant fallback & circuit breaker protection
                  </li>
                </ul>
              </div>

              <a href="http://localhost:8000/billing/checkout" target="_blank" rel="noopener noreferrer" className="block w-full">
                <NeoButton variant="pink" className="w-full">
                  Upgrade to Ultra Tier
                </NeoButton>
              </a>
            </div>
          </NeoCard>

        </div>

      </section>

      {/* DEVELOPER FAQ SECTION */}
      <section id="faq" className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t-[4px] border-black">
        
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight">
            Developer FAQs
          </h2>
          <p className="text-sm text-neutral-700 font-medium">
            Detailed information regarding the local proxy security model, architecture, and subscription billing.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          
          {[
            {
              q: "Where are upstream API credentials stored?",
              a: "Your unencrypted credentials never leave your local environment. They are managed in the Desktop Vault and stored securely on your device, encrypted with AES-256-GCM using keys derived from your hardware fingerprint. When deploying to production using the Serverless SDK, you export a portable encrypted vault (vault.kk) locked with a separate deployment key, ensuring zero plaintext exposure in your cloud environments."
            },
            {
              q: "Does running the local proxy server introduce measurable latency?",
              a: "No. The local proxy is built using high-performance Rust libraries (Axum, Hyper, and Tokio). Under normal operating conditions, internal proxy overhead is less than one millisecond (<1ms). The overall response time is dominated by upstream API network latency."
            },
            {
              q: "How is subscription status verified if credentials remain local?",
              a: "Upon initialization, the desktop client generates a unique cryptographic hash of your hardware fingerprint to authenticate against our secure control plane. Subscription status is verified securely via payment processor webhooks. Your unencrypted API keys are never transmitted to or stored on our servers."
            },
            {
              q: "How are API rate limits and upstream outages handled?",
              a: "The proxy automatically parses rate-limit headers from upstream HTTP responses. If a 429 Too Many Requests status is detected or a quota is depleted, the internal circuit breaker for that key is tripped. The intelligent router immediately redirects subsequent requests to alternative active keys or fallbacks to other configured upstream providers."
            }
          ].map((faq, index) => (
            <div 
              key={index}
              className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full p-5 text-left font-display font-black uppercase text-sm flex items-center justify-between cursor-pointer"
              >
                <span>{faq.q}</span>
                <HelpCircle className={`w-5 h-5 transition-transform duration-200 ${openFaq === index ? "rotate-180 text-[#ff2a85]" : "text-neutral-500"}`} />
              </button>
              {openFaq === index && (
                <div className="p-5 pt-0 border-t-2 border-black/10 text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium">
                  {faq.a}
                </div>
              )}
            </div>
          ))}

        </div>

      </section>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 pt-8 border-t-[3px] border-black text-center flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-black text-white p-1 font-display font-black text-xs uppercase">
            KK
          </div>
          <p className="text-xs text-neutral-600 font-mono">
            © 2026 KeyKing Aggregator Engine. Licensed under MIT.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <NeoBadge variant="light">NEXT.JS 16</NeoBadge>
          <NeoBadge variant="light">TAILWIND CSS v4</NeoBadge>
          <NeoBadge variant="light">RUST ENCRYPTED</NeoBadge>
        </div>
      </footer>

      {/* COMING SOON POPUP MODAL */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <NeoCard 
            variant="yellow" 
            shadowSize="lg" 
            titleBar={
              <div className="flex items-center justify-between w-full">
                <span className="font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                  👑 BILLING & CHECKOUT
                </span>
              </div>
            }
            className="max-w-md w-full"
          >
            <div className="p-6 space-y-4">
              <p className="font-display font-black text-xl uppercase leading-tight text-black">
                Coming Soon Guys! <br />
                Please stay tuned.
              </p>
              <p className="text-xs sm:text-sm font-medium text-neutral-800 leading-relaxed">
                We are building the most secure hardware-derived SaaS subscription layer. Feel free to reach out for updates, requests, or early access suggestions!
              </p>
              
              {/* Contact Box */}
              <div className="bg-white border-2 border-black p-3.5 font-mono text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] select-all flex items-center justify-between gap-3 text-black">
                <div className="truncate flex items-center gap-1.5">
                  <span className="text-neutral-500">Mail:</span> 
                  <span className="font-bold select-all">malay@ledgion.in</span>
                </div>
                <button 
                  onClick={() => copyToClipboard("malay@ledgion.in", "email")}
                  className="p-1 hover:bg-neutral-100 text-neutral-600 hover:text-black rounded border border-neutral-350 transition shrink-0 cursor-pointer bg-white"
                  title="Copy email address"
                >
                  {copiedText === "email" ? <Check className="w-3.5 h-3.5 text-[#00e676]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <NeoButton 
                  variant="dark" 
                  size="sm" 
                  onClick={() => setShowComingSoon(false)}
                >
                  Got it, Thanks!
                </NeoButton>
              </div>
            </div>
          </NeoCard>
        </div>
      )}

    </div>
  );
}
