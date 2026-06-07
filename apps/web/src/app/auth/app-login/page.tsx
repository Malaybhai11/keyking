"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ShieldCheck, LogIn, Loader2, ShieldAlert } from "lucide-react";
import semver from "semver";

const MIN_FALLBACK_VERSION = "3.0.0";

function AppLoginInner() {
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const searchParams = useSearchParams();
  const appVersion = searchParams.get("app_version");

  useEffect(() => {
    // No version param = old app (v2.x.x) that never sends it → block
    // Invalid semver → block
    // Version below minimum → block
    if (!appVersion || !semver.valid(appVersion) || semver.lt(appVersion, MIN_FALLBACK_VERSION)) {
      setBlocked(true);
    }
  }, [appVersion]);

  const handleLogin = async () => {
    setLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `/auth/app-callback${appVersion ? `?app_version=${appVersion}` : ""}`,
    });
  };

  if (blocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neo-bg text-black font-body">
        <div className="p-8 border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center max-w-sm w-full">
          <ShieldAlert className="w-16 h-16 text-[#ff2a85] mb-4" />
          <h1 className="text-3xl font-black font-display uppercase tracking-tight mb-2">Update Required</h1>
          <p className="text-sm font-medium text-neutral-600 mb-8">
            Your version of KeyKing is no longer supported. Please download the latest version to continue.
          </p>
          <a
            href="/download"
            className="flex items-center justify-center gap-2 bg-[#fde047] text-black px-6 py-4 border-[3px] border-black font-bold uppercase hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all w-full"
          >
            Download Latest Version
          </a>
        </div>
      </div>
    );
  }

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

export default function AppLogin() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-neo-bg">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    }>
      <AppLoginInner />
    </Suspense>
  );
}
