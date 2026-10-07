import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { SiteFooter } from '@/components/site-footer'
import { getPreviewColors } from '@/lib/preview/preview-colors'

/** Matches preview list / home content width. */
const CONTENT_MAX_WIDTH = '54.625rem'

const colors = getPreviewColors('dark', 'trial')

type AuthScreenProps = {
  heading: string
  description: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export function AuthScreen({
  heading,
  description,
  backHref = '/',
  backLabel = 'Back to home',
  children,
}: AuthScreenProps) {
  return (
    <div
      className="min-h-screen flex flex-col"
      data-visual-style="trial"
      style={{ background: colors.pageBg }}
    >
      <div
        style={{
          background: colors.pageBg,
          borderBottom: `1px solid ${colors.headerBorder}`,
          boxShadow: colors.headerShadow,
        }}
      >
        <header
          style={{
            background: colors.headerBg,
            borderBottom: `1px solid ${colors.headerBorder}`,
          }}
        >
          <div
            className="mx-auto flex items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:pl-10 sm:pr-6"
            style={{ maxWidth: CONTENT_MAX_WIDTH }}
          >
            <div className="flex min-w-0 flex-shrink-0 items-center gap-2.5">
              <BrandLogo height={40} />
              <div className="min-w-0">
                <Link href="/" className="no-underline min-w-0">
                  <h1
                    className="truncate text-base font-semibold leading-none"
                    style={{ color: colors.headerTitle, fontFamily: colors.headingFont }}
                  >
                    WineDiviner: Nairobi
                  </h1>
                </Link>
                <p className="mt-1 truncate text-[10px]" style={{ color: colors.headerSub }}>
                  Find Nairobi&apos;s best bottles for your budget
                </p>
              </div>
            </div>
            <Link
              href={backHref}
              className="flex flex-shrink-0 items-center rounded-lg px-3 py-2 text-xs no-underline"
              style={{
                background: '#fff',
                border: `1px solid ${colors.buttonBorder}`,
                color: colors.surfaceTitle,
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}
            >
              {backLabel}
            </Link>
          </div>
        </header>
      </div>

      <main
        className="mx-auto flex w-full flex-1 items-start justify-center px-3 py-10 sm:pl-10 sm:pr-6"
        style={{ maxWidth: CONTENT_MAX_WIDTH }}
      >
        <div
          className="w-full max-w-md p-6"
          style={{
            background: '#ffffff',
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: colors.cardShadow,
            borderRadius: colors.cardRadius,
          }}
        >
          <h2
            className="mb-1 text-lg font-semibold"
            style={{ color: colors.wineName, fontFamily: colors.headingFont }}
          >
            {heading}
          </h2>
          <p
            className="mb-6 text-sm"
            style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            {description}
          </p>
          {children}
        </div>
      </main>
      <SiteFooter colors={colors} />
    </div>
  )
}
