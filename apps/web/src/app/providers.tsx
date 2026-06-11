'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

import { usePostHog } from 'posthog-js/react'
import { authClient } from '@/lib/auth-client'

function AnalyticsIdentify() {
  const posthog = usePostHog()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (isPending || !posthog) return

    if (session?.user) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      })
    } else if (session === null) {
      posthog.reset()
    }
  }, [posthog, session, isPending])

  return null
}

export function PHProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    // Only initialize if we have the environment variable
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://t.keyking.ledgion.in',
        ui_host: 'https://us.posthog.com',
        person_profiles: 'identified_only', // Optimized for Free Tier: Only track profiles when users sign in
        autocapture: true, // Max Data: Captures all clicks automatically
        capture_pageview: false, // Next.js handles this via PostHogPageView
      })
    }
  }, [])

  return (
    <PostHogProvider client={posthog}>
      <AnalyticsIdentify />
      {children}
    </PostHogProvider>
  )
}
