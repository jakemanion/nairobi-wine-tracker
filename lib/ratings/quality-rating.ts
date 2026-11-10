/**
 * Server-side Vivino → site quality star mapping.
 * Lookup rows live in `vivino_star_lookup`; this module applies the rules
 * and computes effective quality (override ?? calculated).
 */

export type VivinoStarLookupTable = Record<string, number>

/** Seed / default map — matches migration 020. */
export const DEFAULT_VIVINO_STAR_LOOKUP: VivinoStarLookupTable = {
  '3.0': 0,
  '3.1': 0.25,
  '3.2': 0.5,
  '3.3': 1,
  '3.4': 2,
  '3.5': 3,
  '3.6': 3.25,
  '3.7': 3.5,
  '3.8': 3.75,
  '3.9': 4,
  '4.0': 4.25,
  '4.1': 4.5,
  '4.2': 4.75,
  '4.3': 5,
  '4.4': 5,
  '4.5': 5,
  '4.6': 5,
  '4.7': 5,
  '4.8': 5,
  '4.9': 5,
  '5.0': 5,
}

export type QualityRatingFields = {
  quality_rating?: number | string | null
  quality_rating_override?: number | string | null
}

type LookupRow = {
  vivino_key: string
  star_rating: number | string
}

/** Supabase-like client; typed loosely so Next and enrich CLI clients both work. */
type LookupClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

/** Round a Vivino rating to one decimal for table lookup. */
export function normalizeVivinoRatingKey(vivino: number): string {
  return (Math.round(vivino * 10) / 10).toFixed(1)
}

export function parseRatingNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

/**
 * Convert a Vivino rating to calculated site quality stars (0–5, 0.25 steps).
 * Returns null when Vivino rating is missing.
 */
export function vivinoToQualityRating(
  vivino: number | null | undefined,
  table: VivinoStarLookupTable = DEFAULT_VIVINO_STAR_LOOKUP,
): number | null {
  if (vivino == null || !Number.isFinite(vivino)) return null
  if (vivino <= 3) return 0

  const key = normalizeVivinoRatingKey(vivino)
  const mapped = table[key]
  if (mapped != null && Number.isFinite(mapped)) return mapped

  if (vivino >= 4.3) return 5
  return 0
}

/** Site-facing quality: override wins when set. */
export function effectiveQualityRating(
  wine: QualityRatingFields,
): number | null {
  const override = parseRatingNumber(wine.quality_rating_override)
  if (override != null) return override
  return parseRatingNumber(wine.quality_rating)
}

/** Validate admin override: 0–5 in 0.25 increments (or null to clear). */
export function isValidQualityOverride(value: number | null): boolean {
  if (value == null) return true
  if (!Number.isFinite(value) || value < 0 || value > 5) return false
  const steps = value * 4
  return Math.abs(steps - Math.round(steps)) < 1e-9
}

export function lookupRowsToTable(rows: LookupRow[]): VivinoStarLookupTable {
  const table: VivinoStarLookupTable = {}
  for (const row of rows) {
    const key = String(row.vivino_key).trim()
    const stars = parseRatingNumber(row.star_rating)
    if (!key || stars == null) continue
    table[key] = stars
  }
  return table
}

export async function loadLookupTable(
  client: LookupClient,
): Promise<VivinoStarLookupTable> {
  const { data, error } = await client
    .from('vivino_star_lookup')
    .select('vivino_key, star_rating')
    .order('vivino_key', { ascending: true })

  if (error) {
    throw new Error(`Failed to load vivino_star_lookup: ${error.message}`)
  }

  const table = lookupRowsToTable(data ?? [])
  if (Object.keys(table).length === 0) {
    return { ...DEFAULT_VIVINO_STAR_LOOKUP }
  }
  return table
}

/** Format star rating for display. */
export function formatStarRating(stars: number): string {
  if (Number.isInteger(stars)) return String(stars)
  return String(stars)
}
