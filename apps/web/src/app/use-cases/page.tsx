"use client";

import React, { useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

export const metadata = {
  title: "Use Cases - KeyKing",
  description: "Real projects you can build with KeyKing.",
};

const BLUEPRINTS = [
  {
    id: "ai_sdr",
    title: "AI SDR SYSTEM",
    desc: "Complete SDR team that finds leads, personalizes outreach and books meetings on autopilot.",
    fullDesc: "The AI SDR System replaces an entire outbound sales team. It autonomously scrapes LinkedIn and Apollo for ideal customer profiles, enriches the data, and writes hyper-personalized cold emails. It reads replies, handles objections, and schedules meetings directly onto your calendar using KeyKing to proxy requests across GPT-4 and Claude 3.5 Sonnet for optimal cost.",
    image: "/usecases/ai_sdr_dashboard_1781335928377.jpg",
    tags: ["12 NODES", "CLAUDE", "GMAIL", "SHEETS"],
    featured: true
  },
  {
    id: "customer_support",
    title: "AI CUSTOMER SUPPORT AGENT",
    desc: "Automate customer support with AI. Answer tickets, resolve issues and escalate when needed.",
    fullDesc: "A 24/7 autonomous support agent that connects directly to Zendesk or Intercom. It reads historical documentation and previous closed tickets to instantly solve 80% of Tier 1 queries. If it detects an angry customer or a complex billing issue, it seamlessly hands the thread over to a human agent.",
    image: "/usecases/customer_support_inbox_1781335940456.jpg",
    tags: ["8 NODES", "OPENAI", "GMAIL", "ZENDESK"]
  },
  {
    id: "lead_gen",
    title: "LEAD GENERATION PIPELINE",
    desc: "Find, enrich and score leads automatically. Build targeted lists that convert.",
    fullDesc: "A massive data pipeline that continuously monitors the web for buying signals (like recent funding rounds or executive hires). It scores these leads from 1 to 100 based on your ICP criteria and pushes the highly qualified ones directly into your CRM, fully enriched with verified contact information.",
    image: "/usecases/lead_gen_pipeline_1781335951438.jpg",
    tags: ["10 NODES", "APOLLO", "SHEETS", "CLAUDE"]
  },
  {
    id: "youtube_factory",
    title: "YOUTUBE CONTENT FACTORY",
    desc: "End-to-end YouTube content automation. Research, write, edit and publish.",
    fullDesc: "An end-to-end content engine. You give it a niche or a seed keyword, and it researches trending topics, generates a high-retention video script, creates a storyboard, generates voiceovers using ElevenLabs, and packages the assets for your video editor. It even generates the thumbnail concepts and optimized SEO tags.",
    image: "/usecases/youtube_content_factory_1781335976197.jpg",
    tags: ["14 NODES", "GPT-4", "ELEVENLABS", "YOUTUBE"]
  },
  {
    id: "invoice_agent",
    title: "INVOICE PROCESSING AGENT",
    desc: "Extract invoice data, validate and sync with your accounting software.",
    fullDesc: "Watch a shared Google Drive folder for incoming PDF invoices. Using multimodal vision models, it extracts the vendor, line items, taxes, and totals regardless of the invoice layout. It cross-references the data with your purchase orders and automatically syncs the reconciled bill to Xero or QuickBooks.",
    image: "/usecases/invoice_processing_agent_1781335989475.jpg",
    tags: ["9 NODES", "OCR", "GOOGLE DRIVE", "XERO"]
  },
  {
    id: "meeting_notes",
    title: "MEETING NOTES AGENT",
    desc: "Join calls, take notes and extract action items automatically.",
    fullDesc: "A stealthy bot that joins your Google Meet or Zoom calls. It records the audio, generates a perfect transcript, and then uses a sophisticated LLM prompt to extract the core decisions, outstanding questions, and assigns action items to specific team members. Notes are instantly pushed to a shared Notion database.",
    image: "/usecases/meeting_notes_agent_1781336001418.jpg",
    tags: ["6 NODES", "FIREO", "NOTION", "GOOGLE MEET"]
  },
  {
    id: "whatsapp_bot",
    title: "WHATSAPP SALES BOT",
    desc: "Automate sales conversations and qualify leads on WhatsApp.",
    fullDesc: "Engage your customers where they spend the most time. This WhatsApp bot acts as a natural, conversational sales rep. It answers product questions, guides users through pricing tiers, securely collects lead information, and can even trigger payment links for instant checkout—all entirely automated.",
    image: "/usecases/whatsapp_sales_bot_1781336024140.jpg",
    tags: ["7 NODES", "WHATSAPP", "GPT-4"]
  }
];

export default function UseCasesPage() {
  const [selectedProject, setSelectedProject] = useState<typeof BLUEPRINTS[0] | null>(null);

  const featured = BLUEPRINTS.find(b => b.featured);
  const regular = BLUEPRINTS.filter(b => !b.featured);

  return (
    <div className="min-h-screen bg-[#fcf6e6] text-black font-body overflow-x-hidden selection:bg-[#fde047] selection:text-black relative">
      
      {/* POPUP MODAL */}
      {selectedProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-[4px] border-black p-4 bg-[#fde047] sticky top-0 z-10">
              <h2 className="font-display font-black text-xl md:text-2xl uppercase tracking-tight">
                {selectedProject.title}
              </h2>
              <button 
                onClick={() => setSelectedProject(null)}
                className="w-10 h-10 border-[3px] border-black bg-white hover:bg-[#ff2a85] hover:text-white flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Image */}
            <div className="border-b-[4px] border-black p-4 bg-gray-100 flex justify-center">
               <img src={selectedProject.image} alt={selectedProject.title} className="max-h-[300px] w-auto border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] object-contain" />
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 flex flex-col gap-6">
              <p className="font-mono text-base md:text-lg leading-relaxed font-semibold text-gray-800">
                {selectedProject.fullDesc}
              </p>
              
              <div className="flex flex-wrap gap-2 pt-2 border-t-[2px] border-dashed border-black mt-2">
                {selectedProject.tags.map(tag => (
                  <span key={tag} className="border-[2px] border-black px-3 py-1 font-display font-black text-xs uppercase tracking-wider bg-[#00e676]">
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA BLOCK */}
              <div className="mt-8 bg-[#ff2a85] text-white border-[4px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center gap-4">
                <h3 className="font-display font-black text-2xl md:text-3xl uppercase tracking-tight">
                  Want it built by the founder?
                </h3>
                <p className="font-mono font-bold text-sm md:text-base">
                  Skip the learning curve. Get a production-ready, custom-tailored version of this system deployed for your business.
                </p>
                <a 
                  href={`mailto:malay@ledgion.in?subject=Inquiry about ${selectedProject.title}`}
                  className="bg-black text-white px-8 py-4 font-display font-black text-lg md:text-xl uppercase tracking-widest border-[3px] border-black shadow-[4px_4px_0px_0px_#fde047] hover:-translate-y-1 transition-transform inline-block mt-2"
                >
                  Contact malay@ledgion.in
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER NAVBAR */}
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
            <button className="bg-[#ff2a85] text-black border-[3px] border-black px-2 py-1 sm:px-4 sm:py-1.5 font-display font-black text-[10px] sm:text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
              + SUBMIT YOUR PROJECT
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
          
          {/* LEFT SIDEBAR */}
          <aside className="w-full lg:w-[320px] shrink-0">
            <h1 className="font-display font-black text-5xl xl:text-6xl uppercase tracking-tighter leading-none mb-6 text-black drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
              USE CASES
            </h1>
            <p className="font-mono text-lg mb-8 leading-relaxed font-semibold">
              Real projects you can build<br/>with KeyKing.
            </p>
            
            <button className="bg-black text-white font-display font-black uppercase text-sm tracking-widest px-6 py-4 flex items-center justify-between w-full md:w-[280px] hover:bg-[#ff2a85] transition-colors border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group">
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

          {/* FEATURED CARD */}
          <div className="flex-1 w-full">
            {featured && (
              <div 
                onClick={() => setSelectedProject(featured)}
                className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col xl:flex-row relative group cursor-pointer"
              >
                <div className="absolute -top-4 left-4 bg-[#fde047] border-[3px] border-black px-3 py-1 font-display font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">
                  FEATURED
                </div>
                
                {/* Image Section */}
                <div className="w-full xl:w-2/3 border-b-[4px] xl:border-b-0 xl:border-r-[4px] border-black bg-gray-100 p-4 flex items-center justify-center overflow-hidden h-[200px] sm:h-[300px] xl:h-[400px]">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover object-top border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-transform duration-500" />
                </div>
                
                {/* Content Section */}
                <div className="w-full xl:w-1/3 p-8 flex flex-col justify-between">
                  <div>
                    <h2 className="bg-black text-white inline-block px-3 py-1 font-display font-black text-2xl uppercase mb-6 tracking-tight">
                      {featured.title}
                    </h2>
                    <p className="font-mono text-[15px] leading-relaxed font-semibold mb-8 line-clamp-3">
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
                  
                  <button className="w-full bg-[#fde047] border-[3px] border-black font-display font-black text-lg uppercase py-4 flex items-center justify-between px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-[#ff2a85] group-hover:text-white transition-colors pointer-events-none">
                    <span>VIEW PROJECT</span>
                    <ArrowUpRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* REGULAR CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {regular.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedProject(item)}
              className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:-translate-y-2 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all group cursor-pointer"
            >
              <div className="border-b-[4px] border-black bg-gray-100 p-2 h-[220px] overflow-hidden">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover object-top border-2 border-black group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-display font-black text-lg uppercase mb-3 tracking-tight leading-tight">
                  {item.title}
                </h3>
                <p className="font-mono text-xs font-semibold leading-relaxed text-gray-700 mb-6 flex-1 line-clamp-3">
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
                  <button className="w-10 h-10 shrink-0 border-[3px] border-black flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-[#00e676] transition-colors ml-2 pointer-events-none">
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
