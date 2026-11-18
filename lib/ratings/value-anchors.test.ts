import { describe, expect, it } from 'vitest'
import {
  VALUE_MATRIX_PRICE_COLUMNS,
  applyValueAnchorDraftClick,
  isValidValueAnchorPair,
  vivinoLabelForQuality,
} from '@/lib/ratings/value-anchors'

describe('VALUE_MATRIX_PRICE_COLUMNS', () => {
  it('uses 200s to 1k, 500s to 10k, then 2k steps to 100k', () => {
    expect(VALUE_MATRIX_PRICE_COLUMNS[0]).toBe(0)
    expect(VALUE_MATRIX_PRICE_COLUMNS).toContain(200)
    expect(VALUE_MATRIX_PRICE_COLUMNS).toContain(1000)
    expect(VALUE_MATRIX_PRICE_COLUMNS).toContain(1500)
    expect(VALUE_MATRIX_PRICE_COLUMNS).toContain(9500)
    expect(VALUE_MATRIX_PRICE_COLUMNS).toContain(10000)
    expect(VALUE_MATRIX_PRICE_COLUMNS).not.toContain(2250)
    expect(VALUE_MATRIX_PRICE_COLUMNS).toContain(12000)
    expect(VALUE_MATRIX_PRICE_COLUMNS).toContain(98000)
    expect(VALUE_MATRIX_PRICE_COLUMNS.at(-1)).toBe(100000)
  })
})

describe('isValidValueAnchorPair', () => {
  it('requires one-star price above five-star max', () => {
    expect(isValidValueAnchorPair(1500, 3000)).toBe(true)
    expect(isValidValueAnchorPair(3000, 3000)).toBe(false)
    expect(isValidValueAnchorPair(4000, 3000)).toBe(false)
    expect(isValidValueAnchorPair(0, 3000)).toBe(false)
  })
})

describe('applyValueAnchorDraftClick', () => {
  it('sets five-star ceiling', () => {
    const result = applyValueAnchorDraftClick({
      quality: 4,
      price: 2500,
      mode: 'five_star',
      current: null,
    })
    expect(result.error).toBeUndefined()
    expect(result.draft).toEqual({
      quality_rating: 4,
      five_star_max_price: 2500,
      one_star_price: null,
    })
  })

  it('rejects one-star at or below five-star', () => {
    const result = applyValueAnchorDraftClick({
      quality: 4,
      price: 2500,
      mode: 'one_star',
      current: {
        quality_rating: 4,
        five_star_max_price: 2500,
        one_star_price: 5500,
      },
    })
    expect(result.error).toMatch(/must be above/)
  })

  it('rejects five-star at or above one-star', () => {
    const result = applyValueAnchorDraftClick({
      quality: 4,
      price: 5500,
      mode: 'five_star',
      current: {
        quality_rating: 4,
        five_star_max_price: 2500,
        one_star_price: 5500,
      },
    })
    expect(result.error).toMatch(/must be below/)
  })
})

describe('vivinoLabelForQuality', () => {
  const lookup = [
    { vivino_key: '3.5', star_rating: 3 },
    { vivino_key: '4.0', star_rating: 4.25 },
    { vivino_key: '4.3', star_rating: 5 },
    { vivino_key: '4.4', star_rating: 5 },
    { vivino_key: '5.0', star_rating: 5 },
  ]

  it('returns a single key', () => {
    expect(vivinoLabelForQuality(3, lookup)).toBe('3.5')
    expect(vivinoLabelForQuality(4.25, lookup)).toBe('4.0')
  })

  it('returns a range for shared quality', () => {
    expect(vivinoLabelForQuality(5, lookup)).toBe('4.3–5.0')
  })

  it('returns em dash when unmapped', () => {
    expect(vivinoLabelForQuality(2, lookup)).toBe('—')
  })
})
