"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, Search, Terminal, Shield, Zap, BookOpen, ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

function SidebarGroup({ title, children }: { title: string, children: React.ReactNode }) {
 return (
 <div className="space-y-1 mb-6">
 <h4 className="font-display font-black text-[10px] text-neutral-500 uppercase tracking-widest mb-3 px-3">
 {title}
 </h4>
 {children}
 </div>
 );
}

function SidebarAccordion({ title, icon, defaultOpen = false, children }: { title: string, icon?: React.ReactNode, defaultOpen?: boolean, children: React.ReactNode }) {
 const [isOpen, setIsOpen] = useState(defaultOpen);
 
 return (
 <div className="flex flex-col">
 <button 
 onClick={() => setIsOpen(!isOpen)}
 className="w-full flex items-center justify-between px-3 py-2 text-sm font-extrabold uppercase hover:bg-black/5 transition-colors border-l-[4px] border-transparent"
 >
 <div className="flex items-center gap-2">
 {icon}
 <span>{title}</span>
 </div>
 {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </button>
 {isOpen && (
 <div className="flex flex-col pl-4 border-l-[4px] border-black/10 ml-[2px]">
 {children}
 </div>
 )}
 </div>
 );
}

function SidebarLink({ href, title, activeClass = "-translate-y-0.5 translate-x-1 shadow-[4px_4px_0px_0px_#000] border-black bg-[#fde047] text-black z-10 relative", onClick }: { href: string, title: string, activeClass?: string, onClick?: () => void }) {
 const pathname = usePathname();
 const isActive = pathname === href || pathname?.startsWith(href + "#");

 return (
 <Link 
 href={href} 
 onClick={onClick}
 className={`block px-3 py-1.5 text-xs font-bold uppercase transition-all duration-75 ease-linear border-l-[4px] ${isActive ? activeClass : 'border-transparent hover:border-black/30 hover:bg-black/5 text-neutral-700'}`}
 >
 {title}
 </Link>
 );
}

export default function ProDocsLayout({ children }: { children: React.ReactNode }) {
 const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

 // Close sidebar on route change for mobile
 const pathname = usePathname();
 useEffect(() => {
   setIsMobileSidebarOpen(false);
 }, [pathname]);

 return (
 <div>
 <div className="min-h-screen bg-[#fcf6e6] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] font-body text-black flex flex-col md:flex-row overflow-hidden selection:bg-[#ff2a85] selection:text-white transition-colors duration-75 ease-linear">
 
 {/* MOBILE OVERLAY */}
 {isMobileSidebarOpen && (
   <div 
     className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
     onClick={() => setIsMobileSidebarOpen(false)}
   />
 )}

 {/* SIDEBAR */}
 <aside className={`fixed md:sticky top-0 left-0 h-screen w-[280px] border-r-[4px] border-black bg-white flex flex-col overflow-y-auto shrink-0 z-50 transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
 
 {/* Sidebar Header */}
 <div className="p-4 border-b-[4px] border-black flex items-center justify-between bg-white">
 <Link href="/" className="flex items-center gap-3 group">
 <div className="bg-[#fde047] border-[2px] border-black p-1 shadow-[2px_2px_0px_0px_#000] group-hover:-translate-y-0.5 group-hover:shadow-[4px_4px_0px_0px_#000] transition-all">
 <img src="/icon.png" alt="KeyKing" className="w-5 h-5 select-none" />
 </div>
 <div className="flex flex-col">
 <span className="font-display font-black uppercase text-lg tracking-tight leading-none text-black">Docs</span>
 </div>
 </Link>
 <div className="flex items-center gap-2">
   <Link href="/docs" className="hidden md:flex border-2 border-black p-1 hover:bg-[#fde047] transition-colors" title="Back to Docs">
     <ArrowLeft className="w-4 h-4" />
   </Link>
   <button 
     onClick={() => setIsMobileSidebarOpen(false)}
     className="md:hidden border-2 border-black p-1 bg-[#ff2a85] text-white hover:bg-black transition-colors"
   >
     <X className="w-4 h-4" />
   </button>
 </div>
 </div>

 {/* Sidebar Nav */}
 <nav className="flex-1 py-6 space-y-2">
 
 <SidebarGroup title="Get Started">
 <SidebarAccordion title="Tutorial" icon={<BookOpen className="w-4 h-4"/>} defaultOpen={true}>
 <SidebarLink href="/docs/pro/setup" title="1. Installation" />
 <SidebarLink href="/docs/pro/tutorial-proxy" title="2. Proxy Setup" />
 <SidebarLink href="/docs/pro/tutorial-sdk" title="3. SDK Integration" />
 </SidebarAccordion>
 
 <SidebarAccordion title="Understand KeyKing" icon={<Shield className="w-4 h-4"/>} defaultOpen={false}>
 <SidebarLink href="/docs/pro/architecture" title="Architecture" />
 <SidebarLink href="/docs/pro/zero-trust" title="Zero-Trust Vault" />
 <SidebarLink href="/docs/pro/rate-limits" title="Rate Limit Bypassing" />
 </SidebarAccordion>
 </SidebarGroup>

 <SidebarGroup title="Platform Components">
 <SidebarAccordion title="Desktop App" icon={<Terminal className="w-4 h-4"/>} defaultOpen={false}>
 <SidebarLink href="/docs/pro/app/vault" title="Credential Management" />
 <SidebarLink href="/docs/pro/app/proxy" title="Local Axum Proxy" />
 <SidebarLink href="/docs/pro/app/priority" title="Priority Routing" />
 <SidebarLink href="/docs/pro/app/export" title="Exporting Vaults" />
 </SidebarAccordion>

 <SidebarAccordion title="NPM SDK" icon={<Zap className="w-4 h-4"/>} defaultOpen={true}>
 <SidebarLink href="/docs/pro/sdk/client" title="Client Initialization" />
 <SidebarLink href="/docs/pro/sdk/routing" title="Smart Routing" />
 <SidebarLink href="/docs/pro/sdk/openai" title="OpenAI Wrapper" />
 </SidebarAccordion>
 
 <SidebarAccordion title="Control Plane" icon={<Sparkles className="w-4 h-4"/>} defaultOpen={false}>
 <SidebarLink href="/docs/pro/backend/sync" title="Vault Syncing" />
 <SidebarLink href="/docs/pro/backend/billing" title="Billing & Quotas" />
 </SidebarAccordion>
 </SidebarGroup>

 <SidebarGroup title="Ecosystem & Integrations">
 <SidebarLink href="/docs/pro/integrations/claude" title="Claude Code CLI" />
 <SidebarLink href="/docs/pro/integrations/cursor" title="Cursor IDE" />
 </SidebarGroup>

 <SidebarGroup title="Community">
 <SidebarLink href="/docs/pro/contributing" title="GitHub Contributions" />
 </SidebarGroup>

 </nav>
 
 </aside>

 {/* MAIN CONTENT AREA */}
 <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full md:w-auto">
 
 {/* TOP NAVBAR */}
 <header className="h-16 border-b-[4px] border-black bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors duration-300 gap-4">
 
 <div className="flex items-center gap-3 flex-1">
   {/* Mobile Hamburger Toggle */}
   <button 
     onClick={() => setIsMobileSidebarOpen(true)}
     className="md:hidden p-2 border-[2px] border-black bg-[#fde047] hover:bg-[#00e676] transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
   >
     <Menu className="w-5 h-5 text-black" />
   </button>

   {/* Search Bar */}
   <div className="flex-1 flex items-center max-w-sm hidden sm:flex">
     <div className="flex items-center gap-2 border-[2px] border-black bg-[#f4f4f0] px-3 py-1.5 w-full shadow-[2px_2px_0px_0px_#000] transition-all">
       <Search className="w-4 h-4 text-neutral-500" />
       <input type="text" placeholder="Search docs... (Ctrl K)" className="bg-transparent border-none outline-none text-xs font-bold w-full text-black placeholder:text-neutral-400 font-display uppercase tracking-wide" disabled />
     </div>
   </div>

   {/* Mobile Search Icon Only */}
   <div className="sm:hidden flex items-center justify-center w-10 h-10 border-[2px] border-black bg-[#f4f4f0] shadow-[2px_2px_0px_0px_#000]">
     <Search className="w-4 h-4 text-neutral-500" />
   </div>
 </div>

 {/* Right Actions */}
 <div className="flex items-center gap-4">
 {/* Ask AI Button */}
 <button className="hidden sm:flex items-center gap-2 bg-black text-white px-4 py-1.5 font-display font-black text-xs uppercase border-[2px] border-black hover:bg-neutral-800 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#ff2a85] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-75 ease-linear group">
 <Sparkles className="w-3.5 h-3.5 text-[#fde047] group-hover:animate-pulse" /> 
 <span>Ask AI</span>
 </button>
 <Link href="/docs" className="md:hidden p-2 border-[2px] border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
   <ArrowLeft className="w-5 h-5" />
 </Link>
 </div>
 </header>

 {/* SCROLLABLE CONTENT */}
 <main className="flex-1 overflow-y-auto">
 <div className="max-w-4xl mx-auto px-4 py-8 lg:px-12 lg:py-16 pb-32">
 {children}
 </div>
 </main>

 </div>
 </div>
 </div>
 );
}
