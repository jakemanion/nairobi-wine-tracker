'use client'

import Link from 'next/link'

export const LOGIN_PROMPT_MESSAGE =
  'Login or register for free to use wine wishlists and likes'

export function LoggedOutLoginPromptOverlay() {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg px-4 py-3 text-center pointer-events-none opacity-0 transition-opacity duration-200 group-hover/review-panel:opacity-100 group-hover/review-panel:pointer-events-auto"
      aria-hidden={false}
      role="note"
    >
      <div
        className="absolute inset-0 rounded-lg"
        style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      />
      <div className="relative z-10 flex flex-col items-center gap-2.5">
        <p
          className="text-[11px] font-medium leading-snug m-0"
          style={{ color: '#F5F2EC', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          {LOGIN_PROMPT_MESSAGE}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/login?next=%2F"
            className="text-[11px] px-3 py-1.5 rounded-lg no-underline"
            style={{
              background: '#C93048',
              border: '1px solid #C93048',
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
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#F5F2EC',
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
