'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AGE_GATE_CONFIRMED_EVENT, AGE_GATE_STORAGE_KEY } from '@/components/preview/age-gate'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'
import {
  WELCOME_DISMISSED_EVENT,
  WELCOME_DISMISSED_STORAGE_KEY,
} from '@/lib/preview/usage-tips'

function shouldShowWelcome(): boolean {
  try {
    const ageConfirmed = window.localStorage.getItem(AGE_GATE_STORAGE_KEY) === 'true'
    const welcomeDismissed = window.localStorage.getItem(WELCOME_DISMISSED_STORAGE_KEY) === 'true'
    return ageConfirmed && !welcomeDismissed
  } catch {
    return false
  }
}

export function WelcomePanel() {
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function refresh() {
      setVisible(shouldShowWelcome())
      setReady(true)
    }

    refresh()
    window.addEventListener(AGE_GATE_CONFIRMED_EVENT, refresh)
    return () => window.removeEventListener(AGE_GATE_CONFIRMED_EVENT, refresh)
  }, [])

  function dismiss() {
    try {
      window.localStorage.setItem(WELCOME_DISMISSED_STORAGE_KEY, 'true')
    } catch {
      // Ignore storage write errors and continue for this session.
    }
    setVisible(false)
    window.dispatchEvent(new Event(WELCOME_DISMISSED_EVENT))
  }

  if (!ready || !visible) return null

  return (
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-panel-title"
      style={{ background: 'rgba(8, 8, 12, 0.45)' }}
    >
      <div
        className="w-full max-w-lg max-h-[min(90vh,40rem)] overflow-y-auto rounded-xl px-5 py-6 text-left"
        style={{
          background: '#ffffff',
          border: '1px solid #E4E4EE',
          boxShadow: '0 16px 48px rgba(30, 56, 40, 0.18)',
        }}
      >
        <h2
          id="welcome-panel-title"
          className="m-0 text-center text-xl font-semibold leading-snug"
          style={{ color: BRAND_GREEN, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Welcome to WineDiviner: Nairobi!
        </h2>
        <ul
          className="m-0 mt-4 list-none space-y-2.5 p-0 text-[17px] leading-relaxed"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          <li className="flex items-start justify-center gap-2.5 text-center">
            <span
              aria-hidden="true"
              className="shrink-0 text-[21px] leading-[1.35]"
              style={{ color: BRAND_GREEN }}
            >
              ★
            </span>
            <span>
              We list over{' '}
              <strong style={{ color: BRAND_GREEN }}>1000 bottles of wine</strong> available in
              Nairobi
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-[21px] leading-[1.35]"
              style={{ color: BRAND_GREEN }}
            >
              ★
            </span>
          </li>
          <li className="flex items-start justify-center gap-2.5 text-center">
            <span
              aria-hidden="true"
              className="shrink-0 text-[21px] leading-[1.35]"
              style={{ color: BRAND_GREEN }}
            >
              ★
            </span>
            <span>
              Every bottle is rated for{' '}
              <strong style={{ color: BRAND_GREEN }}>quality</strong> and{' '}
              <strong style={{ color: BRAND_GREEN }}>value</strong>
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-[21px] leading-[1.35]"
              style={{ color: BRAND_GREEN }}
            >
              ★
            </span>
          </li>
          <li className="flex items-start justify-center gap-2.5 text-center">
            <span
              aria-hidden="true"
              className="shrink-0 text-[21px] leading-[1.35]"
              style={{ color: BRAND_GREEN }}
            >
              ★
            </span>
            <span>
              So you can find{' '}
              <strong style={{ color: BRAND_GREEN }}>good wine without the guesswork</strong>
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-[21px] leading-[1.35]"
              style={{ color: BRAND_GREEN }}
            >
              ★
            </span>
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-lg px-5 py-2.5 text-[13px] font-semibold"
            style={{
              background: BRAND_GREEN,
              border: `1px solid ${BRAND_GREEN}`,
              color: '#FFFFFF',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
            }}
            onClick={dismiss}
          >
            Start Exploring!
          </button>
          <p
            className="m-0 text-[13px] leading-relaxed"
            style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Already registered?{' '}
            <Link
              href="/login"
              style={{ color: BRAND_GREEN, fontWeight: 600, textDecoration: 'underline' }}
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
