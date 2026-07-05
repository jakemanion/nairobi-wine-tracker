import { AuthNavLink } from '@/components/auth/auth-nav-link'
import type { CSSProperties } from 'react'

type LoginNavLinkProps = {
  className?: string
  style?: CSSProperties
  theme?: 'light' | 'dark'
  nextPath?: string
}

export function LoginNavLink({
  className = '',
  style,
  theme = 'light',
  nextPath = '/',
}: LoginNavLinkProps) {
  const href = `/login?next=${encodeURIComponent(nextPath)}`

  return (
    <AuthNavLink href={href} className={className} style={style} theme={theme}>
      Log in
    </AuthNavLink>
  )
}
