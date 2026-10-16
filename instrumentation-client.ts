import posthog from 'posthog-js'
import { markPostHogInitialized } from '@/lib/analytics'
import { hasAnalyticsConsent } from '@/lib/analytics-consent'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (!projectToken || !posthogHost) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[PostHog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST are required for analytics. Events will not be sent until both are set.',
    )
  }
} else if (hasAnalyticsConsent()) {
  // Only initialise after the visitor has accepted analytics cookies.
  posthog.init(projectToken, {
    api_host: posthogHost,
    defaults: '2026-01-30',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_exceptions: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage+cookie',
    debug: process.env.NODE_ENV === 'development',
  })
  posthog.register({ is_logged_in: false })
  markPostHogInitialized()
  // Ensure the landing page is counted when consent was already stored.
  posthog.capture('$pageview')
}
