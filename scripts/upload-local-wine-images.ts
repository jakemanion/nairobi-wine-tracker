/**
 * Upload locally downloaded retailer bottle images into Supabase Storage and
 * attach them to canonical wines.
 *
 * Matching (in order):
 *   1. CSV manifest rows: filename + store_listing_id (+ optional source_image_url)
 *   2. Filename stem equal to store_listings.id (UUID) when no manifest row
 *   3. Optional --match-url-basename: unique basename match against store_listings.image_url
 *
 * Never maps a filename to a wine id. Never creates wines. Unmatched / ambiguous
 * files are reported only.
 *
 * Source provenance stays on store_listings.image_url.
 * Destination: wines.hosted_image_path → wine-images/{wine_id}/original.{ext}
 *
 * Frontend display of hosted images stays OFF until
 * NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES=true is set in the deployment environment.
 *
 * Usage (PowerShell):
 *   npx tsx scripts/upload-local-wine-images.ts --dir="D:\images" --dry-run --max=5
 *   npx tsx scripts/upload-local-wine-images.ts --dir="D:\images" --manifest=.\manifest.csv --dry-run
 *   npx tsx scripts/upload-local-wine-images.ts --generate-manifest=.\manifest-template.csv
 *   npm run upload:images -- --dir="D:\images" --dry-run --max=5
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).
 * Apply supabase/migrations/012_wine_hosted_images.sql (and 013/014) before uploading.
 */

import { createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  extensionFromFilename,
  LOCAL_UPLOAD_EXTENSIONS,
  MAX_IMAGE_BYTES,
  validateLocalImageBytes,
} from '../lib/wine-image-download'
import {
  WINE_IMAGES_BUCKET,
  wineImageStoragePath,
  type ImageMigrationStatus,
} from '../lib/wine-images'

loadEnv({ path: resolve(process.cwd(), '.env.local') })
loadEnv()

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type CliOptions = {
  dir: string | null
  manifestPath: string | null
  generateManifestPath: string | null
  reportPath: string | null
  dryRun: boolean
  max: number | null
  concurrency: number
  force: boolean
  matchUrlBasename: boolean
  overwriteStorage: boolean
  recursive: boolean
}

type ManifestRow = {
  filename: string
  storeListingId: string
  sourceImageUrl: string | null
  line: number
}

type ListingRow = {
  id: string
  wine_id: string | null
  image_url: string | null
  raw_title: string | null
  store_product_url: string | null
}

type WineRow = {
  id: string
  producer: string | null
  wine_name: string | null
  hosted_image_path: string | null
  image_migration_status: string | null
  image_source_listing_id: string | null
}

type Outcome =
  | 'success'
  | 'failed'
  | 'skipped'
  | 'unmatched'
  | 'ambiguous'

type ReportRow = {
  filename: string
  absolute_path: string
  store_listing_id: string
  wine_id: string
  source_image_url: string
  storage_path: string
  outcome: Outcome
  reason: string
  bytes: string
  mime: string
}

type WorkItem = {
  filename: string
  absolutePath: string
  storeListingId: string | null
  sourceImageUrl: string | null
  matchMethod: 'manifest' | 'listing-id-filename' | 'url-basename' | 'none'
  preOutcome?: Outcome
  preReason?: string
}

