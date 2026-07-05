import Link from 'next/link'
import type { ReactNode } from 'react'
import { getPreviewColors } from '@/lib/preview/preview-colors'

const colors = getPreviewColors('dark')
const accent = '#C93048'

type AuthScreenProps = {
  title: string
  subtitle: string
  heading: string
  description: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export function AuthScreen({
  title,
  subtitle,
  heading,
  description,
  backHref = '/',
  backLabel = 'Back to wine list',
  children,
}: AuthScreenProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.pageBg }}>
      <header
        style={{
          background: colors.headerBg,
          borderBottom: `1px solid ${colors.headerBorder}`,
        }}
      >
        <div className="mx-auto px-6 py-3 flex items-center justify-between gap-4 max-w-lg">
          <div className="min-w-0">
            <h1
              className="text-base font-semibold leading-none truncate"
              style={{ color: colors.headerTitle, fontFamily: 'var(--font-playfair), serif' }}
            >
              {title}
            </h1>
            <p
              className="text-[10px] mt-1 truncate"
              style={{ color: colors.headerSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {subtitle}
            </p>
          </div>
          <Link
            href={backHref}
            className="text-xs flex-shrink-0 no-underline"
            style={{ color: accent, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            {backLabel}
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div
          className="w-full max-w-md rounded-xl p-6"
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: colors.cardShadow,
          }}
        >
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: colors.wineName, fontFamily: 'var(--font-playfair), serif' }}
          >
            {heading}
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            {description}
          </p>
          {children}
        </div>
      </main>
    </div>
  )
}
