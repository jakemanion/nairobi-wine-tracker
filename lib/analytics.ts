import posthog from 'posthog-js'
import { hasAnalyticsConsent } from '@/lib/analytics-consent'

/** Safe client-side PostHog helpers. Never send emails, passwords, or tokens. */

let posthogInitialized = false

function isPostHogConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST,
  )
}

function canCapture(): boolean {
  return isPostHogConfigured() && hasAnalyticsConsent() && posthogInitialized
}

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>

/** Mark as initialized when instrumentation-client (or ensurePostHogInitialized) has run. */
export function markPostHogInitialized(): void {
  posthogInitialized = true
}

export function ensurePostHogInitialized(): boolean {
  if (!isPostHogConfigured() || !hasAnalyticsConsent()) return false
  if (posthogInitialized) return true

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!projectToken || !posthogHost) return false

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
  posthogInitialized = true
  return true
}

export function trackEvent(event: string, properties?: AnalyticsProps): void {
  if (!canCapture()) return
  const cleaned: Record<string, string | number | boolean> = {}
  if (properties) {
    for (const [key, value] of Object.entries(properties)) {
      if (value === undefined || value === null) continue
      cleaned[key] = value
    }
  }
  posthog.capture(event, cleaned)
}

/** Identify with Supabase user UUID only — no email or other PII as person properties. */
export function identifyRegisteredUser(userId: string): void {
  if (!userId) return
  if (!canCapture()) {
    // Consent may arrive later; try init if consent already stored.
    if (!ensurePostHogInitialized()) return
  }
  posthog.identify(userId, { is_registered: true })
  posthog.register({ is_logged_in: true })
}

export function resetAnalyticsIdentity(): void {
  if (!isPostHogConfigured() || !posthogInitialized) return
  posthog.register({ is_logged_in: false })
  posthog.reset()
}

/** Opt out and clear PostHog state after consent is withdrawn. */
export function disableAnalytics(): void {
  if (!isPostHogConfigured() || !posthogInitialized) return
  posthog.opt_out_capturing()
  posthog.reset(true)
}
