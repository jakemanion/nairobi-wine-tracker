import Link from 'next/link'
import type { CSSProperties } from 'react'

type RegisterNavLinkProps = {
  className?: string
  style?: CSSProperties
  theme?: 'light' | 'dark'
}

export function RegisterNavLink({
  className = '',
  style,
  theme = 'light',
}: RegisterNavLinkProps) {
  const isDark = theme === 'dark'

  return (
    <Link
      href="/register"
      className={`flex items-center text-xs px-3 py-2 rounded-lg flex-shrink-0 no-underline ${className}`}
      style={{
        background: isDark ? '#1E1E26' : '#fff',
        border: `1px solid ${isDark ? '#3A3848' : '#ccc'}`,
        color: isDark ? '#C8C4D0' : '#171717',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        ...style,
      }}
    >
      Register
    </Link>
  )
}
