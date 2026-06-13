import React from "react";
import { Terminal, ShieldAlert } from "lucide-react";

export default function ClaudeCodePage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 Claude Code Wrapper
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#ff2a85] pl-4">
 Run Anthropic's powerful <code>claude-code</code> agent locally completely for free. KeyKing intercepts the CLI, blocks its cloud connections, and forces it through your local proxy pool.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <Terminal className="w-6 h-6 text-[#fde047]" />
 Zero-Config Interceptor
 </h2>
 <div className="border-[3px] border-black bg-black p-6 relative">
 <div className="flex items-center gap-6">
 <Terminal className="w-12 h-12 text-[#ff2a85] shrink-0" />
 <div>
 <div className="font-display font-bold text-[#fde047] text-xs uppercase tracking-widest mb-1">Terminal Command</div>
 <code className="font-mono text-white text-lg md:text-2xl font-bold">
 $ keyking-claude
 </code>
 </div>
 </div>
 </div>
 <p className="text-sm font-medium text-neutral-700 leading-relaxed mt-4">
 Simply type <code>keyking-claude</code> instead of <code>claude</code>. The wrapper automatically checks if Anthropic's CLI is installed and executes it inside a secure sub-process. All original arguments are transparently forwarded.
 </p>
 </section>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <ShieldAlert className="w-6 h-6 text-[#00e676]" />
 How The Interceptor Works
 </h2>
 <div className="border-[3px] border-black bg-[#fcf6e6] p-6 space-y-4">
 <ul className="list-disc pl-4 space-y-3 text-sm font-medium ">
 <li><strong>Local Proxy Redirection:</strong> Overrides <code>ANTHROPIC_BASE_URL</code> to <code>http://127.0.0.1:8787</code>.</li>
 <li><strong>Zero-Config Auth:</strong> Injects a placeholder <code>ANTHROPIC_API_KEY="kk-zero-config"</code>. KeyKing fulfills the request securely from the vault so your real keys are never exposed to the terminal session.</li>
 <li><strong>Cloud Bypass Prevention:</strong> Strips AWS credentials (<code>AWS_PROFILE</code>, <code>AWS_ACCESS_KEY_ID</code>) to prevent Claude Code from attempting to bypass the local proxy via Bedrock.</li>
 <li><strong>Provider Override:</strong> Forcefully injects CLI settings via <code>--settings</code> to explicitly disable Claude's native integrations for GCP Vertex and AWS Bedrock, guaranteeing traffic routes over standard REST APIs compatible with KeyKing.</li>
 <li><strong>Environment Isolation:</strong> Uses <code>exec</code> (Bash) and <code>setlocal</code> (Windows) to strictly confine overrides so your parent terminal session remains completely unaffected.</li>
 </ul>
 </div>
 </section>
 </div>
 );
}
