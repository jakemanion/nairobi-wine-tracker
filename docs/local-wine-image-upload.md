# Local bulk wine image upload

Upload bottle images you already downloaded (for example under `../downloads for images`) into Supabase Storage and attach them to **canonical wines**. Retailer URLs stay on listings.

## What the project already has

| Concern | Where it lives |
| --- | --- |
| Original retailer image URL | `store_listings.image_url` (never overwritten by this script) |
| Listing → wine link | `store_listings.wine_id` → `wines.id` |
| Hosted object path | `wines.hosted_image_path` in bucket `wine-images` |
| Provenance listing id | `wines.image_source_listing_id` |
| Migration status | `wines.image_migration_status` (`pending` / `success` / `failed` / `skipped`) |
| Stable storage key | `{wine_id}/original.{ext}` |

There is also `scripts/migrate-wine-images.ts`, which **downloads** from `store_listings.image_url`. This local uploader is for files already on disk.

### Matching strategy (do not use wine ids as filenames)

The in-repo Carrefour scraper stub is empty, and retailer import CSVs (for example `data/winebox-*.csv`) carry `image_url` / product URLs but **not** Supabase listing ids. Filenames therefore must **not** be assumed to be wine ids.

Match in this order:

1. **CSV manifest** — `filename` + `store_listing_id` (optional `source_image_url`)
2. **Filename stem = `store_listings.id`** (UUID only)
3. Optional **`--match-url-basename`** — unique basename of `store_listings.image_url`

Ambiguous or unmatched files are reported only. Listings without `wine_id` are unmatched (no wine is created).

## Database / Storage prerequisites

Apply (if not already applied):

- `supabase/migrations/012_wine_hosted_images.sql` — wine columns + public `wine-images` bucket
- `supabase/migrations/013_wine_images_allow_avif.sql` — AVIF mime allowlist
- `supabase/migrations/014_drop_wine_image_source_listing_fk.sql` — drops a broken FK that broke PostgREST embeds

If the bucket is missing, create a **public** Storage bucket named `wine-images` with a 10MB file size limit and allowed mimes: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`, plus a public read policy on `storage.objects` for that bucket.

## Environment variables

Put these in `.env.local` on your Windows machine (already gitignored). **Never** put the service role key in `NEXT_PUBLIC_*` or client code.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Keep this unset/false until you are ready for production to show hosted images
# NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES=true
```

Uploads can succeed while the display flag is off. The UI keeps using retailer `image_url` values until you set `NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES=true` in Vercel (and rebuild).

## Manifest format

```csv
filename,store_listing_id,source_image_url
Chateau-Latour-Pauillac-300x300.avif,11111111-2222-4333-8444-555555555555,https://thewinebox.biz/wp-content/uploads/2025/12/Chateau-Latour-Pauillac-300x300.avif
```

Aliases accepted:

- filename: `file`, `file_name`
- store_listing_id: `listing_id`, `retailer_listing_id`, `id`
- source_image_url: `image_url`, `source_url`, `retailer_image_url`

If `source_image_url` is present and differs from `store_listings.image_url`, the row fails (ambiguous provenance).

Generate a starter CSV from the database:

```powershell
npm run upload:images -- --generate-manifest=".\tmp\manifest-template.csv"
```

Then rename local files to match the `filename` column, or edit `filename` to match your files.

## PowerShell commands

```powershell
# 1) Generate a DB template, then copy/edit into manifest.csv
npm run upload:images -- --generate-manifest=".\tmp\manifest-template.csv"
Copy-Item ".\tmp\manifest-template.csv" ".\tmp\manifest.csv"

# 2) Dry-run five images (reviews nested browser-download folders too)
npm run upload:images -- --dir="C:\Users\jakem\Documents\Work\Personal\wine-tracker\downloads for images\wine box" --manifest=".\tmp\manifest.csv" --match-url-basename --dry-run --max=5

# 3) Same with unique URL-basename matching only (no manifest)
npm run upload:images -- --dir="D:\wine-images" --match-url-basename --dry-run --max=5

# 4) After you accept the dry-run report, upload (still does not change production UI)
npm run upload:images -- --dir="D:\wine-images" --manifest=".\tmp\manifest.csv" --max=5 --concurrency=2

# 5) Resume later — already-successful wines are skipped unless --force
npm run upload:images -- --dir="D:\wine-images" --manifest=".\tmp\manifest.csv" --concurrency=2
```

`--dir` scans **recursively** by default (browser “Save page” puts images in a `*_files` subfolder). Use `--no-recursive` to limit to the top level.

Reports default to `tmp/local-image-upload-report-<timestamp>.csv` with outcomes: `success`, `failed`, `skipped`, `unmatched`, `ambiguous`.

## Test procedure (five images)

1. Apply migrations 012–014 to the target Supabase project.
2. Confirm `.env.local` has URL + **service role** key (local only).
3. Confirm `NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES` is **not** `true` in Vercel.
4. Generate a manifest template and pick five linked listings (`wine_id` present):

   ```powershell
   npm run upload:images -- --generate-manifest=".\tmp\manifest-template.csv"
   ```

5. Copy five downloaded files into a test folder. Build `tmp\manifest.csv` with those filenames and their `store_listing_id` values (include `source_image_url` when you have it).
6. Dry-run:

   ```powershell
   npm run upload:images -- --dir="PATH\TO\TEST\FOLDER" --manifest=".\tmp\manifest.csv" --dry-run --max=5
   ```

7. Open the report CSV. Expect five `success` (dry-run) rows, or clear `unmatched` / `failed` reasons. Fix the manifest before continuing.
8. Upload the same five **without** `--dry-run`.
9. In Supabase: Storage → `wine-images` → `{wine_id}/original.*`, and `wines.hosted_image_path` / `image_migration_status=success` / `image_source_listing_id` set. Confirm `store_listings.image_url` unchanged.
10. Reload the production site — images should still be retailer URLs.
11. Only when ready: set `NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES=true` on Vercel and redeploy.

## Safety notes

- Local files are never deleted.
- Existing storage objects are not overwritten unless `--overwrite-storage`.
- Successful wines are skipped on resume unless `--force`.
- Service role key is used only by this Node script via `.env.local`.
