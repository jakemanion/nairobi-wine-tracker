'use client'

import type { CSSProperties } from 'react'

type ShowShortlistOnlyButtonProps = {
  active: boolean
  onChange: (active: boolean) => void
  className?: string
  style?: CSSProperties
  theme?: 'light' | 'dark'
}

export function ShowShortlistOnlyButton({
  active,
  onChange,
  className = '',
  style,
  theme = 'light',
}: ShowShortlistOnlyButtonProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg flex-shrink-0 ${className}`}
      style={{
        background: active ? (isDark ? '#14141A' : '#FAF9F7') : isDark ? '#1E1E26' : '#fff',
        border: `1px solid ${active ? '#C93048' : isDark ? '#3A3848' : '#ccc'}`,
        color: active
          ? isDark
            ? '#F5F2EC'
            : '#1A1814'
          : isDark
            ? '#C8C4D0'
            : '#171717',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        cursor: 'pointer',
        ...style,
      }}
      onClick={() => onChange(!active)}
    >
      Shortlist only
    </button>
  )
}
