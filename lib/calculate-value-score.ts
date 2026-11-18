import { effectiveQualityRating } from '@/lib/ratings/quality-rating'

/**
 * Value score from site quality stars (override ?? calculated) and min price.
 *
 * Calibration: at each anchor quality, price ≤ maxPrice still maps to 5 value
 * stars (raw score ≥ 1.5). Between anchors, maxPrice is linearly interpolated.
 *
 *   value = 1.5 × √(maxPrice(quality) / priceKES)
 */
export const VALUE_FIVE_STAR_THRESHOLD = 1.5

/** Quality → max KES price that still earns 5 value stars. */
export const VALUE_FIVE_STAR_PRICE_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [3.25, 1500],
  [3.5, 2000],
  [3.75, 2250],
  [4, 2500],
  [4.25, 3000],
  [4.5, 4000],
  [4.75, 4500],
  [5, 10000],
]

/** Max price (KES) for 5★ value at this quality; linear between anchors. */
export function maxPriceForFiveStarValue(quality: number): number {
  const anchors = VALUE_FIVE_STAR_PRICE_ANCHORS
  const first = anchors[0]
  const last = anchors[anchors.length - 1]

  if (quality <= first[0]) {
    const [q0, p0] = first
    const [q1, p1] = anchors[1]
    const slope = (p1 - p0) / (q1 - q0)
    return p0 + (quality - q0) * slope
  }

  if (quality >= last[0]) {
    return last[1]
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const [q0, p0] = anchors[i]
    const [q1, p1] = anchors[i + 1]
    if (quality >= q0 && quality <= q1) {
      const t = (quality - q0) / (q1 - q0)
      return p0 + t * (p1 - p0)
    }
  }

  return last[1]
}

export function calculateValueScore(
  rating: number | null | undefined,
  priceKES: number | null | undefined,
): number | null {
  if (rating == null || !Number.isFinite(rating) || !priceKES || priceKES <= 0) {
    return null
  }

  const maxPrice = maxPriceForFiveStarValue(rating)
  // Non-positive ceiling → never reaches 5★; keep a tiny positive floor for ranking.
  const ceiling = Math.max(maxPrice, 1)
  return VALUE_FIVE_STAR_THRESHOLD * Math.sqrt(ceiling / priceKES)
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
>(wine: T): T & { valueScore: number | null } {
  const rating = effectiveQualityRating(wine)
  const priceKES = minWinePriceKES(wine.store_listings)

  return {
    ...wine,
    valueScore: calculateValueScore(rating, priceKES),
  }
}
