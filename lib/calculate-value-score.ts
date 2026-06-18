export function calculateValueScore(
  rating: number | null | undefined,
  priceKES: number | null | undefined,
): number | null {
  if (!rating || !priceKES || priceKES <= 0) {
    return null
  }

  return Math.pow(10, rating - 4) / Math.sqrt(priceKES / 1000)
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

export function withComputedValueScore<T extends {
  vivino_rating?: string | number | null
  store_listings?: PriceListing[] | null
}>(wine: T): T & { valueScore: number | null } {
  const rating = parseWineRating(wine.vivino_rating)
  const priceKES = minWinePriceKES(wine.store_listings)

  return {
    ...wine,
    valueScore: calculateValueScore(rating, priceKES),
  }
}
