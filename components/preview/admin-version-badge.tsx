import { APP_VERSION } from '@/lib/app-version'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type AdminVersionBadgeProps = {
  colors: PreviewColors
}

/** Visible only to admins so deployed builds can be identified at a glance. */
export function AdminVersionBadge({ colors }: AdminVersionBadgeProps) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold tabular-nums tracking-wide px-1.5 py-0.5 flex-shrink-0"
      style={{
        color: colors.headerSub,
        background: colors.buttonBg,
        border: `1px solid ${colors.buttonBorder}`,
        borderRadius: colors.panelRadius,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}
      title={`App version ${APP_VERSION}`}
    >
      v{APP_VERSION}
    </span>
  )
}
