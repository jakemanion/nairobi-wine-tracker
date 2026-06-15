import { loadConfig } from './config'
import { createSupabaseClient } from './db/supabaseClient'
import { WineRepository } from './db/wineRepository'
import { EnrichBatchPipeline } from './pipeline/enrichBatch'
import { SerpApiService } from './services/serpapi'
import { VivinoScraperService } from './services/vivinoScraper'
import { EnrichmentLogger } from './utils/logger'

async function main() {
  const config = loadConfig()
  const logger = new EnrichmentLogger({
    logToFile: config.logToFile,
    logFilePath: config.logFilePath,
  })

  const supabase = createSupabaseClient(config)
  const repository = new WineRepository(supabase)
  const serpApi = new SerpApiService(config)
  const vivinoScraper = new VivinoScraperService(config)
  const pipeline = new EnrichBatchPipeline(
    config,
    repository,
    serpApi,
    vivinoScraper,
    logger,
  )

  const pendingQuery = {
    force: config.forceReprocess,
    onlyFullyMissing: config.onlyFullyMissingVivino,
  }

  const pendingCount = await repository.countPending(pendingQuery)
  logger.info('vivino enrichment run started', {
    batchSize: config.batchSize,
    pendingCount,
    forceReprocess: config.forceReprocess,
    onlyFullyMissingVivino: config.onlyFullyMissingVivino,
    vivinoFetchMode: config.vivinoFetchMode,
    requestDelayMs: [config.requestDelayMinMs, config.requestDelayMaxMs],
    maxBatches: config.maxBatches,
  })

  if (pendingCount === 0) {
    logger.info('no pending wines to enrich')
    return
  }

  let batchNumber = 0
  let totalProcessed = 0
  let totalMatched = 0
  let totalReviewRequired = 0
  let totalFailed = 0

  while (true) {
    if (config.maxBatches != null && batchNumber >= config.maxBatches) {
      logger.info('max batch limit reached', { maxBatches: config.maxBatches })
      break
    }

    const wines = await repository.fetchPendingBatch(config.batchSize, pendingQuery)
    if (!wines.length) {
      logger.info('no more pending wines in current run')
      break
    }

    batchNumber += 1
    logger.info('processing batch', {
      batchNumber,
      batchSize: wines.length,
      wineIds: wines.map((wine) => wine.id),
    })

    const summary = await pipeline.runBatch(wines)
    totalProcessed += summary.processed
    totalMatched += summary.matched
    totalReviewRequired += summary.reviewRequired
    totalFailed += summary.failed

    logger.info('batch complete', {
      batchNumber,
      ...summary,
    })

    if (wines.length < config.batchSize) {
      break
    }
  }

  const remaining = await repository.countPending(pendingQuery)

  logger.info('vivino enrichment run finished', {
    batches: batchNumber,
    totalProcessed,
    totalMatched,
    totalReviewRequired,
    totalFailed,
    remaining,
  })
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(
    JSON.stringify({
      level: 'fatal',
      message: 'vivino enrichment crashed',
      timestamp: new Date().toISOString(),
      error: message,
    }),
  )
  process.exitCode = 1
})
