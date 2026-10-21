'use client'

import { useEffect, useRef, useState } from 'react'
import { identifyRegisteredUser, resetAnalyticsIdentity } from '@/lib/analytics'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'

export const AGE_GATE_STORAGE_KEY = 'wine-diviner-age-confirmed'
export const AGE_GATE_CONFIRMED_EVENT = 'wine-diviner-age-confirmed'

type AuthenticatedPostHogIdentityProps = {
  userId: string | null
}

/**
 * Keeps PostHog distinct_id aligned with the Supabase user UUID.
 * No email/name is sent. Resets on logout and when switching accounts.
 */
export function AuthenticatedPostHogIdentity({ userId }: AuthenticatedPostHogIdentityProps) {
  const previousUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      return
    }

    if (!userId) {
      if (previousUserId.current) {
        resetAnalyticsIdentity()
        previousUserId.current = null
      }
      return
    }

    if (previousUserId.current && previousUserId.current !== userId) {
      resetAnalyticsIdentity()
    }

    // No-ops until analytics consent is granted and PostHog is initialised.
    identifyRegisteredUser(userId)
    previousUserId.current = userId
  }, [userId])

  return null
}

export function AgeGate() {
  const [ready, setReady] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    try {
      setConfirmed(window.localStorage.getItem(AGE_GATE_STORAGE_KEY) === 'true')
    } catch {
      setConfirmed(false)
    }
    setReady(true)
  }, [])

  function confirmAge() {
    try {
      window.localStorage.setItem(AGE_GATE_STORAGE_KEY, 'true')
    } catch {
      // Ignore storage write errors and continue for this session.
    }
    setConfirmed(true)
    window.dispatchEvent(new Event(AGE_GATE_CONFIRMED_EVENT))
  }

  function declineAge() {
    window.location.href = 'https://www.google.com'
  }

  if (!ready || confirmed) return null

  return (
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      style={{ background: 'rgba(8, 8, 12, 0.45)' }}
    >
      <div
        className="w-full max-w-md rounded-xl px-5 py-6 text-center"
        style={{
          background: '#ffffff',
          border: '1px solid #E4E4EE',
          boxShadow: '0 16px 48px rgba(30, 56, 40, 0.18)',
        }}
      >
        <h2
          id="age-gate-title"
          className="m-0 text-lg font-semibold"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Welcome to WineDiviner
        </h2>
        <p
          className="m-0 mt-2 text-[13px] leading-relaxed"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Find the best wine for your budget.
        </p>
        <p
          className="m-0 mt-4 text-[13px] font-semibold leading-relaxed"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Are you of legal drinking age in your country of residence?
        </p>
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <button
            type="button"
            className="min-w-[7rem] rounded-lg px-4 py-2 text-[13px] font-medium"
            style={{
              background: BRAND_GREEN,
              border: `1px solid ${BRAND_GREEN}`,
              color: '#FFFFFF',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
            }}
            onClick={confirmAge}
          >
            Yes, I am
          </button>
          <button
            type="button"
            className="min-w-[7rem] rounded-lg px-4 py-2 text-[13px] font-medium"
            style={{
              background: BRAND_GREEN,
              border: `1px solid ${BRAND_GREEN}`,
              color: '#FFFFFF',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
            }}
            onClick={declineAge}
          >
            No, I am not
          </button>
        </div>
        <p
          className="m-0 mt-4 text-[12px] italic leading-relaxed"
          style={{ color: '#7878A0', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Please drink responsibly.
        </p>
      </div>
    </div>
  )
}
