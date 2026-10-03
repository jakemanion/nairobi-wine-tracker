'use client'

import Link from 'next/link'
import { LogoutButton } from '@/components/auth/logout-button'
import { InstantTooltip } from '@/components/preview/instant-tooltip'
import { UsageTipsToggle } from '@/components/preview/usage-tips-toggle'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import { LEGAL_LINKS } from '@/components/site-footer'
import type { PreviewColors, PreviewThemeMode } from '@/lib/preview/preview-colors'

type PreviewUserMenuProps = {
  colors: PreviewColors
  theme: PreviewThemeMode
  userName: string
  userEmail: string
}

export function PreviewUserMenu({
  colors,
  theme,
  userName,
  userEmail,
}: PreviewUserMenuProps) {
  const { visualStyle } = usePreviewTheme()
  const trial = visualStyle === 'trial'
  const accountLabel = userName.trim() || userEmail.trim() || 'Account'
  const initial = accountLabel.charAt(0).toUpperCase()

  return (
    <div className="relative group/user-menu">
      <InstantTooltip label={userName && userEmail ? `${userName} · ${userEmail}` : accountLabel}>
        <button
          type="button"
          aria-label={`Open account menu for ${accountLabel}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            background: trial ? '#FFFFFF' : colors.headerAccent,
            border: `1px solid ${colors.buttonBorder}`,
            color: trial ? colors.headerTitle : '#FFFFFF',
            cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          {initial}
        </button>
      </InstantTooltip>

      <div
        className="invisible absolute right-0 top-full z-[60] w-48 pt-2 opacity-0 transition-opacity duration-150 group-hover/user-menu:visible group-hover/user-menu:opacity-100 group-focus-within/user-menu:visible group-focus-within/user-menu:opacity-100"
        aria-label="Account menu"
      >
        <div
          className="flex flex-col gap-2 p-2.5"
          style={{
            background: colors.toolbarBg,
            border: `1px solid ${colors.toolbarBorder}`,
            borderRadius: colors.panelRadius,
            boxShadow: trial ? colors.cardShadow : '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <UsageTipsToggle
            colors={colors}
            className="w-full justify-between"
            style={
              trial
                ? {
                    background: colors.buttonBg,
                    border: `1px solid ${colors.buttonBorder}`,
                    color: colors.buttonText,
                  }
                : undefined
            }
          />
          <nav aria-label="Legal" className="sm:hidden">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded px-2 py-1.5 text-[11px] no-underline hover:underline underline-offset-2"
                    style={{
                      color: colors.headerAccent,
                      fontFamily: 'var(--font-dm-sans), sans-serif',
                      background: trial ? colors.buttonBg : undefined,
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <LogoutButton
            theme={theme}
            className="w-full justify-center"
            style={{
              padding: '6px 10px',
              ...(trial
                ? {
                    background: colors.buttonBg,
                    border: `1px solid ${colors.buttonBorder}`,
                    color: colors.buttonText,
                    borderRadius: colors.buttonRadius,
                  }
                : null),
            }}
          />
        </div>
      </div>
    </div>
  )
}