function parseArgs(argv: string[]): CliOptions {
  let dir: string | null = null
  let manifestPath: string | null = null
  let generateManifestPath: string | null = null
  let reportPath: string | null = null
  let dryRun = false
  let max: number | null = null
  let concurrency = 2
  let force = false
  let matchUrlBasename = false
  let overwriteStorage = false
  let recursive = true

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--force') {
      force = true
      continue
    }
    if (arg === '--match-url-basename') {
      matchUrlBasename = true
      continue
    }
    if (arg === '--overwrite-storage') {
      overwriteStorage = true
      continue
    }
    if (arg === '--recursive') {
      recursive = true
      continue
    }
    if (arg === '--no-recursive') {
      recursive = false
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
    if (arg.startsWith('--manifest=')) {
      manifestPath = arg.slice('--manifest='.length).trim() || null
      continue
    }
    if (arg.startsWith('--generate-manifest=')) {
      generateManifestPath = arg.slice('--generate-manifest='.length).trim() || null
      continue
    }
    if (arg.startsWith('--report=')) {
      reportPath = arg.slice('--report='.length).trim() || null
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
    throw new Error(`Unknown argument: ${arg}`)
  }

  return {
    dir,
    manifestPath,
    generateManifestPath,
    reportPath,
    dryRun,
    max,
    concurrency,
    force,
    matchUrlBasename,
    overwriteStorage,
    recursive,
  }
}

