import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { PostHog } from "posthog-node";
import semver from "semver";

const phClient = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_wsBwU2tc3HXLoaYwo9ikBfZc2vGqXcmCyAnfu2Hy8uyw',
  {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://t.keyking.ledgion.in',
    flushAt: 1,
    flushInterval: 0
  }
);

const MIN_FALLBACK_VERSION = "3.0.0";

async function getMinAllowedVersion(userEmail: string): Promise<string> {
  try {
    const payload = await phClient.getFeatureFlagPayload('app-version-policy', userEmail);
    return (payload as any)?.min_allowed_version || MIN_FALLBACK_VERSION;
  } catch {
    return MIN_FALLBACK_VERSION;
  }
}

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

interface Props {
  searchParams: Promise<{ app_version?: string }>;
}

export default async function AppCallback({ searchParams }: Props) {
  const params = await searchParams;
  const appVersion = params.app_version;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
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

  // Server-side hard gate: check app version before issuing the local session redirect.
  // This blocks v2.x.x users (no app_version param) and any future deprecated versions.
  if (!appVersion || !semver.valid(appVersion)) {
    // No version param = old app (v2.x.x) that doesn't send it — block.
    return <VersionBlockedPage />;
  }

  const minVersion = await getMinAllowedVersion(session.user.email);

  if (semver.lt(appVersion, minVersion)) {
    return <VersionBlockedPage />;
  }

  // Version is valid — redirect to the local proxy's auth callback with session details
  const callbackUrl = new URL("http://localhost:8787/auth/callback");
  callbackUrl.searchParams.set("session_id", session.session.id);
  callbackUrl.searchParams.set("user_id", session.user.id);
  callbackUrl.searchParams.set("email", session.user.email);
  
  // Track user login in PostHog server-side before redirect
  phClient.identify({
    distinctId: session.user.id,
    properties: {
      email: session.user.email,
      name: session.user.name,
    }
  });

  phClient.capture({
    distinctId: session.user.id,
    event: 'User Logged In',
    properties: {
      email: session.user.email,
    }
  });

  await phClient.flushAsync();
  
  redirect(callbackUrl.toString());
}
