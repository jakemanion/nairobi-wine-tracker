/**
 * Frontend-only Vivino → site star rating mapping.
 * Edit this table to change how Vivino scores convert to 0–5 stars (0.25 steps).
 * Keys are Vivino ratings at one decimal place.
 */
export const VIVINO_TO_STAR_RATING: Record<string, number> = {
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

/** Round a Vivino rating to one decimal for table lookup. */
export function normalizeVivinoRatingKey(vivino: number): string {
  return (Math.round(vivino * 10) / 10).toFixed(1)
}

/**
 * Convert a Vivino rating to the site star rating (0–5, 0.25 increments).
 * Returns null when Vivino rating is missing.
 */
export function vivinoToStarRating(vivino: number | null | undefined): number | null {
  if (vivino == null || !Number.isFinite(vivino)) return null
  if (vivino <= 3) return 0

  const key = normalizeVivinoRatingKey(vivino)
  const mapped = VIVINO_TO_STAR_RATING[key]
  if (mapped != null) return mapped

  // Fallback for unexpected values outside the table
  if (vivino >= 4.3) return 5
  return 0
}

/** Format star rating for display (drops trailing zeros). */
export function formatStarRating(stars: number): string {
  if (Number.isInteger(stars)) return String(stars)
  return String(stars)
}

/** Unique star ratings from the lookup table, ascending — for filter dropdowns. */
export function starRatingFilterOptions(): number[] {
  return [...new Set(Object.values(VIVINO_TO_STAR_RATING))].sort((a, b) => a - b)
}
