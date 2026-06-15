import type { EnrichmentConfig } from '../config'
import type { WineEnrichmentRecord, WineRepository } from '../db/wineRepository'
import { scoreWineMatch } from '../services/matcher'
import type { SerpApiService, SerpApiResult } from '../services/serpapi'
import { hasSnippetRating, serpSnippetToScrapedData } from '../services/serpSnippet'
import type { VivinoScrapedData, VivinoScraperService } from '../services/vivinoScraper'
import { randomDelay } from '../utils/delay'
import {
  diagnoseAxiosError,
  EnrichmentFailureError,
  type FailureDiagnostic,
} from '../utils/failureDiagnostics'
import type { EnrichmentLogger } from '../utils/logger'

export type BatchSummary = {
  processed: number
  matched: number
  reviewRequired: number
  failed: number
}

type ScrapeSource = 'serp_snippet' | 'vivino_page'

export class EnrichBatchPipeline {
  constructor(
    private readonly config: EnrichmentConfig,
    private readonly repository: WineRepository,
    private readonly serpApi: SerpApiService,
    private readonly vivinoScraper: VivinoScraperService,
    private readonly logger: EnrichmentLogger,
  ) {}

  async runBatch(wines: WineEnrichmentRecord[]): Promise<BatchSummary> {
    const summary: BatchSummary = {
      processed: 0,
      matched: 0,
      reviewRequired: 0,
      failed: 0,
    }

    for (const wine of wines) {
      summary.processed += 1

      try {
        const outcome = await this.enrichWine(wine)
        if (outcome === 'matched') summary.matched += 1
        else if (outcome === 'review_required') summary.reviewRequired += 1
        else summary.failed += 1
      } catch (error) {
        summary.failed += 1
        const diagnostic = this.toDiagnostic(error)
        this.logger.failure(wine, diagnostic)
        await this.repository.updateWine(wine.id, this.repository.buildFailureUpdate(0))
      }

      if (summary.processed < wines.length) {
        await randomDelay(this.config.requestDelayMinMs, this.config.requestDelayMaxMs)
      }
    }

    return summary
  }

  private toDiagnostic(error: unknown): FailureDiagnostic {
    if (error instanceof EnrichmentFailureError) return error.diagnostic
    return diagnoseAxiosError('unknown', error)
  }

  private async recordFailure(
    wine: WineEnrichmentRecord,
    diagnostic: FailureDiagnostic,
    vivinoUrl: string | null = null,
  ): Promise<'failed'> {
    this.logger.failure(wine, diagnostic, vivinoUrl)
    await this.repository.updateWine(wine.id, this.repository.buildFailureUpdate(0))
    return 'failed'
  }

  private async resolveScrapedData(
    wine: WineEnrichmentRecord,
    vivinoUrl: string,
    serpResult: SerpApiResult | null,
  ): Promise<{ data: VivinoScrapedData; source: ScrapeSource } | null> {
    const snippetData = serpResult
      ? serpSnippetToScrapedData(vivinoUrl, serpResult.title, serpResult.snippet)
      : null

    const snippetHasRating = snippetData != null && hasSnippetRating({
      wineName: snippetData.wineName,
      producer: snippetData.producer,
      rating: snippetData.rating,
      reviewCount: snippetData.reviewCount,
      country: snippetData.country,
      region: snippetData.region,
      grapeVarieties: null,
    })

    if (this.config.vivinoFetchMode === 'off') {
      if (!snippetData) return null
      this.logger.info('using serp snippet only (vivino fetch disabled)', {
        wineId: wine.id,
        vivinoUrl,
        extractedRating: snippetData.rating,
        extractedReviewCount: snippetData.reviewCount,
      })
      return { data: snippetData, source: 'serp_snippet' }
    }

    if (this.config.vivinoFetchMode === 'auto' && snippetHasRating && snippetData) {
      this.logger.info('using serp snippet (auto mode, rating found in google)', {
        wineId: wine.id,
        vivinoUrl,
        extractedRating: snippetData.rating,
        extractedReviewCount: snippetData.reviewCount,
      })
      return { data: snippetData, source: 'serp_snippet' }
    }

    try {
      const { data, meta } = await this.vivinoScraper.scrape(vivinoUrl)
      this.logger.info('vivino page fetched', {
        wineId: wine.id,
        vivinoUrl,
        httpStatus: meta.httpStatus,
        htmlLength: meta.htmlLength,
        serverHeader: meta.serverHeader,
        blockIndicators: meta.blockIndicators,
        extractedRating: data.rating,
        extractedReviewCount: data.reviewCount,
      })
      return { data, source: 'vivino_page' }
    } catch (error) {
      if (!(error instanceof EnrichmentFailureError)) throw error

      const blocked = error.diagnostic.category === 'blocked' || error.diagnostic.blocked
      if (snippetData && (blocked || this.config.vivinoFetchMode === 'auto')) {
        this.logger.warn('vivino fetch failed, falling back to serp snippet', {
          wineId: wine.id,
          vivinoUrl,
          failureCategory: error.diagnostic.category,
          failureReason: error.diagnostic.reason,
          extractedRating: snippetData.rating,
          extractedReviewCount: snippetData.reviewCount,
        })
        return { data: snippetData, source: 'serp_snippet' }
      }

      throw error
    }
  }

