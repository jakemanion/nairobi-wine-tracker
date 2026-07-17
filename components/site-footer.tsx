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
    <footer
      className={`mt-auto ${className}`}
      style={{
        background: colors.headerBg,
        borderTop: `1px solid ${colors.headerBorder}`,
      }}
    >
      <div
        className="mx-auto px-6 py-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        style={{ maxWidth: CONTENT_MAX_WIDTH }}
      >
        <div className="min-w-0">
          <p
            className="m-0 text-sm font-semibold"
            style={{ color: colors.headerTitle, fontFamily: 'var(--font-playfair), serif' }}
          >
            WineDiviner: Nairobi
          </p>
          <p
            className="m-0 mt-1 text-[11px] leading-relaxed max-w-sm"
            style={{ color: colors.headerSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Find Nairobi&apos;s best wine for your money. For adults of legal drinking age only.
          </p>
        </div>

        <nav aria-label="Legal" className="min-w-0">
          <p
            className="m-0 text-[10px] uppercase tracking-wider"
            style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Legal
          </p>
          <ul className="m-0 mt-2 p-0 list-none flex flex-col gap-1.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[12px] no-underline hover:underline underline-offset-2"
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
  )
}
