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
    expect(valueScoreToStarRating(0.5)).toBe(4)
    expect(valueScoreToStarRating(1.5)).toBe(5)
    expect(valueScoreToStarRating(3)).toBe(5)
  })

  it('interpolates in quarter steps', () => {
    expect(valueScoreToStarRating(0.3)).toBe(2)
    expect(valueScoreToStarRating(1.0)).toBe(4.5)
  })

  it('does not round up to 5 below the threshold', () => {
    expect(valueScoreToStarRating(1.499)).toBe(4.75)
  })
})
