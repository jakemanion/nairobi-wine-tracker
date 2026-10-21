'use client'

import { useEffect, useState } from 'react'
import { AGE_GATE_CONFIRMED_EVENT, AGE_GATE_STORAGE_KEY } from '@/components/preview/age-gate'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'
import { WELCOME_DISMISSED_STORAGE_KEY } from '@/lib/preview/usage-tips'

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
          className="m-0 text-xl font-semibold leading-snug"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Find the best wine for your budget.
        </h2>
        <p
          className="m-0 mt-3 text-[13px] leading-relaxed"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          <strong>Don&apos;t waste good money on bad wine.</strong> WineDiviner helps you find the
          best bottles for your money, whatever you want to spend.
        </p>
        <ul
          className="m-0 mt-4 list-disc space-y-2.5 pl-5 text-[13px] leading-relaxed"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          <li>
            <strong>Know what&apos;s worth buying.</strong> Discover the quality and price of over
            1,000 wines sold in Nairobi.
          </li>
          <li>
            <strong>Know where to buy.</strong> Find the shops stocking the bottles you want.
          </li>
          <li>
            <strong>Find your perfect bottle.</strong> Filter by price, quality, grape, country and
            more to find exactly what you fancy.
          </li>
          <li>
            <strong>Remember your favourites.</strong> Bookmark bottles to try, track wines
            you&apos;d buy again, hide the ones you&apos;d rather forget, and share your
            discoveries.
          </li>
        </ul>
        <h3
          className="m-0 mt-5 text-[15px] font-semibold"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Ready to find your next favourite?
        </h3>
        <div className="mt-4 flex justify-center">
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
            Start Exploring →
          </button>
        </div>
      </div>
    </div>
  )
}
