'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import { WELCOME_DISMISSED_STORAGE_KEY, WELCOME_PANEL } from '@/lib/preview/usage-tips'

export function WelcomePanel() {
  const { colors } = usePreviewTheme()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(WELCOME_DISMISSED_STORAGE_KEY) !== 'true')
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      window.localStorage.setItem(WELCOME_DISMISSED_STORAGE_KEY, 'true')
    } catch {
      // Ignore storage write errors.
    }
  }

  if (!visible) return null

  return (
    <div
      className="px-4 py-3 text-center relative"
      style={{
        background: colors.toolbarBg,
        border: `1px solid ${colors.toolbarBorder}`,
        borderRadius: colors.panelRadius,
      }}
    >
      <button
        type="button"
        aria-label="Dismiss welcome message"
        className="absolute top-2 right-2 inline-flex items-center justify-center rounded-sm hover:opacity-80"
        style={{ color: colors.muted }}
        onClick={dismiss}
      >
        <X className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
      <p
        className="m-0 text-sm font-semibold"
        style={{ color: colors.surfaceTitle, fontFamily: colors.headingFont }}
      >
        {WELCOME_PANEL.heading}
      </p>
      <p
        className="m-0 mt-2 text-[11px] leading-relaxed max-w-[42rem] mx-auto"
        style={{ color: colors.surfaceSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {WELCOME_PANEL.body}
      </p>
    </div>
  )
}
