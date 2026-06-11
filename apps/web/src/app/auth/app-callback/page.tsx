"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ShieldAlert, Loader2 } from "lucide-react";
import semver from "semver";
import { Suspense } from "react";
import { usePostHog } from 'posthog-js/react';

const MIN_FALLBACK_VERSION = "3.0.0";

function VersionBlockedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcf6e6] text-black font-sans">
      <div className="p-8 border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center max-w-sm w-full">
        <ShieldAlert className="w-16 h-16 text-[#ff2a85] mb-4" />
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Update Required</h1>
        <p className="text-sm font-medium text-neutral-600 mb-8">
          Your version of KeyKing is no longer supported. Please download the latest version to continue.
        </p>
        <a
          href="/download"
          className="flex items-center justify-center gap-2 bg-[#fde047] text-black px-6 py-4 border-[3px] border-black font-bold uppercase transition-all w-full hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          Download Latest Version
        </a>
      </div>
    </div>
  );
}

function AuthFailedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcf6e6] text-black font-sans">
      <div className="p-8 border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center max-w-sm w-full">
        <ShieldAlert className="w-16 h-16 text-[#ff5f56] mb-4" />
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Auth Failed</h1>
        <p className="text-sm font-medium text-neutral-600 mb-8">We could not authenticate your session.</p>
      </div>
    </div>
  );
}

function AppCallbackInner() {
  const searchParams = useSearchParams();
  const appVersion = searchParams.get("app_version");
  const [status, setStatus] = useState<"loading" | "blocked" | "failed">("loading");
  const posthog = usePostHog();

  useEffect(() => {
    // Version gate: no version or invalid version = old app, block it
    if (!appVersion || !semver.valid(appVersion) || semver.lt(appVersion, MIN_FALLBACK_VERSION)) {
      setStatus("blocked");
      return;
    }

    // Fetch session manually via our custom robust endpoint to bypass better-auth Vercel edge cases
    fetch("/api/auth/fetch-session")
      .then(res => res.json())
      .then((data) => {
        if (data.error || !data.session || !data.user) {
          console.error("Auth callback failed:", data.error || data.details);
          setStatus("failed");
          return;
        }

        const session = data; // structure matches { session, user }

        if (posthog) {
          posthog.identify(session.user.id, {
            email: session.user.email,
            name: session.user.name,
          });
          posthog.capture("User Logged In", {
            email: session.user.email,
          });
        }

        // Session is valid — build the localhost redirect URL and send the user to the desktop app
        const callbackUrl = new URL("http://localhost:8787/auth/callback");
        callbackUrl.searchParams.set("session_id", session.session.token);
        callbackUrl.searchParams.set("user_id", session.user.id);
        callbackUrl.searchParams.set("email", session.user.email);

        // Hard redirect to the desktop proxy — this is what delivers the auth to the app
        window.location.href = callbackUrl.toString();
      })
      .catch((err) => {
        console.error("Auth callback fetch error:", err);
        setStatus("failed");
      });
  }, [appVersion, posthog]);

  if (status === "blocked") return <VersionBlockedPage />;
  if (status === "failed") return <AuthFailedPage />;

  // Loading state while we fetch the session and redirect
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcf6e6] text-black font-sans">
      <div className="p-8 border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center max-w-sm w-full">
        <Loader2 className="w-12 h-12 animate-spin text-[#ff2a85] mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Connecting...</h1>
        <p className="text-sm font-medium text-neutral-600">Redirecting you to the KeyKing desktop app.</p>
      </div>
    </div>
  );
}

export default function AppCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#fcf6e6]">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    }>
      <AppCallbackInner />
    </Suspense>
  );
}
