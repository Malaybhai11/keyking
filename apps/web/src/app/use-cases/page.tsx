import React from "react";
import { ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Use Cases - KeyKing",
  description: "Real projects you can build with KeyKing.",
};

const BLUEPRINTS = [
  {
    id: "ai_sdr",
    title: "AI SDR SYSTEM",
    desc: "Complete SDR team that finds leads, personalizes outreach and books meetings on autopilot.",
    image: "/usecases/ai_sdr_dashboard_1781335928377.jpg",
    tags: ["12 NODES", "CLAUDE", "GMAIL", "SHEETS"],
    featured: true
  },
  {
    id: "customer_support",
    title: "AI CUSTOMER SUPPORT AGENT",
    desc: "Automate customer support with AI. Answer tickets, resolve issues and escalate when needed.",
    image: "/usecases/customer_support_inbox_1781335940456.jpg",
    tags: ["8 NODES", "OPENAI", "GMAIL", "ZENDESK"]
  },
  {
    id: "lead_gen",
    title: "LEAD GENERATION PIPELINE",
    desc: "Find, enrich and score leads automatically. Build targeted lists that convert.",
    image: "/usecases/lead_gen_pipeline_1781335951438.jpg",
    tags: ["10 NODES", "APOLLO", "SHEETS", "CLAUDE"]
  },
  {
    id: "youtube_factory",
    title: "YOUTUBE CONTENT FACTORY",
    desc: "End-to-end YouTube content automation. Research, write, edit and publish.",
    image: "/usecases/youtube_content_factory_1781335976197.jpg",
    tags: ["14 NODES", "GPT-4", "ELEVENLABS", "YOUTUBE"]
  },
  {
    id: "invoice_agent",
    title: "INVOICE PROCESSING AGENT",
    desc: "Extract invoice data, validate and sync with your accounting software.",
    image: "/usecases/invoice_processing_agent_1781335989475.jpg",
    tags: ["9 NODES", "OCR", "GOOGLE DRIVE", "XERO"]
  },
  {
    id: "meeting_notes",
    title: "MEETING NOTES AGENT",
    desc: "Join calls, take notes and extract action items automatically.",
    image: "/usecases/meeting_notes_agent_1781336001418.jpg",
    tags: ["6 NODES", "FIREO", "NOTION", "GOOGLE MEET"]
  },
  {
    id: "whatsapp_bot",
    title: "WHATSAPP SALES BOT",
    desc: "Automate sales conversations and qualify leads on WhatsApp.",
    image: "/usecases/whatsapp_sales_bot_1781336024140.jpg",
    tags: ["7 NODES", "WHATSAPP", "GPT-4"]
  }
];

