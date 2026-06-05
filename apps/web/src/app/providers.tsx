'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || 'phc_wsBwU2tc3HXLoaYwo9ikBfZc2vGqXcmCyAnfu2Hy8uyw'
    // Only initialize if we have the environment variable
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://t.keyking.ledgion.in',
        ui_host: 'https://us.posthog.com',
        defaults: '2026-05-30',
        person_profiles: 'identified_only', // Optimized for Free Tier: Only track profiles when users sign in
        autocapture: true, // Max Data: Captures all clicks automatically
        capture_pageview: false, // Next.js handles this via PostHogPageView
      })
    }
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
