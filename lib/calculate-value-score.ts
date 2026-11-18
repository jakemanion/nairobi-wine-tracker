import { effectiveQualityRating } from '@/lib/ratings/quality-rating'
import {
  DEFAULT_VALUE_SCORE_ANCHOR_TABLES,
  anchorsToTables,
  maxPriceForFiveStarValue,
  priceForOneStarValue,
  type ValueScoreAnchor,
  type ValueScoreAnchorTables,
} from '@/lib/ratings/value-anchors'

/**
 * Value score from site quality stars (override ?? calculated) and min price.
 *
 * Dual calibration per quality (linear between anchors):
 * - price ≤ fiveStarMax  → raw ≥ 1.5 → 5 value stars
 * - price = oneStarAt     → raw = 0.2 → 1 value star
 *
 * Between those prices, a quality-specific power curve connects the anchors:
 *   value = 1.5 × (fiveStarMax / price) ^ α
 *   α = log(0.2 / 1.5) / log(fiveStarMax / oneStarAt)
 */
export const VALUE_FIVE_STAR_THRESHOLD = 1.5
export const VALUE_ONE_STAR_THRESHOLD = 0.2

/** @deprecated Prefer DEFAULT_VALUE_SCORE_ANCHORS / loaded DB anchors. */
export const VALUE_FIVE_STAR_PRICE_ANCHORS = DEFAULT_VALUE_SCORE_ANCHOR_TABLES.fiveStar
/** @deprecated Prefer DEFAULT_VALUE_SCORE_ANCHORS / loaded DB anchors. */
export const VALUE_ONE_STAR_PRICE_ANCHORS = DEFAULT_VALUE_SCORE_ANCHOR_TABLES.oneStar

export {
  maxPriceForFiveStarValue,
  priceForOneStarValue,
} from '@/lib/ratings/value-anchors'

export function resolveValueAnchorTables(
  anchors?: readonly ValueScoreAnchor[] | ValueScoreAnchorTables | null,
): ValueScoreAnchorTables {
  if (!anchors) return DEFAULT_VALUE_SCORE_ANCHOR_TABLES
  if (Array.isArray(anchors)) {
    if (anchors.length === 0) return DEFAULT_VALUE_SCORE_ANCHOR_TABLES
    return anchorsToTables(anchors as ValueScoreAnchor[])
  }
  return anchors as ValueScoreAnchorTables
}

export function calculateValueScore(
  rating: number | null | undefined,
  priceKES: number | null | undefined,
  anchors?: readonly ValueScoreAnchor[] | ValueScoreAnchorTables | null,
): number | null {
  if (rating == null || !Number.isFinite(rating) || !priceKES || priceKES <= 0) {
    return null
  }

  const tables = resolveValueAnchorTables(anchors)
  const fiveStarMax = Math.max(maxPriceForFiveStarValue(rating, tables), 1)
  const oneStarAt = Math.max(priceForOneStarValue(rating, tables), fiveStarMax * 1.01)

  if (Math.abs(priceKES - fiveStarMax) <= 1e-6) return VALUE_FIVE_STAR_THRESHOLD
  if (Math.abs(priceKES - oneStarAt) <= 1e-6) return VALUE_ONE_STAR_THRESHOLD

  const alpha =
    Math.log(VALUE_ONE_STAR_THRESHOLD / VALUE_FIVE_STAR_THRESHOLD) /
    Math.log(fiveStarMax / oneStarAt)

  return VALUE_FIVE_STAR_THRESHOLD * Math.pow(fiveStarMax / priceKES, alpha)
}

export function parseWineRating(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

type PriceListing = {
  current_price_ksh?: string | number | null
}

export function minWinePriceKES(
  listings: PriceListing[] | null | undefined,
): number | null {
  if (!listings?.length) return null

  let min: number | null = null
  for (const listing of listings) {
    const price = listing?.current_price_ksh
    if (price == null) continue
    const n = typeof price === 'number' ? price : parseFloat(String(price))
    if (!Number.isFinite(n)) continue
    min = min == null ? n : Math.min(min, n)
  }

  return min
}

export function withComputedValueScore<
  T extends {
    quality_rating?: string | number | null
    quality_rating_override?: string | number | null
    store_listings?: PriceListing[] | null
  },
>(
  wine: T,
  anchors?: readonly ValueScoreAnchor[] | ValueScoreAnchorTables | null,
): T & { valueScore: number | null } {
  const rating = effectiveQualityRating(wine)
  const priceKES = minWinePriceKES(wine.store_listings)

  return {
    ...wine,
    valueScore: calculateValueScore(rating, priceKES, anchors),
  }
}
