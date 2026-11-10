/**
 * @deprecated Client-side Vivino→star mapping removed.
 * Quality stars are stored on wines (`quality_rating` / `quality_rating_override`)
 * and mapped server-side via `lib/ratings/quality-rating.ts`.
 *
 * Re-exports display helper for any lingering imports.
 */
export { formatStarRating } from '@/lib/ratings/quality-rating'
