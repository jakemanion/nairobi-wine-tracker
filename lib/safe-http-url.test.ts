import { describe, expect, it } from 'vitest'
import {
  isSafeHttpUrl,
  normalizeOptionalHttpUrl,
  sanitizeHttpUrl,
} from '@/lib/safe-http-url'

describe('sanitizeHttpUrl', () => {
  it('allows http and https', () => {
    expect(sanitizeHttpUrl('https://www.vivino.com/wines/123')).toBe(
      'https://www.vivino.com/wines/123',
    )
    expect(sanitizeHttpUrl('http://shop.example/wine')).toBe('http://shop.example/wine')
  })

  it('rejects dangerous or relative schemes', () => {
    expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeHttpUrl('data:text/html,<script>')).toBeNull()
    expect(sanitizeHttpUrl('//evil.example')).toBeNull()
    expect(sanitizeHttpUrl('/relative')).toBeNull()
    expect(sanitizeHttpUrl('not a url')).toBeNull()
    expect(sanitizeHttpUrl('')).toBeNull()
    expect(sanitizeHttpUrl(null)).toBeNull()
  })
})

describe('normalizeOptionalHttpUrl', () => {
  it('clears empty values', () => {
    expect(normalizeOptionalHttpUrl(null)).toEqual({ ok: true, value: null })
    expect(normalizeOptionalHttpUrl('')).toEqual({ ok: true, value: null })
    expect(normalizeOptionalHttpUrl('   ')).toEqual({
      ok: false,
      error: 'URL must be an absolute http:// or https:// link.',
    })
  })

  it('accepts safe urls and rejects others', () => {
    expect(normalizeOptionalHttpUrl('https://example.com')).toEqual({
      ok: true,
      value: 'https://example.com',
    })
    expect(normalizeOptionalHttpUrl('javascript:alert(1)').ok).toBe(false)
    expect(isSafeHttpUrl('https://ok')).toBe(true)
    expect(isSafeHttpUrl('javascript:x')).toBe(false)
  })
})
