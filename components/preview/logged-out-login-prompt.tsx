'use client'

import Link from 'next/link'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'

export const LOGIN_PROMPT_MESSAGE = 'Log in or register to bookmark and more!'

export function LoggedOutLoginPromptOverlay() {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg px-4 py-3 text-center pointer-events-none opacity-0 transition-opacity duration-200 group-hover/review-panel:opacity-100 group-hover/review-panel:pointer-events-auto"
      aria-hidden={false}
      role="note"
    >
      <div
        className="absolute inset-0 rounded-lg"
        style={{ background: 'rgba(255, 255, 255, 0.82)' }}
      />
      <div className="relative z-10 flex flex-col items-center gap-2.5">
        <p
          className="text-[11px] font-medium leading-snug m-0"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          {LOGIN_PROMPT_MESSAGE}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/login?next=%2F"
            className="text-[11px] px-3 py-1.5 rounded-lg no-underline"
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
            className="text-[11px] px-3 py-1.5 rounded-lg no-underline"
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
  )
}