function printHelp() {
  console.log(`Upload local retailer images into ${WINE_IMAGES_BUCKET} and link canonical wines.

Matching uses store_listings.id (never wine id filenames). Prefer a CSV manifest.

Options:
  --dir=PATH                 Local folder of images (jpg/jpeg/png/webp/avif)
  --manifest=PATH            CSV with filename,store_listing_id[,source_image_url]
  --match-url-basename       If no listing id, match unique image_url basename
  --generate-manifest=PATH   Write a template CSV from DB (no upload)
  --dry-run                  Validate/match only; no upload or DB writes
  --max=N                    Process at most N image files
  --concurrency=N            Parallel uploads (default 2)
  --force                    Re-process wines already marked success
  --overwrite-storage        Allow replacing an existing storage object
  --no-recursive             Do not scan subfolders (default scans recursively)
  --report=PATH              CSV report path (default tmp/local-image-upload-report.csv)
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

  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, () =>
    runWorker(),
  )
  await Promise.all(workers)
  return results
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i += 1
        continue
      }
      if (ch === '"') {
        inQuotes = false
        continue
      }
      field += ch
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    if (ch === '\r') continue
    field += ch
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

async function loadManifest(path: string): Promise<ManifestRow[]> {
  const text = await readFile(path, 'utf8')
  const rows = parseCsv(text)
  if (rows.length < 2) {
    throw new Error(`Manifest ${path} has no data rows`)
  }

  const headers = rows[0]!.map(normalizeHeader)
  const filenameIdx = headers.findIndex((h) => h === 'filename' || h === 'file' || h === 'file_name')
  const listingIdx = headers.findIndex(
    (h) =>
      h === 'store_listing_id' ||
      h === 'listing_id' ||
      h === 'retailer_listing_id' ||
      h === 'id',
  )
  const urlIdx = headers.findIndex(
    (h) =>
      h === 'source_image_url' ||
      h === 'image_url' ||
      h === 'source_url' ||
      h === 'retailer_image_url',
  )

  if (filenameIdx < 0 || listingIdx < 0) {
    throw new Error(
      'Manifest must include filename and store_listing_id columns (aliases: file, listing_id, image_url)',
    )
  }

  const out: ManifestRow[] = []
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i]!
    const filename = (cells[filenameIdx] ?? '').trim()
    const storeListingId = (cells[listingIdx] ?? '').trim()
    const sourceImageUrl =
      urlIdx >= 0 ? (cells[urlIdx] ?? '').trim() || null : null

    if (!filename && !storeListingId) continue
    out.push({
      filename,
      storeListingId,
      sourceImageUrl,
      line: i + 1,
    })
  }

  return out
}

async function listLocalImages(dir: string, recursive: boolean): Promise<string[]> {
  const files: string[] = []

  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        if (recursive) await walk(full)
        continue
      }
      if (!entry.isFile()) continue
      const ext = extensionFromFilename(entry.name)
      if (!ext || !LOCAL_UPLOAD_EXTENSIONS.has(ext)) continue
      files.push(full)
    }
  }

  await walk(dir)
  files.sort((a, b) => a.localeCompare(b))
  return files
}

function urlBasename(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const pathname = new URL(url.trim()).pathname
    const name = basename(pathname)
    return name || null
  } catch {
    const cleaned = url.trim().split('?')[0] ?? ''
    const name = basename(cleaned)
    return name || null
  }
}

async function fetchAllListings(client: SupabaseClient): Promise<ListingRow[]> {
  const pageSize = 500
  const rows: ListingRow[] = []
  let from = 0

  while (true) {
    const { data, error } = await client
      .from('store_listings')
      .select('id, wine_id, image_url, raw_title, store_product_url')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`Failed to fetch store_listings: ${error.message}`)
    }

    const batch = (data ?? []) as ListingRow[]
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function fetchWinesByIds(client: SupabaseClient, ids: string[]): Promise<Map<string, WineRow>> {
  const map = new Map<string, WineRow>()
  const unique = [...new Set(ids.filter(Boolean))]
  const chunkSize = 100

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await client
      .from('wines')
      .select(
        'id, producer, wine_name, hosted_image_path, image_migration_status, image_source_listing_id',
      )
      .in('id', chunk)

    if (error) {
      throw new Error(`Failed to fetch wines: ${error.message}`)
    }

    for (const row of (data ?? []) as WineRow[]) {
      map.set(row.id, row)
    }
  }

  return map
}

async function writeCsv(path: string, headers: string[], rows: string[][]) {
  const abs = resolve(path)
  await mkdir(dirname(abs), { recursive: true })
  const stream = createWriteStream(abs, { encoding: 'utf8' })
  stream.write(`${headers.map(csvEscape).join(',')}\n`)
  for (const row of rows) {
    stream.write(`${row.map(csvEscape).join(',')}\n`)
  }
  await new Promise<void>((resolvePromise, reject) => {
    stream.end(() => resolvePromise())
    stream.on('error', reject)
  })
  return abs
}

async function generateManifest(client: SupabaseClient, outPath: string) {
  const listings = await fetchAllListings(client)
  const headers = [
    'filename',
    'store_listing_id',
    'wine_id',
    'source_image_url',
    'raw_title',
    'store_product_url',
    'suggested_filename',
  ]

  const rows = listings.map((listing) => {
    const suggested = urlBasename(listing.image_url) ?? `${listing.id}.jpg`
    return [
      suggested,
      listing.id,
      listing.wine_id ?? '',
      listing.image_url ?? '',
      listing.raw_title ?? '',
      listing.store_product_url ?? '',
      suggested,
    ]
  })

  const abs = await writeCsv(outPath, headers, rows)
  log('info', 'wrote manifest template', {
    path: abs,
    listings: listings.length,
    withWineId: listings.filter((l) => l.wine_id).length,
    withImageUrl: listings.filter((l) => l.image_url?.trim()).length,
  })
}

function buildWorkItems(
  localFiles: string[],
  manifestByFilename: Map<string, ManifestRow[]>,
  listingsById: Map<string, ListingRow>,
  listingsByUrlBasename: Map<string, ListingRow[]>,
  options: CliOptions,
): WorkItem[] {
  const items: WorkItem[] = []
  const pathsByBasename = new Map<string, string[]>()
  for (const absolutePath of localFiles) {
    const name = basename(absolutePath)
    const list = pathsByBasename.get(name) ?? []
    list.push(absolutePath)
    pathsByBasename.set(name, list)
  }

  for (const absolutePath of localFiles) {
    const filename = basename(absolutePath)
    const stem = filename.slice(0, filename.length - extname(filename).length)
    const duplicateLocals = pathsByBasename.get(filename) ?? [absolutePath]
    if (duplicateLocals.length > 1) {
      items.push({
        filename,
        absolutePath,
        storeListingId: null,
        sourceImageUrl: null,
        matchMethod: 'none',
        preOutcome: 'ambiguous',
        preReason: `Duplicate local basename (${duplicateLocals.length} files); rename or point --dir at a single folder`,
      })
      continue
    }

    const manifestRows = manifestByFilename.get(filename) ?? manifestByFilename.get(stem) ?? []

    if (manifestRows.length > 1) {
      items.push({
        filename,
        absolutePath,
        storeListingId: null,
        sourceImageUrl: null,
        matchMethod: 'none',
        preOutcome: 'ambiguous',
        preReason: `Multiple manifest rows for filename (${manifestRows.length})`,
      })
      continue
    }

    if (manifestRows.length === 1) {
      const row = manifestRows[0]!
      if (!UUID_RE.test(row.storeListingId)) {
        items.push({
          filename,
          absolutePath,
          storeListingId: row.storeListingId || null,
          sourceImageUrl: row.sourceImageUrl,
          matchMethod: 'manifest',
          preOutcome: 'unmatched',
          preReason: `Manifest store_listing_id is not a UUID (line ${row.line})`,
        })
        continue
      }
      items.push({
        filename,
        absolutePath,
        storeListingId: row.storeListingId,
        sourceImageUrl: row.sourceImageUrl,
        matchMethod: 'manifest',
      })
      continue
    }

    if (UUID_RE.test(stem) && listingsById.has(stem)) {
      items.push({
        filename,
        absolutePath,
        storeListingId: stem,
        sourceImageUrl: null,
        matchMethod: 'listing-id-filename',
      })
      continue
    }

    if (options.matchUrlBasename) {
      const matches = listingsByUrlBasename.get(filename) ?? []
      if (matches.length === 1) {
        items.push({
          filename,
          absolutePath,
          storeListingId: matches[0]!.id,
          sourceImageUrl: matches[0]!.image_url,
          matchMethod: 'url-basename',
        })
        continue
      }
      if (matches.length > 1) {
        items.push({
          filename,
          absolutePath,
          storeListingId: null,
          sourceImageUrl: null,
          matchMethod: 'none',
          preOutcome: 'ambiguous',
          preReason: `Ambiguous image_url basename match (${matches.length} listings)`,
        })
        continue
      }
    }

    items.push({
      filename,
      absolutePath,
      storeListingId: null,
      sourceImageUrl: null,
      matchMethod: 'none',
      preOutcome: 'unmatched',
      preReason: options.manifestPath
        ? 'No manifest row for this filename (and no listing-id / unique url-basename match)'
        : 'No store_listing_id match from filename (provide --manifest or --match-url-basename)',
    })
  }

  return items
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

async function processItem(
  client: SupabaseClient,
  item: WorkItem,
  listingsById: Map<string, ListingRow>,
  winesById: Map<string, WineRow>,
  options: CliOptions,
): Promise<ReportRow> {
  const baseReport: ReportRow = {
    filename: item.filename,
    absolute_path: item.absolutePath,
    store_listing_id: item.storeListingId ?? '',
    wine_id: '',
    source_image_url: item.sourceImageUrl ?? '',
    storage_path: '',
    outcome: item.preOutcome ?? 'failed',
    reason: item.preReason ?? '',
    bytes: '',
    mime: '',
  }

  if (item.preOutcome) {
    return baseReport
  }

  const listing = item.storeListingId ? listingsById.get(item.storeListingId) : null
  if (!listing) {
    return {
      ...baseReport,
      outcome: 'unmatched',
      reason: `store_listings row not found for id ${item.storeListingId}`,
    }
  }

  if (!listing.wine_id) {
    return {
      ...baseReport,
      store_listing_id: listing.id,
      source_image_url: item.sourceImageUrl ?? listing.image_url ?? '',
      outcome: 'unmatched',
      reason: 'Listing has no wine_id (not linked to a canonical wine; will not create one)',
    }
  }

  const wine = winesById.get(listing.wine_id)
  if (!wine) {
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: listing.wine_id,
      source_image_url: item.sourceImageUrl ?? listing.image_url ?? '',
      outcome: 'unmatched',
      reason: `Canonical wine ${listing.wine_id} not found`,
    }
  }

  const sourceImageUrl = item.sourceImageUrl ?? listing.image_url ?? ''
  if (
    item.sourceImageUrl &&
    listing.image_url?.trim() &&
    item.sourceImageUrl.trim() !== listing.image_url.trim()
  ) {
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: item.sourceImageUrl,
      outcome: 'failed',
      reason:
        'Manifest source_image_url does not match store_listings.image_url (refusing ambiguous provenance)',
    }
  }

  if (
    !options.force &&
    wine.image_migration_status === 'success' &&
    wine.hosted_image_path
  ) {
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: sourceImageUrl,
      storage_path: wine.hosted_image_path,
      outcome: 'skipped',
      reason: 'Wine already has hosted image (use --force to re-process; storage not overwritten by default)',
    }
  }

  let fileStat
  try {
    fileStat = await stat(item.absolutePath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: sourceImageUrl,
      outcome: 'failed',
      reason: `Cannot read file: ${message}`,
    }
  }

  if (!fileStat.isFile()) {
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: sourceImageUrl,
      outcome: 'failed',
      reason: 'Path is not a file',
    }
  }

  if (fileStat.size > MAX_IMAGE_BYTES) {
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: sourceImageUrl,
      outcome: 'failed',
      reason: `File too large (${fileStat.size} bytes; max ${MAX_IMAGE_BYTES})`,
      bytes: String(fileStat.size),
    }
  }

  const bytes = new Uint8Array(await readFile(item.absolutePath))
  const validated = validateLocalImageBytes(bytes)
  if (!validated.ok) {
    await markWineStatus(
      client,
      wine.id,
      {
        image_migration_status: 'failed',
        image_migration_error: validated.error.slice(0, 1000),
        image_source_listing_id: listing.id,
      },
      options.dryRun,
    )
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: sourceImageUrl,
      outcome: 'failed',
      reason: validated.error,
      bytes: String(bytes.length),
    }
  }

  const storagePath = wineImageStoragePath(wine.id, validated.format.extension)

  if (options.dryRun) {
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: sourceImageUrl,
      storage_path: storagePath,
      outcome: 'success',
      reason: `dry-run ok via ${item.matchMethod}; would upload ${validated.format.mime}`,
      bytes: String(bytes.length),
      mime: validated.format.mime,
    }
  }

  const exists = await objectExists(client, storagePath)
  if (exists && !options.overwriteStorage) {
    await markWineStatus(
      client,
      wine.id,
      {
        image_migration_status: 'success',
        image_migration_error: null,
        hosted_image_path: storagePath,
        image_source_listing_id: listing.id,
      },
      false,
    )
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: sourceImageUrl,
      storage_path: storagePath,
      outcome: 'skipped',
      reason: 'Storage object already present; linked without overwrite',
      bytes: String(bytes.length),
      mime: validated.format.mime,
    }
  }

  const { error: uploadError } = await client.storage
    .from(WINE_IMAGES_BUCKET)
    .upload(storagePath, bytes, {
      contentType: validated.format.mime,
      upsert: options.overwriteStorage,
      cacheControl: '31536000',
    })

  if (uploadError) {
    const message = uploadError.message ?? String(uploadError)
    const alreadyExists = /already exists|Duplicate|resource already exists/i.test(message)

    if (alreadyExists && !options.overwriteStorage) {
      await markWineStatus(
        client,
        wine.id,
        {
          image_migration_status: 'success',
          image_migration_error: null,
          hosted_image_path: storagePath,
          image_source_listing_id: listing.id,
        },
        false,
      )
      return {
        ...baseReport,
        store_listing_id: listing.id,
        wine_id: wine.id,
        source_image_url: sourceImageUrl,
        storage_path: storagePath,
        outcome: 'skipped',
        reason: 'Upload skipped; object already exists',
        bytes: String(bytes.length),
        mime: validated.format.mime,
      }
    }

    await markWineStatus(
      client,
      wine.id,
      {
        image_migration_status: 'failed',
        image_migration_error: `Upload failed: ${message}`.slice(0, 1000),
        image_source_listing_id: listing.id,
      },
      false,
    )
    return {
      ...baseReport,
      store_listing_id: listing.id,
      wine_id: wine.id,
      source_image_url: sourceImageUrl,
      storage_path: storagePath,
      outcome: 'failed',
      reason: `Upload failed: ${message}`,
      bytes: String(bytes.length),
      mime: validated.format.mime,
    }
  }

  // Never mutate store_listings.image_url — preserve retailer provenance.
  await markWineStatus(
    client,
    wine.id,
    {
      image_migration_status: 'success',
      image_migration_error: null,
      hosted_image_path: storagePath,
      image_source_listing_id: listing.id,
    },
    false,
  )

  return {
    ...baseReport,
    store_listing_id: listing.id,
    wine_id: wine.id,
    source_image_url: sourceImageUrl,
    storage_path: storagePath,
    outcome: 'success',
    reason: `uploaded via ${item.matchMethod}`,
    bytes: String(bytes.length),
    mime: validated.format.mime,
  }
}

async function ensureBucketOrExplain(client: SupabaseClient) {
  const { data, error } = await client.storage.getBucket(WINE_IMAGES_BUCKET)
  if (data) return
  const message = error?.message ?? 'bucket missing'
  throw new Error(
    `Storage bucket "${WINE_IMAGES_BUCKET}" is not available (${message}). ` +
      'Apply supabase/migrations/012_wine_hosted_images.sql (and 013_wine_images_allow_avif.sql), ' +
      'or create a public bucket named wine-images (10MB limit; jpeg/png/webp/gif/avif) in the Supabase dashboard.',
  )
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const client = createServiceClient()

  if (options.generateManifestPath) {
    await generateManifest(client, options.generateManifestPath)
    return
  }

  if (!options.dir) {
    throw new Error('Missing --dir=PATH (or use --generate-manifest=PATH)')
  }

  const imageDir = isAbsolute(options.dir) ? options.dir : resolve(process.cwd(), options.dir)
  const dirInfo = await stat(imageDir)
  if (!dirInfo.isDirectory()) {
    throw new Error(`Not a directory: ${imageDir}`)
  }

  log('info', 'checking storage bucket', { bucket: WINE_IMAGES_BUCKET })
  await ensureBucketOrExplain(client)
  log('info', 'storage bucket ok', { bucket: WINE_IMAGES_BUCKET })

  const reportPath =
    options.reportPath ??
    join(process.cwd(), 'tmp', `local-image-upload-report-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`)

  log('info', 'starting local wine image upload', {
    dir: imageDir,
    manifest: options.manifestPath,
    dryRun: options.dryRun,
    max: options.max,
    concurrency: options.concurrency,
    force: options.force,
    matchUrlBasename: options.matchUrlBasename,
    overwriteStorage: options.overwriteStorage,
    recursive: options.recursive,
    bucket: WINE_IMAGES_BUCKET,
    maxImageBytes: MAX_IMAGE_BYTES,
    hostedDisplayFlag: process.env.NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES === 'true',
    reportPath,
  })

  if (process.env.NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES === 'true') {
    log(
      'warn',
      'NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES=true — production frontend will show hosted images once status=success',
    )
  } else {
    log(
      'info',
      'Hosted image display is OFF (NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES not true); uploads will not change production UI',
    )
  }

  log('info', 'scanning local image directory', { dir: imageDir, recursive: options.recursive })
  let localFiles = await listLocalImages(imageDir, options.recursive)
  if (options.max != null) {
    localFiles = localFiles.slice(0, options.max)
  }

  log('info', 'local images discovered', { count: localFiles.length })

  log('info', 'fetching store_listings from Supabase')
  const listings = await fetchAllListings(client)
  log('info', 'store_listings loaded', { count: listings.length })
  const listingsById = new Map(listings.map((l) => [l.id, l]))
  const listingsByUrlBasename = new Map<string, ListingRow[]>()
  for (const listing of listings) {
    const name = urlBasename(listing.image_url)
    if (!name) continue
    const list = listingsByUrlBasename.get(name) ?? []
    list.push(listing)
    listingsByUrlBasename.set(name, list)
  }

  const manifestByFilename = new Map<string, ManifestRow[]>()
  if (options.manifestPath) {
    const manifestAbs = isAbsolute(options.manifestPath)
      ? options.manifestPath
      : resolve(process.cwd(), options.manifestPath)
    log('info', 'loading manifest', { path: manifestAbs })
    const manifestRows = await loadManifest(manifestAbs)
    for (const row of manifestRows) {
      const key = basename(row.filename)
      const list = manifestByFilename.get(key) ?? []
      list.push(row)
      manifestByFilename.set(key, list)
      const stem = key.slice(0, key.length - extname(key).length)
      if (stem && stem !== key) {
        const stemList = manifestByFilename.get(stem) ?? []
        stemList.push(row)
        manifestByFilename.set(stem, stemList)
      }
    }
    log('info', 'manifest loaded', { rows: manifestRows.length, path: manifestAbs })
  }

  const workItems = buildWorkItems(
    localFiles,
    manifestByFilename,
    listingsById,
    listingsByUrlBasename,
    options,
  )
  log('info', 'work items ready', { count: workItems.length })

  const wineIds = workItems
    .map((item) => (item.storeListingId ? listingsById.get(item.storeListingId)?.wine_id : null))
    .filter((id): id is string => Boolean(id))
  log('info', 'fetching canonical wines', { count: new Set(wineIds).size })
  const winesById = await fetchWinesByIds(client, wineIds)
  log('info', 'wines loaded', { count: winesById.size })

  let completed = 0
  const total = workItems.length
  const reports = await mapPool(workItems, options.concurrency, async (item) => {
    const report = await processItem(client, item, listingsById, winesById, options)
    completed += 1
    if (completed === 1 || completed === total || completed % 25 === 0) {
      log('info', 'progress', { completed, total, pct: Math.round((completed / total) * 100) })
    }
    log(
      report.outcome === 'failed' || report.outcome === 'unmatched' || report.outcome === 'ambiguous'
        ? 'warn'
        : 'info',
      'processed local image',
      {
        filename: report.filename,
        outcome: report.outcome,
        reason: report.reason,
        listingId: report.store_listing_id || undefined,
        wineId: report.wine_id || undefined,
        path: report.storage_path || undefined,
        dryRun: options.dryRun,
      },
    )
    return report
  })

  const headers = [
    'filename',
    'absolute_path',
    'store_listing_id',
    'wine_id',
    'source_image_url',
    'storage_path',
    'outcome',
    'reason',
    'bytes',
    'mime',
  ]

  const absReport = await writeCsv(
    reportPath,
    headers,
    reports.map((r) => [
      r.filename,
      r.absolute_path,
      r.store_listing_id,
      r.wine_id,
      r.source_image_url,
      r.storage_path,
      r.outcome,
      r.reason,
      r.bytes,
      r.mime,
    ]),
  )

  const summary = {
    processed: reports.length,
    success: reports.filter((r) => r.outcome === 'success').length,
    failed: reports.filter((r) => r.outcome === 'failed').length,
    skipped: reports.filter((r) => r.outcome === 'skipped').length,
    unmatched: reports.filter((r) => r.outcome === 'unmatched').length,
    ambiguous: reports.filter((r) => r.outcome === 'ambiguous').length,
    dryRun: options.dryRun,
    report: absReport,
  }

  log('info', 'local wine image upload complete', summary)

  if (summary.failed > 0 || summary.unmatched > 0 || summary.ambiguous > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  log('error', 'fatal local upload error', { error: message })
  process.exit(1)
})
