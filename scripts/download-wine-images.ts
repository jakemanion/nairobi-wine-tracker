/**
 * Download retailer bottle images to a local folder for editing.
 *
 * Disk only — does not upload to Supabase Storage or update wine image columns.
 * Writes listing-id filenames, manifest.csv, and download-state.json (sha256 baselines)
 * so `upload:images --changed-only` can push only edited files afterward.
 *
 * By default only canonical wines that still display a store-website image
 * (no successful hosted_image_path) are included. Use --force to also pull
 * wines that already have a hosted Storage image.
 *
 * Usage (PowerShell):
 *   npx tsx scripts/download-wine-images.ts --dir="D:\wine-images" --dry-run --max=5
 *   npx tsx scripts/download-wine-images.ts --dir="D:\wine-images" --max=25 --concurrency=2
 *   npm run download:images -- --dir="D:\wine-images" --force
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).
 */

import { createHash } from 'node:crypto'
import { mkdir, writeFile, access, readFile, unlink } from 'node:fs/promises'
import { join, resolve, isAbsolute, basename } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  downloadAndValidateImage,
  MAX_IMAGE_BYTES,
  refererForImageUrl,
} from '../lib/wine-image-download'

loadEnv({ path: resolve(process.cwd(), '.env.local') })
loadEnv()

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const MANIFEST_FILENAME = 'manifest.csv'
const STATE_FILENAME = 'download-state.json'

type CliOptions = {
  dir: string
  dryRun: boolean
  max: number | null
  concurrency: number
  timeoutMs: number
  delayMs: number
  force: boolean
}

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
  store_listings: SourceListing[] | null
}

type DownloadStateEntry = {
  filename: string
  store_listing_id: string
  wine_id: string
  source_image_url: string
  sha256: string
  bytes: number
  downloaded_at: string
}

type DownloadStateFile = {
  version: 1
  dir: string
  created_at: string
  files: DownloadStateEntry[]
}

type RunSummary = {
  fetched: number
  processed: number
  success: number
  failed: number
  skipped: number
  dryRun: boolean
  dir: string
  manifest: string | null
  state: string | null
}

function parseArgs(argv: string[]): CliOptions {
  let dir: string | null = null
  let dryRun = false
  let max: number | null = null
  let concurrency = 1
  let timeoutMs = 45_000
  let delayMs = 400
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
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    if (arg.startsWith('--dir=')) {
      dir = arg.slice('--dir='.length).trim() || null
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
    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!dir) {
    throw new Error('Missing --dir=PATH')
  }

  return { dir, dryRun, max, concurrency, timeoutMs, delayMs, force }
}

function printHelp() {
  console.log(`Download retailer listing images to a local folder for editing (disk only).

Does not upload to Supabase or update wines.hosted_image_path.
Writes {store_listing_id}.{ext}, manifest.csv, and download-state.json.

By default only wines still using a store-website image (no successful hosted
image) are downloaded.

Options:
  --dir=PATH           Output folder (required)
  --dry-run            Download/validate in memory only; do not write files
  --max=N              Process at most N wines
  --concurrency=N      Parallel downloads (default 1)
  --timeout-ms=N       Per-download timeout (default 45000)
  --delay-ms=N         Pause between downloads (default 400)
  --force              Include wines that already have a hosted image, and
                       re-download even when the local file already exists
`)
}

