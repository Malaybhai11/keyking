"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ShieldCheck, LogIn, Loader2 } from "lucide-react";

export default function AppLogin() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/auth/app-callback",
    });
  };

  // We can auto-trigger or just let the user click
  useEffect(() => {
    // handleLogin(); // Optional: Auto trigger login
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neo-bg text-black font-body">
      <div className="p-8 border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center max-w-sm w-full">
        <ShieldCheck className="w-16 h-16 text-[#00e676] mb-4" />
        <h1 className="text-3xl font-black font-display uppercase tracking-tight mb-2">Connect App</h1>
        <p className="text-sm font-medium text-neutral-600 mb-8">Sign in with Google to authenticate your KeyKing desktop client.</p>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-[#ff2a85] text-white px-6 py-4 border-[3px] border-black font-bold uppercase hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all w-full disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          {loading ? "Connecting..." : "Sign In with Google"}
        </button>
      </div>
    </div>
  );
}