export default function UseCasesPage() {
  const featured = BLUEPRINTS.find(b => b.featured);
  const regular = BLUEPRINTS.filter(b => !b.featured);

  return (
    <div className="min-h-screen bg-[#fcf6e6] text-black font-body overflow-x-hidden selection:bg-[#fde047] selection:text-black">
      
      {/* HEADER NAVBAR (Simplified, mimicking the mockup) */}
      <header className="border-b-[3px] border-black bg-white sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="bg-black text-white px-4 py-2 font-display font-black text-xl uppercase tracking-widest hover:bg-[#ff2a85] transition-colors">
            KEYKING
          </a>
          
          <div className="hidden md:flex items-center gap-8 font-display font-black text-sm uppercase">
            <a href="/use-cases" className="bg-[#fde047] border-[3px] border-black px-4 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">USE CASES</a>
            <a href="#" className="hover:underline">BLUEPRINTS</a>
            <a href="#" className="hover:underline">AGENTS</a>
            <a href="#" className="hover:underline">INTEGRATIONS</a>
            <a href="/#pricing" className="hover:underline">PRICING</a>
          </div>

          <div className="flex items-center gap-4">
            <a href="https://github.com/Malaybhai11/keyking" className="hidden sm:flex bg-white border-[3px] border-black px-4 py-1.5 font-display font-black text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all items-center gap-2">
              ☆ STAR 2.4K
            </a>
            <button className="bg-[#ff2a85] text-black border-[3px] border-black px-4 py-1.5 font-display font-black text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
              + SUBMIT YOUR PROJECT
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT SIDEBAR */}
          <aside className="w-full lg:w-[320px] lg:sticky lg:top-28 shrink-0">
            <h1 className="font-display font-black text-5xl xl:text-6xl uppercase tracking-tighter leading-none mb-6 text-black drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
              USE CASES
            </h1>
            <p className="font-mono text-lg mb-8 leading-relaxed font-semibold">
              Real projects you can build<br/>with KeyKing.
            </p>
            
            <button className="bg-black text-white font-display font-black uppercase text-sm tracking-widest px-6 py-4 flex items-center justify-between w-[280px] hover:bg-[#ff2a85] transition-colors border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group">
              <span>BROWSE ALL BLUEPRINTS</span>
              <ArrowUpRight className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>

            <div className="mt-16">
              <p className="font-display font-black text-sm uppercase mb-4 tracking-wider">TRUSTED BY 3,200+ BUILDERS</p>
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-300 overflow-hidden"><img src="https://i.pravatar.cc/100?img=11" alt="avatar" /></div>
                <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-300 overflow-hidden"><img src="https://i.pravatar.cc/100?img=12" alt="avatar" /></div>
                <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-300 overflow-hidden"><img src="https://i.pravatar.cc/100?img=13" alt="avatar" /></div>
                <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-300 overflow-hidden"><img src="https://i.pravatar.cc/100?img=14" alt="avatar" /></div>
                <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-300 overflow-hidden"><img src="https://i.pravatar.cc/100?img=15" alt="avatar" /></div>
                <div className="w-10 h-10 rounded-full border-2 border-black bg-white flex items-center justify-center font-bold text-[10px] z-10">+3.2K</div>
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT GRID */}
          <div className="flex-1 w-full space-y-8">
            
            {/* FEATURED CARD */}
            {featured && (
              <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col xl:flex-row relative group">
                <div className="absolute -top-4 left-4 bg-[#fde047] border-[3px] border-black px-3 py-1 font-display font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">
                  FEATURED
                </div>
                
                {/* Image Section */}
                <div className="w-full xl:w-2/3 border-b-[4px] xl:border-b-0 xl:border-r-[4px] border-black bg-gray-100 p-4 flex items-center justify-center overflow-hidden h-[300px] xl:h-[400px]">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover object-top border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]" />
                </div>
                
                {/* Content Section */}
                <div className="w-full xl:w-1/3 p-8 flex flex-col justify-between">
                  <div>
                    <h2 className="bg-black text-white inline-block px-3 py-1 font-display font-black text-2xl uppercase mb-6 tracking-tight">
                      {featured.title}
                    </h2>
                    <p className="font-mono text-[15px] leading-relaxed font-semibold mb-8">
                      {featured.desc}
                    </p>
                    
                    <div className="flex flex-wrap gap-3 mb-8 border-t-[2px] border-dashed border-black pt-6">
                      {featured.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 font-display font-black text-[11px] uppercase tracking-wider">
                          <span className="w-4 h-4 inline-flex items-center justify-center border-2 border-black rounded-full bg-[#00e676] text-[8px]">✤</span>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full bg-[#fde047] border-[3px] border-black font-display font-black text-lg uppercase py-4 flex items-center justify-between px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ff2a85] hover:text-white transition-colors group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <span>CLONE BLUEPRINT</span>
                    <ArrowUpRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            {/* REGULAR CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {regular.map(item => (
                <div key={item.id} className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:-translate-y-2 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all group">
                  <div className="border-b-[4px] border-black bg-gray-100 p-2 h-[220px] overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover object-top border-2 border-black" />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-display font-black text-lg uppercase mb-3 tracking-tight leading-tight">
                      {item.title}
                    </h3>
                    <p className="font-mono text-xs font-semibold leading-relaxed text-gray-700 mb-6 flex-1">
                      {item.desc}
                    </p>
                    <div className="flex items-end justify-between mt-auto">
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map(tag => (
                          <span key={tag} className="border-2 border-black px-2 py-0.5 font-display font-black text-[9px] uppercase tracking-wider bg-[#fcf6e6]">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button className="w-10 h-10 shrink-0 border-[3px] border-black flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-[#00e676] transition-colors ml-2">
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
