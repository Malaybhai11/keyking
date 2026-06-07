import { NextRequest, NextResponse } from 'next/server';
import { PostHog } from 'posthog-node';
import semver from 'semver';

const FLAG_KEY = 'app-version-policy';
const SAFE_MIN_ALLOWED_VERSION = '3.0.0';

const posthogProjectApiKey =
  process.env.POSTHOG_PROJECT_API_KEY ||
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

const posthogHost = process.env.POSTHOG_HOST || process.env.POSTHOG_API_HOST;
const posthogPersonalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;

const phClient = posthogProjectApiKey
  ? new PostHog(posthogProjectApiKey, {
      host: posthogHost,
      personalApiKey: posthogPersonalApiKey,
      enableLocalEvaluation: Boolean(posthogPersonalApiKey),
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

function normalizeVersion(value: string | null): string | null {
  if (!value) return null;
  return semver.valid(value) || semver.coerce(value)?.version || null;
}

async function getMinAllowedVersion(distinctId: string): Promise<string> {
  let payload: unknown;

  if (!phClient) {
    return SAFE_MIN_ALLOWED_VERSION;
  }

  try {
    const flags = await phClient.evaluateFlags(distinctId, {
      flagKeys: [FLAG_KEY],
    });
    payload = flags.getFlagPayload(FLAG_KEY);
  } catch (error) {
    console.error('Error evaluating PostHog flag payload:', error);
  }

  if (!payload && posthogPersonalApiKey) {
    try {
      payload = await phClient.getRemoteConfigPayload(FLAG_KEY);
    } catch (error) {
      console.error('Error loading PostHog remote config payload:', error);
    }
  }

  const minAllowedVersion =
    typeof payload === 'object' && payload !== null && 'min_allowed_version' in payload
      ? (payload as { min_allowed_version?: unknown }).min_allowed_version
      : undefined;

  return typeof minAllowedVersion === 'string' && normalizeVersion(minAllowedVersion)
    ? minAllowedVersion
    : SAFE_MIN_ALLOWED_VERSION;
}

export async function GET(req: NextRequest) {
  const clientVersion = req.headers.get('x-app-version');
  const userEmail = req.headers.get('x-user-email') || 'anonymous_desktop';

  if (!clientVersion) {
    return NextResponse.json({ allowed: false, reason: "Missing version" }, { status: 400 });
  }

  try {
    const normalizedClientVersion = normalizeVersion(clientVersion);
    if (!normalizedClientVersion) {
      return NextResponse.json({ allowed: true, reason: 'Valid' });
    }

    const minVersion = await getMinAllowedVersion(userEmail);
    const normalizedMinVersion = normalizeVersion(minVersion) || SAFE_MIN_ALLOWED_VERSION;

    const isAllowed = semver.gte(normalizedClientVersion, normalizedMinVersion);

    return NextResponse.json({ 
      allowed: isAllowed,
      reason: isAllowed ? "Valid" : "Update required" 
    });
  } catch (error) {
    console.error("Error evaluating PostHog feature flag:", error);
    return NextResponse.json({ allowed: true, reason: "Valid" });
  }
}
