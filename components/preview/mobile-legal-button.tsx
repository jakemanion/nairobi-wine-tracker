'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LEGAL_LINKS } from '@/components/site-footer'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type MobileLegalButtonProps = {
  colors: PreviewColors
  /** Distance from the bottom edge — raise above the my-wines footer when logged in. */
  bottomOffsetPx?: number
}

/** Fixed bottom-left Legal control for small screens (footer legal links are desktop-only). */
export function MobileLegalButton({
  colors,
  bottomOffsetPx = 12,
}: MobileLegalButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="fixed left-3 z-50 flex flex-col items-start sm:hidden"
      style={{ bottom: bottomOffsetPx }}
    >
      {open ? (
        <nav
          aria-label="Legal"
          className="mb-2 flex min-w-[11rem] flex-col gap-1 p-2.5"
          style={{
            background: colors.toolbarBg,
            border: `1px solid ${colors.toolbarBorder}`,
            borderRadius: colors.panelRadius,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-2 py-1.5 text-[11px] no-underline hover:underline underline-offset-2"
              style={{
                color: colors.headerAccent,
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="rounded-md px-2.5 py-1 text-[11px] font-semibold"
        style={{
          background: colors.toolbarBg,
          border: `1px solid ${colors.toolbarBorder}`,
          color: colors.buttonText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        Legal
      </button>
    </div>
  )
}
