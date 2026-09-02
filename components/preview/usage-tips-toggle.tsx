'use client'

import type { CSSProperties } from 'react'
import { useUsageTips } from '@/components/preview/usage-tips-context'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type UsageTipsToggleProps = {
  colors: PreviewColors
  className?: string
  style?: CSSProperties
}

export function UsageTipsToggle({
  colors,
  className = '',
  style,
}: UsageTipsToggleProps) {
  const { enabled, setEnabled } = useUsageTips()

  return (
    <label
      className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md ${className}`}
      style={{
        color: colors.buttonText,
        border: `1px solid ${colors.buttonBorder}`,
        background: colors.toolbarBg,
        borderRadius: colors.panelRadius,
        fontFamily: 'var(--font-dm-sans), sans-serif',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
        className="accent-current"
        style={{ accentColor: colors.headerAccent }}
        aria-label="Toggle show tips"
      />
      Show tips
    </label>
  )
}