/** True when the public UI would still fall back to a store listing image_url. */
function stillUsesStoreWebsiteImage(wine: WineCandidate): boolean {
  return !(
    wine.image_migration_status === 'success' && Boolean(wine.hosted_image_path?.trim())
  )
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

  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, () =>
    runWorker(),
  )
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
        store_listings!wine_id (
          id,
          image_url,
          raw_title
        )
      `,
      )
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    // Push the common case into the query: wines without a successful hosted image.
    // --force drops this filter so already-hosted wines can be re-pulled for editing.
    if (!options.force) {
      query = query.or(
        'image_migration_status.is.null,image_migration_status.neq.success,hosted_image_path.is.null',
      )
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch wines: ${error.message}`)
    }

    const batch = (data ?? []).map(normalizeWineRow)
    const eligible = batch.filter((wine) => {
      if (pickSourceListing(wine) == null) return false
      if (!options.force && !stillUsesStoreWebsiteImage(wine)) return false
      return true
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

type ProcessOutcome =
  | { outcome: 'success'; entry: DownloadStateEntry }
  | { outcome: 'skipped'; entry: DownloadStateEntry | null }
  | { outcome: 'failed'; entry: null }

async function findExistingListingFile(
  outDir: string,
  listingId: string,
): Promise<string | null> {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const) {
    const candidate = join(outDir, `${listingId}.${ext}`)
    if (await fileExists(candidate)) return candidate
  }
  return null
}

async function loadExistingState(outDir: string): Promise<Map<string, DownloadStateEntry>> {
  const statePath = join(outDir, STATE_FILENAME)
  try {
    const raw = JSON.parse(await readFile(statePath, 'utf8')) as DownloadStateFile
    const map = new Map<string, DownloadStateEntry>()
    if (raw?.version === 1 && Array.isArray(raw.files)) {
      for (const entry of raw.files) {
        if (entry?.store_listing_id && entry.sha256 && entry.filename) {
          map.set(entry.store_listing_id, entry)
        }
      }
    }
    return map
  } catch {
    return new Map()
  }
}

async function processWine(
  wine: WineCandidate,
  outDir: string,
  options: CliOptions,
  previousState: Map<string, DownloadStateEntry>,
): Promise<ProcessOutcome> {
  const source = pickSourceListing(wine)
  if (!source?.image_url?.trim()) {
    log('info', 'skipped wine with no listing image source', { wineId: wine.id })
    return { outcome: 'skipped', entry: null }
  }

  const sourceUrl = source.image_url.trim()

  // Keep prior baseline when the file is already on disk (do not rehash — edits must stay detectable).
  if (!options.force && !options.dryRun) {
    const existingPath = await findExistingListingFile(outDir, source.id)
    if (existingPath) {
      const filename = basename(existingPath)
      const prior = previousState.get(source.id)
      if (prior && prior.filename === filename) {
        log('info', 'local file already exists; keeping prior baseline', {
          wineId: wine.id,
          listingId: source.id,
          filename,
        })
        return { outcome: 'skipped', entry: prior }
      }
      const bytes = new Uint8Array(await readFile(existingPath))
      const entry: DownloadStateEntry = {
        filename,
        store_listing_id: source.id,
        wine_id: wine.id,
        source_image_url: sourceUrl,
        sha256: sha256Hex(bytes),
        bytes: bytes.length,
        downloaded_at: new Date().toISOString(),
      }
      log('info', 'local file already exists; recorded baseline', {
        wineId: wine.id,
        listingId: source.id,
        filename,
      })
      return { outcome: 'skipped', entry }
    }
  }

  const downloaded = await downloadAndValidateImage(sourceUrl, {
    timeoutMs: options.timeoutMs,
    userAgent: BROWSER_USER_AGENT,
    referer: refererForImageUrl(sourceUrl) ?? sourceUrl,
    retryOnTimeout: true,
  })

  if (!downloaded.ok) {
    log('warn', 'image download failed', {
      wineId: wine.id,
      listingId: source.id,
      producer: wine.producer,
      wineName: wine.wine_name,
      error: downloaded.error,
      httpStatus: downloaded.httpStatus,
      dryRun: options.dryRun,
    })
    return { outcome: 'failed', entry: null }
  }

  // Local upload rejects GIF; skip so the edit → reupload path stays compatible.
  if (downloaded.format.extension === 'gif') {
    log('warn', 'skipped GIF (not supported by local upload)', {
      wineId: wine.id,
      listingId: source.id,
    })
    return { outcome: 'skipped', entry: null }
  }

  const filename = `${source.id}.${downloaded.format.extension}`
  const absolutePath = join(outDir, filename)
  const hash = sha256Hex(downloaded.bytes)
  const downloadedAt = new Date().toISOString()

  if (!options.dryRun) {
    // Drop a previous original.* if the extension changed on re-download.
    const previous = await findExistingListingFile(outDir, source.id)
    if (previous && previous !== absolutePath) {
      await unlink(previous)
    }
    await writeFile(absolutePath, downloaded.bytes)
  }

  const entry: DownloadStateEntry = {
    filename,
    store_listing_id: source.id,
    wine_id: wine.id,
    source_image_url: sourceUrl,
    sha256: hash,
    bytes: downloaded.bytes.length,
    downloaded_at: downloadedAt,
  }

  log('info', options.dryRun ? 'dry-run validated image' : 'downloaded image', {
    wineId: wine.id,
    listingId: source.id,
    producer: wine.producer,
    wineName: wine.wine_name,
    filename,
    mime: downloaded.format.mime,
    bytes: downloaded.bytes.length,
    dryRun: options.dryRun,
  })

  return { outcome: 'success', entry }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const client = createServiceClient()

  const outDir = isAbsolute(options.dir) ? options.dir : resolve(process.cwd(), options.dir)

  if (!options.dryRun) {
    await mkdir(outDir, { recursive: true })
  }

  log('info', 'starting wine image download to disk', {
    dir: outDir,
    dryRun: options.dryRun,
    max: options.max,
    concurrency: options.concurrency,
    timeoutMs: options.timeoutMs,
    delayMs: options.delayMs,
    force: options.force,
    onlyStoreWebsiteImages: !options.force,
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
    dir: outDir,
    manifest: null,
    state: null,
  }

  log('info', 'candidates loaded', { count: candidates.length })

  const previousState = options.dryRun ? new Map() : await loadExistingState(outDir)
  const stateByListing = new Map<string, DownloadStateEntry>()

  await mapPool(candidates, options.concurrency, async (wine) => {
    const result = await processWine(wine, outDir, options, previousState)
    summary.processed += 1
    if (result.outcome === 'success') {
      summary.success += 1
    } else if (result.outcome === 'failed') {
      summary.failed += 1
    } else {
      summary.skipped += 1
    }
    if (result.entry) {
      stateByListing.set(result.entry.store_listing_id, result.entry)
    }
    if (options.delayMs > 0) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, options.delayMs))
    }
  })

  if (!options.dryRun && stateByListing.size > 0) {
    const stateEntries = [...stateByListing.values()].sort((a, b) =>
      a.filename.localeCompare(b.filename),
    )

    const manifestPath = join(outDir, MANIFEST_FILENAME)
    const manifestBody = [
      'filename,store_listing_id,source_image_url',
      ...stateEntries.map(
        (e) =>
          `${csvEscape(e.filename)},${csvEscape(e.store_listing_id)},${csvEscape(e.source_image_url)}`,
      ),
    ].join('\n')
    await writeFile(manifestPath, `${manifestBody}\n`, 'utf8')
    summary.manifest = manifestPath

    const statePath = join(outDir, STATE_FILENAME)
    const stateFile: DownloadStateFile = {
      version: 1,
      dir: outDir,
      created_at: new Date().toISOString(),
      files: stateEntries,
    }
    await writeFile(statePath, `${JSON.stringify(stateFile, null, 2)}\n`, 'utf8')
    summary.state = statePath

    log('info', 'wrote manifest and download state', {
      manifest: manifestPath,
      state: statePath,
      files: stateEntries.length,
    })
  } else if (!options.dryRun && stateByListing.size === 0) {
    log('warn', 'no images available for manifest/state', { dir: outDir })
  }

  log('info', 'wine image download complete', summary)

  if (summary.failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  log('error', 'fatal download error', { error: message })
  process.exit(1)
})
