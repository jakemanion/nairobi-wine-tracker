import { describe, expect, it } from 'vitest'
import {
  VALUE_FIVE_STAR_THRESHOLD,
  VALUE_ONE_STAR_THRESHOLD,
  calculateValueScore,
  withComputedValueScore,
} from '@/lib/calculate-value-score'
import {
  DEFAULT_VALUE_SCORE_ANCHORS,
  type ValueScoreAnchor,
} from '@/lib/ratings/value-anchors'
import { valueScoreToStarRating } from '@/lib/ratings/value-star-rating'

describe('calculateValueScore', () => {
  it('returns null when rating or price is missing/invalid', () => {
    expect(calculateValueScore(null, 1000)).toBeNull()
    expect(calculateValueScore(4, null)).toBeNull()
    expect(calculateValueScore(4, 0)).toBeNull()
    expect(calculateValueScore(4, -100)).toBeNull()
  })

  it('hits 5★ and 1★ at default calibrated ceilings', () => {
    for (const row of DEFAULT_VALUE_SCORE_ANCHORS) {
      expect(calculateValueScore(row.quality_rating, row.five_star_max_price)).toBeCloseTo(
        VALUE_FIVE_STAR_THRESHOLD,
        5,
      )
      expect(
        valueScoreToStarRating(
          calculateValueScore(row.quality_rating, row.five_star_max_price),
        ),
      ).toBe(5)

      expect(calculateValueScore(row.quality_rating, row.one_star_price)).toBeCloseTo(
        VALUE_ONE_STAR_THRESHOLD,
        5,
      )
      expect(
        valueScoreToStarRating(calculateValueScore(row.quality_rating, row.one_star_price)),
      ).toBe(1)
    }
  })

  it('uses injectable anchors', () => {
    const custom: ValueScoreAnchor[] = [
      { quality_rating: 4, five_star_max_price: 2000, one_star_price: 4000 },
    ]
    expect(calculateValueScore(4, 2000, custom)).toBeCloseTo(VALUE_FIVE_STAR_THRESHOLD, 5)
    expect(calculateValueScore(4, 4000, custom)).toBeCloseTo(VALUE_ONE_STAR_THRESHOLD, 5)
    expect(valueScoreToStarRating(calculateValueScore(4, 2000, custom))).toBe(5)
    expect(valueScoreToStarRating(calculateValueScore(4, 4000, custom))).toBe(1)
  })

  it('allows quality 0 (does not treat it as missing)', () => {
    const score = calculateValueScore(0, 1000)
    expect(score).not.toBeNull()
    expect(score!).toBeGreaterThan(0)
  })

  it('rises with quality and falls with price', () => {
    const mid = calculateValueScore(4, 2500)!
    const betterQuality = calculateValueScore(4.5, 2500)!
    const cheaper = calculateValueScore(4, 1500)!
    expect(betterQuality).toBeGreaterThan(mid)
    expect(cheaper).toBeGreaterThan(mid)
  })
})

describe('withComputedValueScore', () => {
  const listings = [{ current_price_ksh: 2500 }]

  it('uses quality_rating when no override', () => {
    const result = withComputedValueScore({
      quality_rating: 4,
      quality_rating_override: null,
      store_listings: listings,
    })
    expect(result.valueScore).toBeCloseTo(VALUE_FIVE_STAR_THRESHOLD, 5)
  })

  it('prefers quality_rating_override for value', () => {
    const without = withComputedValueScore({
      quality_rating: 4,
      quality_rating_override: null,
      store_listings: listings,
    })
    const withOverride = withComputedValueScore({
      quality_rating: 4,
      quality_rating_override: 3.25,
      store_listings: listings,
    })
    expect(withOverride.valueScore).not.toBeNull()
    expect(withOverride.valueScore!).toBeLessThan(without.valueScore!)
    expect(withOverride.valueScore).toBeCloseTo(calculateValueScore(3.25, 2500)!, 5)
  })

  it('passes injectable anchors through', () => {
    const custom: ValueScoreAnchor[] = [
      { quality_rating: 4, five_star_max_price: 2500, one_star_price: 8000 },
    ]
    const result = withComputedValueScore(
      {
        quality_rating: 4,
        quality_rating_override: null,
        store_listings: [{ current_price_ksh: 8000 }],
      },
      custom,
    )
    expect(result.valueScore).toBeCloseTo(VALUE_ONE_STAR_THRESHOLD, 5)
  })
})
