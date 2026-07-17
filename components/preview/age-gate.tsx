'use client'

import { useEffect, useState } from 'react'

export const AGE_GATE_STORAGE_KEY = 'wine-diviner-age-confirmed'

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
      style={{ background: 'rgba(8, 8, 12, 0.92)' }}
    >
      <div
        className="w-full max-w-md rounded-xl px-5 py-6 text-center"
        style={{
          background: '#1A1A22',
          border: '1px solid #3A3848',
          boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
        }}
      >
        <p
          id="age-gate-title"
          className="m-0 text-lg font-semibold"
          style={{ color: '#F5F2EC', fontFamily: 'var(--font-playfair), serif' }}
        >
          Age verification
        </p>
        <p
          className="m-0 mt-3 text-[13px] leading-relaxed"
          style={{ color: '#D0CED4', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          You must be of legal drinking age in your country of residence to enter this website. Are
          you of legal drinking age?
        </p>
        <p
          className="m-0 mt-2 text-[11px] leading-relaxed"
          style={{ color: '#9A98A8', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          By entering, you confirm that you are legally permitted to purchase and consume alcohol
          where you live.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <button
            type="button"
            className="min-w-[7rem] rounded-lg px-4 py-2 text-[13px] font-medium"
            style={{
              background: '#C93048',
              border: '1px solid #C93048',
              color: '#FFFFFF',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
            }}
            onClick={confirmAge}
          >
            Yes
          </button>
          <button
            type="button"
            className="min-w-[7rem] rounded-lg px-4 py-2 text-[13px] font-medium"
            style={{
              background: '#1E1E26',
              border: '1px solid #3A3848',
              color: '#C8C4D0',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
            }}
            onClick={declineAge}
          >
            No
          </button>
        </div>
      </div>
    </div>
  )
}
