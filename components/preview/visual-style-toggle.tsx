'use client'

import type { CSSProperties } from 'react'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type VisualStyleToggleProps = {
  colors?: PreviewColors
  className?: string
  style?: CSSProperties
}

export function VisualStyleToggle({
  colors: colorsProp,
  className = '',
  style,
}: VisualStyleToggleProps) {
  const { colors: themeColors, visualStyle, setVisualStyle } = usePreviewTheme()
  const colors = colorsProp ?? themeColors
  const trialOn = visualStyle === 'trial'

  return (
    <label
      className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 ${className}`}
      style={{
        border: `1px solid ${colors.buttonBorder}`,
        background: colors.buttonBg,
        color: colors.buttonText,
        borderRadius: colors.panelRadius,
        fontFamily: 'var(--font-dm-sans), sans-serif',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <input
        type="checkbox"
        checked={trialOn}
        onChange={(event) => setVisualStyle(event.target.checked ? 'trial' : 'classic')}
        className="accent-current"
        style={{ accentColor: colors.accent }}
        aria-label="Toggle trial visual style"
      />
      Trial style
    </label>
  )
}
