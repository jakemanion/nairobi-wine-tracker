/**
 * Map raw value score → 0–5 site stars (0.25 steps).
 *
 * Tuned for quality-star value scores (see calculate-value-score):
 * below 0.1 → 0, 0.5 → 4, 1.5 or above → 5; linear between.
 * Raw 1.5 is the 5★ threshold — price ceilings per quality are calibrated
 * in VALUE_FIVE_STAR_PRICE_ANCHORS.
 */
export function valueScoreToStarRating(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  if (value < 0.1) return 0
  if (value >= 1.5) return 5

  const stars =
    value <= 0.5
      ? ((value - 0.1) / (0.5 - 0.1)) * 4
      : 4 + ((value - 0.5) / (1.5 - 0.5)) * 1

  // Don't round up to 5 when raw score is still below the 5★ threshold.
  return Math.min(4.75, Math.round(stars * 4) / 4)
}
