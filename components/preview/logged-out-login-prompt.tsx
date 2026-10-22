'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'

export const LOGIN_PROMPT_MESSAGE = 'Log in to bookmark bottles, and more!'

const TOAST_DURATION_MS = 4000

type LoginPromptToastContextValue = {
  show: () => void
  visible: boolean
  dismiss: () => void
}

const LoginPromptToastContext = createContext<LoginPromptToastContextValue | null>(null)

export function LoginPromptToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [])

  const show = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    setVisible(true)
    timerRef.current = window.setTimeout(() => {
      setVisible(false)
      timerRef.current = null
    }, TOAST_DURATION_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <LoginPromptToastContext.Provider value={{ show, visible, dismiss }}>
      {children}
    </LoginPromptToastContext.Provider>
  )
}

function useLoginPromptToast(): LoginPromptToastContextValue | null {
  return useContext(LoginPromptToastContext)
}

export function useShowLoginPromptToast(): () => void {
  const ctx = useLoginPromptToast()
  return useCallback(() => {
    ctx?.show()
  }, [ctx])
}

/** Mobile slot under the sticky header — renders nothing when idle. */
export function MobileLoginPromptToastSlot({ maxWidth }: { maxWidth: string }) {
  const ctx = useLoginPromptToast()
  if (!ctx?.visible) return null

  return (
    <div className="mx-auto w-full px-3 pb-2 sm:hidden" style={{ maxWidth }}>
      <div
        role="status"
        aria-live="polite"
        className="flex max-w-md items-center gap-2 rounded-md px-2.5 py-1.5 shadow-md"
        style={{
          background: BRAND_GREEN,
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: 11,
          lineHeight: 1.35,
        }}
      >
        <p className="m-0 min-w-0 flex-1">{LOGIN_PROMPT_MESSAGE}</p>
        <Link
          href="/login?next=%2F"
          className="flex-shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold no-underline"
          style={{
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.65)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Log in
        </Link>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={ctx.dismiss}
          className="flex-shrink-0 text-[14px] leading-none"
          style={{
            background: 'none',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            opacity: 0.85,
            padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function LoggedOutLoginPromptOverlay() {
  const showToast = useShowLoginPromptToast()

  return (
    <>
      {/* Desktop: hover overlay with login/register CTAs */}
      <div
        className="absolute inset-0 z-20 hidden flex-col items-center justify-center rounded-lg px-4 py-3 text-center pointer-events-none opacity-0 transition-opacity duration-200 group-hover/review-panel:opacity-100 group-hover/review-panel:pointer-events-auto sm:flex"
        aria-hidden={false}
        role="note"
      >
        <div
          className="absolute inset-0 rounded-lg"
          style={{ background: 'rgba(255, 255, 255, 0.82)' }}
        />
        <div className="relative z-10 flex flex-col items-center gap-2.5">
          <p
            className="m-0 text-[11px] font-medium leading-snug"
            style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            {LOGIN_PROMPT_MESSAGE}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/login?next=%2F"
              className="rounded-lg px-3 py-1.5 text-[11px] no-underline"
              style={{
                background: BRAND_GREEN,
                border: `1px solid ${BRAND_GREEN}`,
                color: '#FFFFFF',
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg px-3 py-1.5 text-[11px] no-underline"
              style={{
                background: BRAND_GREEN,
                border: `1px solid ${BRAND_GREEN}`,
                color: '#FFFFFF',
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}
            >
              Register
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile: tap any my-wines control area to show a toast */}
      <button
        type="button"
        className="absolute inset-0 z-20 sm:hidden"
        aria-label={LOGIN_PROMPT_MESSAGE}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        onClick={showToast}
      />
    </>
  )
}
