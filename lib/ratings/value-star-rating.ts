/**
 * Map raw value score → 0–5 site stars (0.25 steps).
 *
 * Anchors: below 0.1 → 0, 0.5 → 4, 1 or above → 5; linear between.
 */
export function valueScoreToStarRating(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  if (value < 0.1) return 0
  if (value >= 1) return 5

  const stars =
    value <= 0.5
      ? ((value - 0.1) / (0.5 - 0.1)) * 4
      : 4 + ((value - 0.5) / (1 - 0.5)) * 1

  return Math.round(stars * 4) / 4
}
