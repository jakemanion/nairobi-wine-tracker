'use client'

import Link from 'next/link'
import { Scale } from 'lucide-react'
import { LEGAL_LINKS } from '@/components/site-footer'
import type { PreviewColors } from '@/lib/preview/preview-colors'

/** Mobile-only legal links menu for logged-out header (footer is hidden on small screens). */
export function PreviewLegalMenu({ colors }: { colors: PreviewColors }) {
  return (
    <div className="relative group/legal-menu sm:hidden">
      <button
        type="button"
        aria-label="Open legal links"
        className="flex h-9 w-9 items-center justify-center"
        style={{
          background: colors.buttonBg,
          border: `1px solid ${colors.buttonBorder}`,
          color: colors.buttonText,
          borderRadius: colors.buttonRadius,
          cursor: 'pointer',
        }}
      >
        <Scale size={14} strokeWidth={2} aria-hidden />
      </button>
      <div className="invisible absolute right-0 top-full z-[60] w-48 pt-2 opacity-0 transition-opacity duration-150 group-hover/legal-menu:visible group-hover/legal-menu:opacity-100 group-focus-within/legal-menu:visible group-focus-within/legal-menu:opacity-100">
        <nav
          aria-label="Legal"
          className="flex flex-col gap-1 p-2.5"
          style={{
            background: colors.toolbarBg,
            border: `1px solid ${colors.toolbarBorder}`,
            borderRadius: colors.panelRadius,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
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
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
