import { NextRequest, NextResponse } from 'next/server';
import { PostHog } from 'posthog-node';
import semver from 'semver';

// Initialize PostHog server client using environment variables
const phClient = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || 'phc_wsBwU2tc3HXLoaYwo9ikBfZc2vGqXcmCyAnfu2Hy8uyw',
  {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://t.keyking.ledgion.in',
    flushAt: 1,
    flushInterval: 0
  }
);

export async function GET(req: NextRequest) {
  const clientVersion = req.headers.get('x-app-version');
  const userEmail = req.headers.get('x-user-email') || 'anonymous_desktop';

  if (!clientVersion) {
    return NextResponse.json({ allowed: false, reason: "Missing version" }, { status: 400 });
  }

  try {
    // Correct PostHog Node SDK usage with distinctId (userEmail)
    // For evaluating feature flags reliably per user
    const payload = await phClient.getFeatureFlagPayload('app-version-policy', userEmail);
    
    // Default to "1.0.0" if the flag isn't set, ensuring it passes for legitimate users if PostHog config is missing
    const minVersion = (payload as any)?.min_allowed_version || "1.0.0";

    const isAllowed = semver.gte(clientVersion, minVersion);

    return NextResponse.json({ 
      allowed: isAllowed,
      reason: isAllowed ? "Valid" : "Update required" 
    });
  } catch (error) {
    console.error("Error evaluating PostHog feature flag:", error);
    // Fail open or fail closed? We choose to fail open if PostHog is down to prevent breaking UX.
    return NextResponse.json({ allowed: true, reason: "Fallback allowed due to internal error" });
  }
}
