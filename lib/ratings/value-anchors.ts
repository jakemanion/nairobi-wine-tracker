import { isValidQualityOverride, parseRatingNumber } from '@/lib/ratings/quality-rating'

export type ValueScoreAnchor = {
  quality_rating: number
  five_star_max_price: number
  one_star_price: number
}

export type ValueScoreAnchorTables = {
  fiveStar: ReadonlyArray<readonly [number, number]>
  oneStar: ReadonlyArray<readonly [number, number]>
}

function buildValueMatrixPriceColumns(): number[] {
  const prices: number[] = []
  // 0 → 1k in 200s
  for (let p = 0; p < 1000; p += 200) prices.push(p)
  // 1k → 10k in 500s
  for (let p = 1000; p <= 10000; p += 500) prices.push(p)
  // Above 10k → 100k in 2k steps
  for (let p = 12000; p <= 100000; p += 2000) prices.push(p)
  return prices
}

/** Fixed matrix columns for the admin click calibrator (KES). */
export const VALUE_MATRIX_PRICE_COLUMNS: readonly number[] = buildValueMatrixPriceColumns()

/** Seed / fallback anchors (matches migration 021). */
export const DEFAULT_VALUE_SCORE_ANCHORS: readonly ValueScoreAnchor[] = [
  { quality_rating: 3.25, five_star_max_price: 1500, one_star_price: 3000 },
  { quality_rating: 3.5, five_star_max_price: 2000, one_star_price: 3000 },
  { quality_rating: 3.75, five_star_max_price: 2500, one_star_price: 5000 },
  { quality_rating: 4, five_star_max_price: 2500, one_star_price: 5500 },
  { quality_rating: 4.25, five_star_max_price: 3000, one_star_price: 7000 },
  { quality_rating: 4.5, five_star_max_price: 4000, one_star_price: 8000 },
  { quality_rating: 4.75, five_star_max_price: 4500, one_star_price: 12000 },
  { quality_rating: 5, five_star_max_price: 10000, one_star_price: 100000 },
]

export function anchorsToTables(
  anchors: readonly ValueScoreAnchor[],
): ValueScoreAnchorTables {
  const sorted = [...anchors].sort((a, b) => a.quality_rating - b.quality_rating)
  return {
    fiveStar: sorted.map((row) => [row.quality_rating, row.five_star_max_price] as const),
    oneStar: sorted.map((row) => [row.quality_rating, row.one_star_price] as const),
  }
}

export const DEFAULT_VALUE_SCORE_ANCHOR_TABLES = anchorsToTables(DEFAULT_VALUE_SCORE_ANCHORS)

