'use client'

import { LogoutButton } from '@/components/auth/logout-button'
import { UsageTipsToggle } from '@/components/preview/usage-tips-toggle'
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
  const accountLabel = userName.trim() || userEmail.trim() || 'Account'
  const initial = accountLabel.charAt(0).toUpperCase()

  return (
    <div className="relative group/user-menu">
      <button
        type="button"
        aria-label={`Open account menu for ${accountLabel}`}
        title={userName && userEmail ? `${userName} · ${userEmail}` : accountLabel}
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
        style={{
          background: '#C93048',
          border: `1px solid ${colors.buttonBorder}`,
          color: '#FFFFFF',
          cursor: 'pointer',
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}
      >
        {initial}
      </button>

      <div
        className="invisible absolute right-0 top-full z-[60] w-48 pt-2 opacity-0 transition-opacity duration-150 group-hover/user-menu:visible group-hover/user-menu:opacity-100 group-focus-within/user-menu:visible group-focus-within/user-menu:opacity-100"
        aria-label="Account menu"
      >
        <div
          className="flex flex-col gap-2 rounded-lg p-2.5"
          style={{
            background: colors.toolbarBg,
            border: `1px solid ${colors.toolbarBorder}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <UsageTipsToggle
            colors={colors}
            className="w-full justify-between"
          />
          <LogoutButton
            theme={theme}
            className="w-full justify-center"
            style={{ padding: '6px 10px' }}
          />
        </div>
      </div>
    </div>
  )
}
