import { describe, expect, it } from 'vitest'
import { valueScoreToStarRating } from '@/lib/ratings/value-star-rating'

describe('valueScoreToStarRating', () => {
  it('returns null for missing values', () => {
    expect(valueScoreToStarRating(null)).toBeNull()
    expect(valueScoreToStarRating(undefined)).toBeNull()
    expect(valueScoreToStarRating(Number.NaN)).toBeNull()
  })

  it('maps anchors', () => {
    expect(valueScoreToStarRating(0.05)).toBe(0)
    expect(valueScoreToStarRating(0.1)).toBe(0)
    expect(valueScoreToStarRating(0.2)).toBe(1)
    expect(valueScoreToStarRating(1.5)).toBe(5)
    expect(valueScoreToStarRating(3)).toBe(5)
  })

  it('interpolates in quarter steps between 1★ and 5★', () => {
    // midpoint raw 0.85 → 3★
    expect(valueScoreToStarRating(0.85)).toBe(3)
    expect(valueScoreToStarRating(1.0)).toBe(3.5)
  })

  it('does not round across thresholds', () => {
    expect(valueScoreToStarRating(1.499)).toBe(4.75)
    expect(valueScoreToStarRating(0.199)).toBe(0.75)
  })
})
