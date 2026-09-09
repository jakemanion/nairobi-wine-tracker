'use client'

import type { PreviewColors } from '@/lib/preview/preview-colors'
import { Check } from 'lucide-react'

/** Small on-state check badge used on filter toggles and wine-card review buttons. */
export function ReviewOnTick({
  colors,
  accentColor,
}: {
  colors: PreviewColors
  accentColor?: string
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inline-flex items-center justify-center"
      style={{
        left: -2,
        bottom: -2,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: `0 0 0 1px ${colors.buttonBorder ?? colors.controlIdleBorder}`,
      }}
    >
      <Check size={10} strokeWidth={2.5} style={{ color: accentColor ?? colors.accent }} />
    </span>
  )
}
