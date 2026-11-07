/**
 * Unattended overnight enrichment: process all pending wines, respecting the
 * SerpAPI hourly search cap (default 200/hour). Re-run safely if interrupted —
 * already-enriched wines are skipped.
 *
 * Usage: npm run enrich:overnight
 *
 * Optional env overrides (same as enrich):
 *   ENRICH_SERP_MAX_PER_HOUR=200
 *   ENRICH_ONLY_FULLY_MISSING=true   # only wines missing both url and rating
 *   ENRICH_VIVINO_FETCH=off|auto|always
 */

// No batch cap — keep going until the pending queue is empty.
delete process.env.ENRICH_MAX_BATCHES

// Default to the stated Serp hourly cap unless already set.
if (!process.env.ENRICH_SERP_MAX_PER_HOUR) {
  process.env.ENRICH_SERP_MAX_PER_HOUR = '200'
}

// Slightly larger batches are fine; the rate limiter gates Serp calls.
if (!process.env.ENRICH_BATCH_SIZE) {
  process.env.ENRICH_BATCH_SIZE = '25'
}

import('./index')
