'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  disableAnalytics,
  ensurePostHogInitialized,
  identifyRegisteredUser,
} from '@/lib/analytics'
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analytics-consent'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'

type CookieBannerProps = {
  /** When set, identify immediately after consent is granted. */
  userId?: string | null
}

export function CookieBanner({ userId = null }: CookieBannerProps) {
  const [ready, setReady] = useState(false)
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null)

  useEffect(() => {
    setConsent(readAnalyticsConsent())
    setReady(true)
  }, [])

  function accept() {
    writeAnalyticsConsent('granted')
    setConsent('granted')
    if (!ensurePostHogInitialized()) return
    if (userId) identifyRegisteredUser(userId)
  }

  function decline() {
    writeAnalyticsConsent('denied')
    setConsent('denied')
    disableAnalytics()
  }

  if (!ready || consent !== null) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[10900] p-3 sm:p-4"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
    >
      <div
        className="mx-auto flex max-w-[54.625rem] flex-col gap-3 rounded-xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        style={{
          background: '#1A1A22',
          border: '1px solid #3A3848',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
        }}
      >
        <div className="min-w-0 flex-1">
          <p
            id="cookie-banner-title"
            className="m-0 text-[13px] font-semibold"
            style={{ color: '#F5F2EC', fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Cookies & analytics
          </p>
          <p
            id="cookie-banner-desc"
            className="m-0 mt-1 text-[12px] leading-relaxed"
            style={{ color: '#C8C4D0', fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            We use essential cookies to run WineDiviner, and optional analytics (PostHog EU) to
            improve the product. Analytics uses an opaque account ID when you are signed in — not
            your email.{' '}
            <Link
              href="/cookies"
              className="underline underline-offset-2"
              style={{ color: '#F5F2EC' }}
            >
              Cookie Policy
            </Link>
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={decline}
            className="rounded-lg px-3 py-2 text-[12px] font-medium"
            style={{
              background: '#1E1E26',
              border: '1px solid #3A3848',
              color: '#C8C4D0',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
            }}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-lg px-3 py-2 text-[12px] font-medium"
            style={{
              background: BRAND_GREEN,
              border: `1px solid ${BRAND_GREEN}`,
              color: '#FFFFFF',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
            }}
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  )
}
