'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getPreviewColors,
  VISUAL_STYLE_STORAGE_KEY,
  type PreviewColors,
  type PreviewThemeMode,
  type PreviewVisualStyle,
} from '@/lib/preview/preview-colors'

type PreviewThemeContextValue = {
  mode: PreviewThemeMode
  visualStyle: PreviewVisualStyle
  colors: PreviewColors
  toggleMode: () => void
  setMode: (mode: PreviewThemeMode) => void
  setVisualStyle: (style: PreviewVisualStyle) => void
  toggleVisualStyle: () => void
}

const PreviewThemeContext = createContext<PreviewThemeContextValue | null>(null)

function persistVisualStyle(style: PreviewVisualStyle) {
  try {
    window.localStorage.setItem(VISUAL_STYLE_STORAGE_KEY, style)
  } catch {
    // Ignore storage write errors and keep in-memory state.
  }
}

export function PreviewThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PreviewThemeMode>('dark')
  const [visualStyle, setVisualStyleState] = useState<PreviewVisualStyle>('classic')
  const colors = getPreviewColors(mode, visualStyle)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VISUAL_STYLE_STORAGE_KEY)
      if (stored === 'trial' || stored === 'classic') setVisualStyleState(stored)
    } catch {
      // Ignore storage access errors and keep defaults.
    }
  }, [])

  function toggleMode() {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  function setVisualStyle(style: PreviewVisualStyle) {
    setVisualStyleState(style)
    persistVisualStyle(style)
  }

  function toggleVisualStyle() {
    setVisualStyleState((current) => {
      const next = current === 'classic' ? 'trial' : 'classic'
      persistVisualStyle(next)
      return next
    })
  }

  const value = useMemo<PreviewThemeContextValue>(
    () => ({
      mode,
      visualStyle,
      colors,
      toggleMode,
      setMode,
      setVisualStyle,
      toggleVisualStyle,
    }),
    [mode, visualStyle, colors],
  )

  return <PreviewThemeContext.Provider value={value}>{children}</PreviewThemeContext.Provider>
}

export function usePreviewTheme() {
  const value = useContext(PreviewThemeContext)
  if (!value) {
    throw new Error('usePreviewTheme must be used within PreviewThemeProvider')
  }
  return value
}