  private async enrichWine(
    wine: WineEnrichmentRecord,
  ): Promise<'matched' | 'review_required' | 'failed'> {
    let vivinoUrl = wine.vivino_url
    let serpResult: SerpApiResult | null = null

    if (!vivinoUrl || wine.vivino_rating == null) {
      const discovery = await this.serpApi.findVivinoUrl({
        producer: wine.producer,
        wine_name: wine.wine_name,
        vintage: wine.vintage,
      })

      if (discovery.result) {
        serpResult = discovery.result
        if (!vivinoUrl) vivinoUrl = discovery.result.url

        this.logger.info('vivino url discovered', {
          wineId: wine.id,
          wineName: wine.wine_name,
          vivinoUrl,
          serpTitle: discovery.result.title,
          serpQuery: discovery.result.query,
          serpSnippet: discovery.result.snippet,
          serpAttempts: discovery.attempts,
        })
      } else if (!vivinoUrl) {
        return this.recordFailure(wine, this.serpApi.describeNoResult(discovery))
      }

      if (!vivinoUrl) {
        return this.recordFailure(wine, {
          stage: 'serpapi_search',
          category: 'no_results',
          reason: 'No Vivino URL available for enrichment',
        })
      }

      await randomDelay(this.config.requestDelayMinMs, this.config.requestDelayMaxMs)
    }

    const resolved = await this.resolveScrapedData(wine, vivinoUrl, serpResult)
    if (!resolved) {
      return this.recordFailure(
        wine,
        {
          stage: 'vivino_parse',
          category: 'parse_error',
          reason:
            'No rating in Google snippet and Vivino page fetch is disabled (ENRICH_VIVINO_FETCH=off)',
          vivinoUrl,
        },
        vivinoUrl,
      )
    }

    const { data: scraped, source } = resolved

    if (scraped.rating == null) {
      const update = this.repository.buildPartialUpdate(
        wine,
        { url: vivinoUrl },
        0,
        'review_required',
      )
      await this.repository.updateWine(wine.id, update)
      this.logger.result({
        timestamp: new Date().toISOString(),
        wineId: wine.id,
        wineName: wine.wine_name,
        producer: wine.producer,
        vivinoUrl,
        confidence: 0,
        status: 'review_required',
        message: `Vivino URL saved but no rating found via ${source}`,
      })
      return 'review_required'
    }

    const match = scoreWineMatch(wine, scraped, this.config.confidenceThreshold)

    const update = this.repository.buildPartialUpdate(
      wine,
      {
        url: vivinoUrl,
        rating: scraped.rating,
        reviewCount: scraped.reviewCount,
        country: scraped.country,
        region: scraped.region,
        grapeVarieties: scraped.grapeVarieties,
      },
      match.confidence,
      match.status,
    )

    await this.repository.updateWine(wine.id, update)

    this.logger.result({
      timestamp: new Date().toISOString(),
      wineId: wine.id,
      wineName: wine.wine_name,
      producer: wine.producer,
      vivinoUrl,
      confidence: match.confidence,
      status: match.status,
      message: match.reviewRequired
        ? `Low-confidence match flagged for review (source: ${source})`
        : `Wine enriched successfully (source: ${source})`,
    })

    if (match.reviewRequired) {
      this.logger.warn('match needs manual review', {
        wineId: wine.id,
        wineName: wine.wine_name,
        vivinoUrl,
        dataSource: source,
        confidence: match.confidence,
        producerMismatch: match.producerMismatch,
        wineNameLowSimilarity: match.wineNameLowSimilarity,
        scrapedWineName: scraped.wineName,
        scrapedProducer: scraped.producer,
      })
    }

    return match.status
  }
}
