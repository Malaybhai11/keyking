import React from "react";
import { GitBranch } from "lucide-react";

export default function ContributingPage() {
 return (
 <div className="space-y-12">
 <div className="space-y-6">
 <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tighter text-black ">
 GitHub Contributions
 </h1>
 <p className="text-lg font-medium text-neutral-700 leading-relaxed border-l-[4px] border-[#00e676] pl-4">
 KeyKing is completely open source. We welcome PRs for new providers, better algorithms, and bug fixes.
 </p>
 </div>

 <section className="space-y-6">
 <h2 className="font-display font-black text-2xl uppercase text-black flex items-center gap-3">
 <GitBranch className="w-6 h-6 text-[#fde047]" />
 Getting Started
 </h2>
 <div className="border-[3px] border-black p-6 bg-[#fcf6e6] space-y-4">
 <p className="text-sm font-medium ">
 The codebase is a monorepo built using Turborepo.
 </p>
 <pre className="font-mono text-sm bg-black text-[#00e676] p-4 overflow-x-auto">
git clone https://github.com/Malaybhai11/keyking.git{`\n`}
cd keyking{`\n`}
npm install{`\n`}
npm run dev
 </pre>
 </div>
 </section>
 </div>
 );
}
