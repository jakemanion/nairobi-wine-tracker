'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  getPreviewColors,
  type PreviewColors,
  type PreviewThemeMode,
} from '@/lib/preview/preview-colors'

type PreviewThemeContextValue = {
  mode: PreviewThemeMode
  colors: PreviewColors
  toggleMode: () => void
  setMode: (mode: PreviewThemeMode) => void
}

const PreviewThemeContext = createContext<PreviewThemeContextValue | null>(null)

export function PreviewThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PreviewThemeMode>('dark')
  const colors = getPreviewColors(mode)

  function toggleMode() {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <PreviewThemeContext.Provider value={{ mode, colors, toggleMode, setMode }}>
      {children}
    </PreviewThemeContext.Provider>
  )
}

export function usePreviewTheme() {
  const value = useContext(PreviewThemeContext)
  if (!value) {
    throw new Error('usePreviewTheme must be used within PreviewThemeProvider')
  }
  return value
}
