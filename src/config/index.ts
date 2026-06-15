import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })
loadEnv()

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function readBool(name: string, fallback = false): boolean {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

export type VivinoFetchMode = 'off' | 'auto' | 'always'

export type EnrichmentConfig = {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  serpApiKey: string
  batchSize: number
  requestDelayMinMs: number
  requestDelayMaxMs: number
  maxRetries: number
  confidenceThreshold: number
  forceReprocess: boolean
  onlyFullyMissingVivino: boolean
  vivinoFetchMode: VivinoFetchMode
  maxBatches: number | null
  logToFile: boolean
  logFilePath: string
  serpApiTimeoutMs: number
  vivinoFetchTimeoutMs: number
}

function readVivinoFetchMode(): VivinoFetchMode {
  const raw = (process.env.ENRICH_VIVINO_FETCH ?? 'off').toLowerCase()
  if (raw === 'auto' || raw === 'always') return raw
  return 'off'
}

export function loadConfig(): EnrichmentConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serpApiKey = process.env.SERPAPI_API_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  }
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  if (!serpApiKey) {
    throw new Error('Missing SERPAPI_API_KEY')
  }

  const requestDelayMinMs = readInt('ENRICH_REQUEST_DELAY_MIN_MS', 500, 0, 60_000)
  const requestDelayMaxMs = readInt(
    'ENRICH_REQUEST_DELAY_MAX_MS',
    1500,
    requestDelayMinMs,
    60_000,
  )

  const maxBatchesRaw = process.env.ENRICH_MAX_BATCHES
  const maxBatches =
    maxBatchesRaw && maxBatchesRaw.trim() !== ''
      ? readInt('ENRICH_MAX_BATCHES', 1, 1, 10_000)
      : null

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    serpApiKey,
    batchSize: readInt('ENRICH_BATCH_SIZE', 25, 1, 50),
    requestDelayMinMs,
    requestDelayMaxMs,
    maxRetries: readInt('ENRICH_MAX_RETRIES', 2, 0, 5),
    confidenceThreshold: readInt('ENRICH_CONFIDENCE_THRESHOLD', 75, 0, 100),
    forceReprocess: readBool('ENRICH_FORCE_REPROCESS', false),
    onlyFullyMissingVivino: readBool('ENRICH_ONLY_FULLY_MISSING', false),
    vivinoFetchMode: readVivinoFetchMode(),
    maxBatches,
    logToFile: readBool('ENRICH_LOG_TO_FILE', true),
    logFilePath: process.env.ENRICH_LOG_FILE ?? 'logs/vivino-enrichment.jsonl',
    serpApiTimeoutMs: readInt('ENRICH_SERPAPI_TIMEOUT_MS', 20_000, 5_000, 120_000),
    vivinoFetchTimeoutMs: readInt('ENRICH_VIVINO_TIMEOUT_MS', 25_000, 5_000, 120_000),
  }
}