export function interpolatePriceAnchors(
  quality: number,
  anchors: ReadonlyArray<readonly [number, number]>,
): number {
  if (anchors.length === 0) return 0
  const first = anchors[0]
  const last = anchors[anchors.length - 1]

  if (anchors.length === 1) return first[1]

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

export function maxPriceForFiveStarValue(
  quality: number,
  tables: ValueScoreAnchorTables = DEFAULT_VALUE_SCORE_ANCHOR_TABLES,
): number {
  return interpolatePriceAnchors(quality, tables.fiveStar)
}

export function priceForOneStarValue(
  quality: number,
  tables: ValueScoreAnchorTables = DEFAULT_VALUE_SCORE_ANCHOR_TABLES,
): number {
  return interpolatePriceAnchors(quality, tables.oneStar)
}

export function isValidValueAnchorPair(
  fiveStarMaxPrice: number,
  oneStarPrice: number,
): boolean {
  return (
    Number.isFinite(fiveStarMaxPrice) &&
    Number.isFinite(oneStarPrice) &&
    fiveStarMaxPrice > 0 &&
    oneStarPrice > fiveStarMaxPrice &&
    Number.isInteger(fiveStarMaxPrice) &&
    Number.isInteger(oneStarPrice)
  )
}

export function validateValueScoreAnchor(
  anchor: ValueScoreAnchor,
): string | null {
  if (!isValidQualityOverride(anchor.quality_rating) || anchor.quality_rating == null) {
    return `Invalid quality rating ${anchor.quality_rating} (need 0–5 in 0.25 steps).`
  }
  if (!isValidValueAnchorPair(anchor.five_star_max_price, anchor.one_star_price)) {
    return `Quality ${anchor.quality_rating}: 1★ price must be an integer greater than 5★ max price.`
  }
  return null
}

export type ValueCalibrateMode = 'five_star' | 'one_star'

/** Incomplete UI state until both ends are set. */
export type ValueScoreAnchorDraft = {
  quality_rating: number
  five_star_max_price: number | null
  one_star_price: number | null
}

export function applyValueAnchorDraftClick(args: {
  quality: number
  price: number
  mode: ValueCalibrateMode
  current: ValueScoreAnchorDraft | null
}): { draft: ValueScoreAnchorDraft; error?: undefined } | { draft?: undefined; error: string } {
  const { quality, price, mode, current } = args
  if (!VALUE_MATRIX_PRICE_COLUMNS.includes(price)) {
    return { error: `Price ${price} is not a matrix column.` }
  }
  if (!isValidQualityOverride(quality) || quality == null) {
    return { error: `Invalid quality ${quality}.` }
  }

  const five =
    mode === 'five_star' ? price : (current?.five_star_max_price ?? null)
  const one = mode === 'one_star' ? price : (current?.one_star_price ?? null)

  if (mode === 'five_star' && price <= 0) {
    return { error: '5★ max price must be greater than 0.' }
  }

  if (five != null && one != null && one <= five) {
    return {
      error:
        mode === 'five_star'
          ? `5★ max (${price}) must be below the 1★ price (${one}).`
          : `1★ price (${price}) must be above the 5★ max (${five}).`,
    }
  }

  return {
    draft: {
      quality_rating: quality,
      five_star_max_price: five,
      one_star_price: one,
    },
  }
}

export function draftToAnchor(draft: ValueScoreAnchorDraft): ValueScoreAnchor | null {
  if (draft.five_star_max_price == null || draft.one_star_price == null) return null
  if (!isValidValueAnchorPair(draft.five_star_max_price, draft.one_star_price)) return null
  return {
    quality_rating: draft.quality_rating,
    five_star_max_price: draft.five_star_max_price,
    one_star_price: draft.one_star_price,
  }
}

/**
 * Reverse-map quality → Vivino label from a saved lookup.
 * Multiple keys sharing a quality become a range (e.g. "4.3–5.0").
 */
export function vivinoLabelForQuality(
  quality: number,
  lookupEntries: ReadonlyArray<{ vivino_key: string; star_rating: number }>,
): string {
  const matches = lookupEntries
    .filter((row) => parseRatingNumber(row.star_rating) === quality)
    .map((row) => row.vivino_key)
    .sort((a, b) => parseFloat(a) - parseFloat(b))

  if (matches.length === 0) return '—'
  if (matches.length === 1) return matches[0]
  return `${matches[0]}–${matches[matches.length - 1]}`
}

/** Unique quality ratings from saved lookup, else default anchor qualities. */
export function qualityRowsForCalibration(
  lookupEntries: ReadonlyArray<{ star_rating: number }>,
): number[] {
  const fromLookup = [
    ...new Set(
      lookupEntries
        .map((row) => parseRatingNumber(row.star_rating))
        .filter((n): n is number => n != null),
    ),
  ].sort((a, b) => a - b)

  if (fromLookup.length > 0) return fromLookup
  return DEFAULT_VALUE_SCORE_ANCHORS.map((row) => row.quality_rating)
}

type LookupClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

export async function loadValueScoreAnchors(
  client: LookupClient,
): Promise<ValueScoreAnchor[]> {
  const { data, error } = await client
    .from('value_score_anchors')
    .select('quality_rating, five_star_max_price, one_star_price')
    .order('quality_rating', { ascending: true })

  if (error) {
    throw new Error(`Failed to load value_score_anchors: ${error.message}`)
  }

  const rows: ValueScoreAnchor[] = []
  for (const row of data ?? []) {
    const quality = parseRatingNumber(row.quality_rating)
    const five = parseRatingNumber(row.five_star_max_price)
    const one = parseRatingNumber(row.one_star_price)
    if (quality == null || five == null || one == null) continue
    rows.push({
      quality_rating: quality,
      five_star_max_price: Math.round(five),
      one_star_price: Math.round(one),
    })
  }

  if (rows.length === 0) return [...DEFAULT_VALUE_SCORE_ANCHORS]
  return rows
}

/** Load anchors for public pages; falls back to defaults on any failure. */
export async function loadValueScoreAnchorsOrDefault(
  client: LookupClient,
): Promise<ValueScoreAnchor[]> {
  try {
    return await loadValueScoreAnchors(client)
  } catch {
    return [...DEFAULT_VALUE_SCORE_ANCHORS]
  }
}
