'use client'

import { useRouter } from 'next/navigation'
import { useState, type CSSProperties } from 'react'
import { signOut } from '@/lib/auth/sign-out'

type LogoutButtonProps = {
  className?: string
  style?: CSSProperties
  theme?: 'light' | 'dark'
}

export function LogoutButton({ className = '', style, theme = 'light' }: LogoutButtonProps) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const isDark = theme === 'dark'

  async function handleLogout() {
    if (signingOut) return

    setSigningOut(true)
    const result = await signOut()
    setSigningOut(false)

    if (result.status === 'error') {
      window.alert(result.message)
      return
    }

    router.push('/preview')
    router.refresh()
  }

  return (
    <button
      type="button"
      className={`flex items-center text-xs px-3 py-2 rounded-lg flex-shrink-0 ${className}`}
      style={{
        background: isDark ? '#1E1E26' : '#fff',
        border: `1px solid ${isDark ? '#3A3848' : '#ccc'}`,
        color: isDark ? '#C8C4D0' : '#171717',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        cursor: signingOut ? 'wait' : 'pointer',
        opacity: signingOut ? 0.6 : 1,
        ...style,
      }}
      disabled={signingOut}
      onClick={() => void handleLogout()}
    >
      Log out
    </button>
  )
}
