/**
 * Map raw value score → 0–5 site stars (0.25 steps).
 *
 * Anchors (see calculate-value-score dual calibration):
 * - < 0.1 → 0
 * - 0.2 → 1 (one-star price ceiling)
 * - ≥ 1.5 → 5 (five-star price ceiling)
 * Linear between those points; never round across a threshold.
 */
export const VALUE_ZERO_STAR_THRESHOLD = 0.1
export const VALUE_ONE_STAR_RAW = 0.2
export const VALUE_FIVE_STAR_RAW = 1.5

export function valueScoreToStarRating(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  if (value < VALUE_ZERO_STAR_THRESHOLD) return 0
  if (value >= VALUE_FIVE_STAR_RAW - 1e-9) return 5

  if (value < VALUE_ONE_STAR_RAW - 1e-9) {
    const stars =
      ((value - VALUE_ZERO_STAR_THRESHOLD) /
        (VALUE_ONE_STAR_RAW - VALUE_ZERO_STAR_THRESHOLD)) *
      1
    return Math.min(0.75, Math.round(stars * 4) / 4)
  }

  const stars =
    1 +
    ((value - VALUE_ONE_STAR_RAW) / (VALUE_FIVE_STAR_RAW - VALUE_ONE_STAR_RAW)) * 4

  return Math.min(4.75, Math.round(stars * 4) / 4)
}
