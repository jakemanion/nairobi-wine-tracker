import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

type AuthNavLinkProps = {
  href: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  theme?: 'light' | 'dark'
}

export function AuthNavLink({
  href,
  children,
  className = '',
  style,
  theme = 'light',
}: AuthNavLinkProps) {
  const isDark = theme === 'dark'

  return (
    <Link
      href={href}
      className={`inline-flex flex-shrink-0 items-center rounded-lg px-2 py-1.5 text-[11px] no-underline sm:px-3 sm:py-2 sm:text-xs ${className}`}
      style={{
        background: isDark ? '#1E1E26' : '#fff',
        border: `1px solid ${isDark ? '#3A3848' : '#ccc'}`,
        color: isDark ? '#C8C4D0' : '#171717',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        ...style,
      }}
    >
      {children}
    </Link>
  )
}
