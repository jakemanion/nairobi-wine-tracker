import { AuthNavLink } from '@/components/auth/auth-nav-link'
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
  return (
    <AuthNavLink href="/register" className={className} style={style} theme={theme}>
      Register
    </AuthNavLink>
  )
}
