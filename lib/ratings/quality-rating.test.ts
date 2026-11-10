import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VIVINO_STAR_LOOKUP,
  effectiveQualityRating,
  isValidQualityOverride,
  vivinoToQualityRating,
} from '@/lib/ratings/quality-rating'

describe('vivinoToQualityRating', () => {
  it('returns null for missing values', () => {
    expect(vivinoToQualityRating(null)).toBeNull()
    expect(vivinoToQualityRating(undefined)).toBeNull()
    expect(vivinoToQualityRating(Number.NaN)).toBeNull()
  })

  it('maps ≤3 to 0', () => {
    expect(vivinoToQualityRating(3)).toBe(0)
    expect(vivinoToQualityRating(2.5)).toBe(0)
  })

  it('uses the default lookup table', () => {
    expect(vivinoToQualityRating(3.5)).toBe(3)
    expect(vivinoToQualityRating(4.0)).toBe(4.25)
    expect(vivinoToQualityRating(4.3)).toBe(5)
  })

  it('respects a custom lookup table', () => {
    expect(vivinoToQualityRating(3.5, { '3.5': 1.5 })).toBe(1.5)
  })
})

describe('effectiveQualityRating', () => {
  it('prefers override when set', () => {
    expect(
      effectiveQualityRating({
        quality_rating: 4,
        quality_rating_override: 2.5,
      }),
    ).toBe(2.5)
  })

  it('falls back to calculated', () => {
    expect(
      effectiveQualityRating({
        quality_rating: 4,
        quality_rating_override: null,
      }),
    ).toBe(4)
  })
})

describe('isValidQualityOverride', () => {
  it('allows null and 0.25 steps', () => {
    expect(isValidQualityOverride(null)).toBe(true)
    expect(isValidQualityOverride(0)).toBe(true)
    expect(isValidQualityOverride(3.25)).toBe(true)
    expect(isValidQualityOverride(5)).toBe(true)
  })

  it('rejects out of range or non-step values', () => {
    expect(isValidQualityOverride(-0.25)).toBe(false)
    expect(isValidQualityOverride(5.25)).toBe(false)
    expect(isValidQualityOverride(3.1)).toBe(false)
  })
})

describe('DEFAULT_VIVINO_STAR_LOOKUP', () => {
  it('includes the seeded keys', () => {
    expect(DEFAULT_VIVINO_STAR_LOOKUP['3.0']).toBe(0)
    expect(DEFAULT_VIVINO_STAR_LOOKUP['5.0']).toBe(5)
  })
})
