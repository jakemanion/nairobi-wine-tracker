import { describe, expect, it } from 'vitest'
import {
  VALUE_FIVE_STAR_PRICE_ANCHORS,
  VALUE_FIVE_STAR_THRESHOLD,
  calculateValueScore,
  maxPriceForFiveStarValue,
  withComputedValueScore,
} from '@/lib/calculate-value-score'
import { valueScoreToStarRating } from '@/lib/ratings/value-star-rating'

describe('maxPriceForFiveStarValue', () => {
  it('returns anchor prices exactly', () => {
    for (const [quality, price] of VALUE_FIVE_STAR_PRICE_ANCHORS) {
      expect(maxPriceForFiveStarValue(quality)).toBe(price)
    }
  })

  it('interpolates between anchors', () => {
    expect(maxPriceForFiveStarValue(3.625)).toBeCloseTo(2125, 5)
  })
})

describe('calculateValueScore', () => {
  it('returns null when rating or price is missing/invalid', () => {
    expect(calculateValueScore(null, 1000)).toBeNull()
    expect(calculateValueScore(4, null)).toBeNull()
    expect(calculateValueScore(4, 0)).toBeNull()
    expect(calculateValueScore(4, -100)).toBeNull()
  })

  it('hits 5★ value at each calibrated quality/price ceiling', () => {
    for (const [quality, price] of VALUE_FIVE_STAR_PRICE_ANCHORS) {
      const score = calculateValueScore(quality, price)!
      expect(score).toBeCloseTo(VALUE_FIVE_STAR_THRESHOLD, 5)
      expect(valueScoreToStarRating(score)).toBe(5)
      expect(valueScoreToStarRating(calculateValueScore(quality, price * 0.9))).toBe(5)
    }
  })

  it('drops below 5★ just above the ceiling', () => {
    const score = calculateValueScore(4, 2501)!
    expect(score).toBeLessThan(VALUE_FIVE_STAR_THRESHOLD)
    expect(valueScoreToStarRating(score)).toBeLessThan(5)
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
})
