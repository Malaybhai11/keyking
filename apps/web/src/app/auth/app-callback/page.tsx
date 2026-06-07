import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default async function AppCallback() {
  const session = await auth.api.getSession({
      headers: await headers(),
  });

  if (!session) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neo-bg text-black font-body">
          <div className="p-8 border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center max-w-sm w-full">
            <ShieldAlert className="w-16 h-16 text-[#ff5f56] mb-4" />
            <h1 className="text-3xl font-black font-display uppercase tracking-tight mb-2">Auth Failed</h1>
            <p className="text-sm font-medium text-neutral-600 mb-8">We could not authenticate your session.</p>
          </div>
        </div>
      );
  }

  // Redirect to the local proxy's auth callback with session details
  const callbackUrl = new URL("http://localhost:8787/auth/callback");
  callbackUrl.searchParams.set("session_id", session.session.id);
  callbackUrl.searchParams.set("user_id", session.user.id);
  callbackUrl.searchParams.set("email", session.user.email);
  
  redirect(callbackUrl.toString());
}
