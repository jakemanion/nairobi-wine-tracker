'use client'

import { useUsageTips } from '@/components/preview/usage-tips-context'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type UsageTipsToggleProps = {
  colors: PreviewColors
}

export function UsageTipsToggle({ colors }: UsageTipsToggleProps) {
  const { enabled, setEnabled } = useUsageTips()

  return (
    <label
      className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md"
      style={{
        color: colors.headerSub,
        border: `1px solid ${colors.headerBorder}`,
        background: colors.toolbarBg,
        fontFamily: 'var(--font-dm-sans), sans-serif',
        whiteSpace: 'nowrap',
      }}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
        className="accent-[#C93048]"
        aria-label="Toggle show tips"
      />
      Show tips
    </label>
  )
}
