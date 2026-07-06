'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { USAGE_TIPS_STORAGE_KEY } from '@/lib/preview/usage-tips'

type UsageTipsContextValue = {
  enabled: boolean
  setEnabled: (next: boolean) => void
  hideAllTips: () => void
}

const UsageTipsContext = createContext<UsageTipsContextValue | null>(null)

type UsageTipsProviderProps = {
  children: ReactNode
  isLoggedIn: boolean
}

export function UsageTipsProvider({ children, isLoggedIn }: UsageTipsProviderProps) {
  const [enabled, setEnabledState] = useState(true)

  useEffect(() => {
    if (!isLoggedIn) return
    try {
      const stored = window.localStorage.getItem(USAGE_TIPS_STORAGE_KEY)
      if (stored === 'off') setEnabledState(false)
      if (stored === 'on') setEnabledState(true)
    } catch {
      // Ignore storage access errors and keep defaults.
    }
  }, [isLoggedIn])

  function persistEnabled(next: boolean) {
    setEnabledState(next)
    try {
      window.localStorage.setItem(USAGE_TIPS_STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // Ignore storage write errors and keep in-memory state.
    }
  }

  const value = useMemo<UsageTipsContextValue>(
    () => ({
      enabled: isLoggedIn && enabled,
      setEnabled: persistEnabled,
      hideAllTips: () => persistEnabled(false),
    }),
    [enabled, isLoggedIn],
  )

  return <UsageTipsContext.Provider value={value}>{children}</UsageTipsContext.Provider>
}

export function useUsageTips(): UsageTipsContextValue {
  const context = useContext(UsageTipsContext)
  if (!context) {
    throw new Error('useUsageTips must be used within UsageTipsProvider')
  }
  return context
}
