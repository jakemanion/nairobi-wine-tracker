import Link from 'next/link'
import { getPreviewColors } from '@/lib/preview/preview-colors'

const colors = getPreviewColors('dark')
const accent = '#C93048'
const CONTENT_MAX_WIDTH = '54.625rem'

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/accessibility', label: 'Accessibility Statement' },
] as const

type SiteFooterProps = {
  className?: string
}

export function SiteFooter({ className = '' }: SiteFooterProps) {
  return (
    <>
      {/* Reserves space so fixed footer does not cover page content */}
      <div className="h-10 shrink-0" aria-hidden />
      <footer
        className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}
        style={{
          background: colors.headerBg,
          borderTop: `1px solid ${colors.headerBorder}`,
        }}
      >
        <div
          className="mx-auto px-4 h-10 flex items-center justify-between gap-3 min-w-0"
          style={{ maxWidth: CONTENT_MAX_WIDTH }}
        >
          <p
            className="m-0 text-xs font-semibold truncate shrink-0"
            style={{ color: colors.headerTitle, fontFamily: 'var(--font-playfair), serif' }}
          >
            WineDiviner: Nairobi
          </p>

          <nav aria-label="Legal" className="min-w-0 overflow-x-auto">
            <ul className="m-0 p-0 list-none flex items-center gap-x-3 whitespace-nowrap">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[11px] no-underline hover:underline underline-offset-2"
                    style={{ color: accent, fontFamily: 'var(--font-dm-sans), sans-serif' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  )
}
