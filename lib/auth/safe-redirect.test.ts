import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'

describe('safeRedirectPath', () => {
  it('allows plain relative paths', () => {
    expect(safeRedirectPath('/')).toBe('/')
    expect(safeRedirectPath('/admin')).toBe('/admin')
    expect(safeRedirectPath('/auth/update-password')).toBe('/auth/update-password')
    expect(safeRedirectPath('/share/abc-123')).toBe('/share/abc-123')
  })

  it('rejects open redirects', () => {
    expect(safeRedirectPath('//evil.example')).toBe('/')
    expect(safeRedirectPath('https://evil.example')).toBe('/')
    expect(safeRedirectPath('/\\evil.example')).toBe('/')
    expect(safeRedirectPath('evil.example')).toBe('/')
    expect(safeRedirectPath('/%2f%2fevil.example')).toBe('/')
  })

  it('rejects query and hash', () => {
    expect(safeRedirectPath('/admin?x=1')).toBe('/')
    expect(safeRedirectPath('/admin#x')).toBe('/')
  })

  it('uses a custom fallback', () => {
    expect(safeRedirectPath('//evil', '/auth/update-password')).toBe('/auth/update-password')
  })
})
