# Tools

CLI tools in this repo. Run from the project root. Most need `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`; enrichment also needs `SERPAPI_API_KEY`.

---

### Download Wine Images

Downloads retailer images from `store_listings.image_url` into a local folder for editing (disk only — nothing written to Supabase Storage).

Only canonical wines that still fall back to a store-website image (no successful hosted image) are included by default; `--force` also pulls wines that already have Storage images. Saves files as `{store_listing_id}.{ext}`, plus `manifest.csv` and `download-state.json` (sha256 baselines) for a later changed-only upload.

```bash
npm run download:images -- --dir="D:\wine-images" --dry-run --max=5
```

---

### Upload Local Wine Images

Uploads bottle images already on disk into Supabase Storage and attaches them to matched wines via store listing / manifest matching.

Matches files by CSV manifest, listing UUID filename, or optional image URL basename — never by wine id, and never creates wines. Sets `wines.hosted_image_path` while leaving `store_listings.image_url` as the original source. Use `--changed-only` after `download:images` to push only files whose content differs from `download-state.json`.

```bash
npm run upload:images -- --dir="D:\wine-images" --manifest="D:\wine-images\manifest.csv" --changed-only
```

---

### Migrate Wine Images

Downloads retailer images from `store_listings.image_url` and hosts them in Supabase Storage on the canonical wine in one step (no local edit pass).

Fetches remote bottle shots over HTTP, validates them, then writes to `wine-images/{wine_id}/original.{ext}` and records migration status on the wine row.

```bash
npm run migrate:images -- --dry-run --max=5
```

---

### Vivino Enrichment

Looks up pending wines via SerpAPI / Vivino and writes ratings, URLs, and match confidence back to the database.

Processes wines in configurable batches with rate limiting; scores search hits against producer/name and either auto-applies a match or flags the wine for review.

```bash
npm run enrich
```

---

### Vivino Enrichment (First Run)

Small smoke-test enrichment: one batch of 5 wines that are fully missing Vivino data.

Same pipeline as `enrich`, but capped to a single batch with short delays so you can verify SerpAPI/Vivino wiring before a long run.

```bash
npm run enrich:first
```

---

### Vivino Enrichment (Overnight)

Unattended run that drains the full pending queue while respecting the SerpAPI hourly search cap.

Removes the batch cap, defaults to larger batches and ~200 Serp searches/hour, and can be restarted safely because already-enriched wines are skipped.

```bash
npm run enrich:overnight
```

---

### Scrape Carrefour

Placeholder for a Carrefour product scraper (`scripts/scrape-carrefour.ts` is currently empty).

Intended to pull Carrefour wine listings (titles, prices, image URLs) into the import/store-listings flow; not implemented yet.

```bash
npm run scrape:carrefour
```
