/**
 * Migrate retailer bottle images into Supabase Storage and attach them to canonical wines.
 *
 * Source: store_listings.image_url (kept as the original store-hosted URL).
 * Destination: wines.hosted_image_path → wine-images/{wine_id}/original.{ext}
 *
 * Usage:
 *   npx tsx scripts/migrate-wine-images.ts --dry-run --max=5
 *   npx tsx scripts/migrate-wine-images.ts --max=25 --concurrency=3
 *   npm run migrate:images -- --dry-run --max=5
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).
 * Apply supabase/migrations/012_wine_hosted_images.sql before running.
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  downloadAndValidateImage,
  MAX_IMAGE_BYTES,
  refererForImageUrl,
} from '../lib/wine-image-download'
import {
  WINE_IMAGES_BUCKET,
  wineImageStoragePath,
  type ImageMigrationStatus,
} from '../lib/wine-images'

loadEnv({ path: resolve(process.cwd(), '.env.local') })
loadEnv()

type SourceListing = {
  id: string
  image_url: string | null
  raw_title: string | null
}

type WineCandidate = {
  id: string
  producer: string | null
  wine_name: string | null
  hosted_image_path: string | null
  image_migration_status: string | null
  image_source_listing_id: string | null
  store_listings: SourceListing[] | null
}

type CliOptions = {
  dryRun: boolean
  max: number | null
  concurrency: number
  timeoutMs: number
  delayMs: number
  retryFailed: boolean
  force: boolean
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

type RunSummary = {
  fetched: number
  processed: number
  success: number
  failed: number
  skipped: number
  dryRun: boolean
}

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false
  let max: number | null = null
  let concurrency = 1
  let timeoutMs = 45_000
  let delayMs = 400
  let retryFailed = true
  let force = false

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--force') {
      force = true
      continue
    }
    if (arg === '--no-retry-failed') {
      retryFailed = false
      continue
    }
    if (arg.startsWith('--max=')) {
      const value = Number.parseInt(arg.slice('--max='.length), 10)
      if (!Number.isFinite(value) || value < 1) {
        throw new Error(`Invalid --max value: ${arg}`)
      }
      max = value
      continue
    }
    if (arg.startsWith('--concurrency=')) {
      const value = Number.parseInt(arg.slice('--concurrency='.length), 10)
      if (!Number.isFinite(value) || value < 1 || value > 20) {
        throw new Error(`Invalid --concurrency value: ${arg}`)
      }
      concurrency = value
      continue
    }
    if (arg.startsWith('--timeout-ms=')) {
      const value = Number.parseInt(arg.slice('--timeout-ms='.length), 10)
      if (!Number.isFinite(value) || value < 1_000 || value > 120_000) {
        throw new Error(`Invalid --timeout-ms value: ${arg}`)
      }
      timeoutMs = value
      continue
    }
    if (arg.startsWith('--delay-ms=')) {
      const value = Number.parseInt(arg.slice('--delay-ms='.length), 10)
      if (!Number.isFinite(value) || value < 0 || value > 60_000) {
        throw new Error(`Invalid --delay-ms value: ${arg}`)
      }
      delayMs = value
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return { dryRun, max, concurrency, timeoutMs, delayMs, retryFailed, force }
}

function printHelp() {
  console.log(`Migrate listing image_url copies onto canonical wines (${WINE_IMAGES_BUCKET}).

Source remains store_listings.image_url. Hosted paths are stored on wines.

Options:
  --dry-run              Download/validate only; no upload or DB writes
  --max=N                Process at most N wines
  --concurrency=N        Parallel downloads (default 1; Carrefour CDN rate-limits parallel fetches)
  --timeout-ms=N         Per-download timeout (default 45000)
  --delay-ms=N           Pause between downloads (default 400)
  --no-retry-failed      Skip wines already marked failed
  --force                Re-process successful wines (still will not overwrite storage by default)
`)
}

function createServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function log(level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index]!, index)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  await Promise.all(workers)
  return results
}

function pickSourceListing(wine: WineCandidate): SourceListing | null {
  const listings = wine.store_listings ?? []
  for (const listing of listings) {
    if (listing.image_url?.trim()) return listing
  }
  return null
}

function normalizeWineRow(raw: unknown): WineCandidate {
  const row = raw as WineCandidate & { store_listings?: unknown }
  const listings = Array.isArray(row.store_listings)
    ? (row.store_listings as SourceListing[])
    : row.store_listings
      ? [row.store_listings as SourceListing]
      : []

  return {
    ...row,
    store_listings: listings,
  }
}

async function fetchCandidates(
  client: SupabaseClient,
  options: CliOptions,
): Promise<WineCandidate[]> {
  const pageSize = 200
  const rows: WineCandidate[] = []
  let from = 0

  while (true) {
    let query = client
      .from('wines')
      .select(
        `
        id,
        producer,
        wine_name,
        hosted_image_path,
        image_migration_status,
        image_source_listing_id,
        store_listings!wine_id (
          id,
          image_url,
          raw_title
        )
      `,
      )
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (!options.force) {
      if (options.retryFailed) {
        query = query.or(
          'image_migration_status.is.null,image_migration_status.eq.pending,image_migration_status.eq.failed,image_migration_status.eq.skipped',
        )
      } else {
        query = query.or(
          'image_migration_status.is.null,image_migration_status.eq.pending,image_migration_status.eq.skipped',
        )
      }
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch wines: ${error.message}`)
    }

    const batch = (data ?? []).map(normalizeWineRow)
    // Only wines that have at least one listing with a retailer image (or force reprocess).
    const eligible = batch.filter((wine) => {
      if (options.force) return true
      return pickSourceListing(wine) != null
    })
    rows.push(...eligible)

    if (options.max != null && rows.length >= options.max) {
      return rows.slice(0, options.max)
    }

    if (batch.length < pageSize) break
    from += pageSize
  }

  return options.max != null ? rows.slice(0, options.max) : rows
}

async function markWineStatus(
  client: SupabaseClient,
  wineId: string,
  update: {
    image_migration_status: ImageMigrationStatus
    image_migration_error?: string | null
    hosted_image_path?: string | null
    image_source_listing_id?: string | null
  },
  dryRun: boolean,
) {
  if (dryRun) return

  const { error } = await client
    .from('wines')
    .update({
      image_migration_status: update.image_migration_status,
      image_migration_error: update.image_migration_error ?? null,
      ...(update.hosted_image_path !== undefined
        ? { hosted_image_path: update.hosted_image_path }
        : {}),
      ...(update.image_source_listing_id !== undefined
        ? { image_source_listing_id: update.image_source_listing_id }
        : {}),
      image_migrated_at: new Date().toISOString(),
    })
    .eq('id', wineId)

  if (error) {
    throw new Error(`DB update failed for wine ${wineId}: ${error.message}`)
  }
}

async function objectExists(client: SupabaseClient, path: string): Promise<boolean> {
  const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
  const fileName = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path

  const { data, error } = await client.storage.from(WINE_IMAGES_BUCKET).list(folder, {
    search: fileName,
    limit: 20,
  })

  if (error) {
    log('warn', 'storage list failed; treating object as missing', {
      path,
      error: error.message,
    })
    return false
  }

  return (data ?? []).some((item) => item.name === fileName)
}

async function linkExistingObject(
  client: SupabaseClient,
  wine: WineCandidate,
  storagePath: string,
  sourceListingId: string,
  dryRun: boolean,
) {
  await markWineStatus(
    client,
    wine.id,
    {
      image_migration_status: 'success',
      image_migration_error: null,
      hosted_image_path: storagePath,
      image_source_listing_id: sourceListingId,
    },
    dryRun,
  )
}

async function processWine(
  client: SupabaseClient,
  wine: WineCandidate,
  options: CliOptions,
): Promise<'success' | 'failed' | 'skipped'> {
  if (
    !options.force &&
    wine.image_migration_status === 'success' &&
    wine.hosted_image_path
  ) {
    log('info', 'wine already has hosted image; skipping', {
      wineId: wine.id,
      path: wine.hosted_image_path,
    })
    return 'skipped'
  }

  const source = pickSourceListing(wine)
  if (!source?.image_url?.trim()) {
    await markWineStatus(
      client,
      wine.id,
      {
        image_migration_status: 'skipped',
        image_migration_error: 'No linked store listing with image_url',
      },
      options.dryRun,
    )
    log('info', 'skipped wine with no listing image source', { wineId: wine.id })
    return 'skipped'
  }

  const sourceUrl = source.image_url.trim()
  const downloaded = await downloadAndValidateImage(sourceUrl, {
    timeoutMs: options.timeoutMs,
    userAgent: BROWSER_USER_AGENT,
    referer: refererForImageUrl(sourceUrl) ?? sourceUrl,
    retryOnTimeout: true,
  })

  if (!downloaded.ok) {
    await markWineStatus(
      client,
      wine.id,
      {
        image_migration_status: 'failed',
        image_migration_error: downloaded.error.slice(0, 1000),
        image_source_listing_id: source.id,
      },
      options.dryRun,
    )
    log('warn', 'image migration failed', {
      wineId: wine.id,
      listingId: source.id,
      producer: wine.producer,
      wineName: wine.wine_name,
      error: downloaded.error,
      httpStatus: downloaded.httpStatus,
      manualReview: downloaded.manualReview ?? false,
      dryRun: options.dryRun,
    })
    return 'failed'
  }

  const storagePath = wineImageStoragePath(wine.id, downloaded.format.extension)

  if (!options.dryRun) {
    const exists = await objectExists(client, storagePath)
    if (exists && !options.force) {
      await linkExistingObject(client, wine, storagePath, source.id, false)
      log('info', 'storage object already present; linked without overwrite', {
        wineId: wine.id,
        listingId: source.id,
        path: storagePath,
      })
      return 'success'
    }

    const { error: uploadError } = await client.storage
      .from(WINE_IMAGES_BUCKET)
      .upload(storagePath, downloaded.bytes, {
        contentType: downloaded.format.mime,
        upsert: false,
        cacheControl: '31536000',
      })

    if (uploadError) {
      const message = uploadError.message ?? String(uploadError)
      const alreadyExists =
        /already exists|Duplicate|resource already exists/i.test(message)

      if (alreadyExists) {
        await linkExistingObject(client, wine, storagePath, source.id, false)
        log('info', 'upload skipped; object already exists', {
          wineId: wine.id,
          listingId: source.id,
          path: storagePath,
        })
        return 'success'
      }

      await markWineStatus(
        client,
        wine.id,
        {
          image_migration_status: 'failed',
          image_migration_error: `Upload failed: ${message}`.slice(0, 1000),
          image_source_listing_id: source.id,
        },
        false,
      )
      log('error', 'upload failed', {
        wineId: wine.id,
        listingId: source.id,
        path: storagePath,
        error: message,
      })
      return 'failed'
    }

    await linkExistingObject(client, wine, storagePath, source.id, false)
  }

  log('info', options.dryRun ? 'dry-run validated image' : 'migrated image', {
    wineId: wine.id,
    listingId: source.id,
    producer: wine.producer,
    wineName: wine.wine_name,
    path: storagePath,
    mime: downloaded.format.mime,
    bytes: downloaded.bytes.length,
    dryRun: options.dryRun,
  })

  return 'success'
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const client = createServiceClient()

  log('info', 'starting wine image migration', {
    dryRun: options.dryRun,
    max: options.max,
    concurrency: options.concurrency,
    timeoutMs: options.timeoutMs,
    delayMs: options.delayMs,
    retryFailed: options.retryFailed,
    force: options.force,
    bucket: WINE_IMAGES_BUCKET,
    maxImageBytes: MAX_IMAGE_BYTES,
  })

  const candidates = await fetchCandidates(client, options)
  const summary: RunSummary = {
    fetched: candidates.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    dryRun: options.dryRun,
  }

  log('info', 'candidates loaded', { count: candidates.length })

  await mapPool(candidates, options.concurrency, async (wine) => {
    const outcome = await processWine(client, wine, options)
    summary.processed += 1
    if (outcome === 'success') summary.success += 1
    else if (outcome === 'failed') summary.failed += 1
    else summary.skipped += 1
    if (options.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs))
    }
  })

  log('info', 'wine image migration complete', summary)

  if (summary.failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  log('error', 'fatal migration error', { error: message })
  process.exit(1)
})
