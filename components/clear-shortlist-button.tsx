'use client'

import { useState, type CSSProperties } from 'react'
import { clearUserShortlist } from '@/lib/reviews'

type ClearShortlistButtonProps = {
  userId: string
  onCleared: () => void
  className?: string
  style?: CSSProperties
  theme?: 'light' | 'dark'
}

export function ClearShortlistButton({
  userId,
  onCleared,
  className = '',
  style,
  theme = 'light',
}: ClearShortlistButtonProps) {
  const [clearing, setClearing] = useState(false)

  async function handleClear() {
    if (clearing) return
    if (!window.confirm('Clear your entire shortlist?')) return

    setClearing(true)
    const result = await clearUserShortlist(userId)
    setClearing(false)

    if (result.error) {
      window.alert(result.error)
      return
    }

    onCleared()
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg flex-shrink-0 ${className}`}
      style={{
        background: isDark ? '#1E1E26' : '#fff',
        border: `1px solid ${isDark ? '#3A3848' : '#ccc'}`,
        color: isDark ? '#C8C4D0' : '#171717',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        cursor: clearing ? 'wait' : 'pointer',
        opacity: clearing ? 0.6 : 1,
        ...style,
      }}
      disabled={clearing}
      onClick={() => void handleClear()}
    >
      Clear Shortlist
    </button>
  )
}
