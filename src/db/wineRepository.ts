import type { SupabaseClient } from '@supabase/supabase-js'

export type VivinoEnrichmentStatus =
  | 'matched'
  | 'review_required'
  | 'failed'
  | 'complete'
  | 'pending'

export type WineEnrichmentRecord = {
  id: string
  wine_name: string | null
  producer: string | null
  country: string | null
  region: string | null
  grape_varieties: unknown
  vintage: string | number | null
  vivino_url: string | null
  vivino_rating: string | number | null
  vivino_review_count: number | null
  vivino_match_confidence: number | null
  vivino_last_checked: string | null
  vivino_enrichment_status: VivinoEnrichmentStatus | null
}

export type WineEnrichmentUpdate = {
  vivino_url?: string | null
  vivino_rating?: string | number | null
  vivino_review_count?: number | null
  country?: string | null
  region?: string | null
  grape_varieties?: string | null
  vivino_match_confidence?: number | null
  vivino_last_checked?: string
  vivino_enrichment_status?: VivinoEnrichmentStatus
}

const wineSelect = `
  id,
  wine_name,
  producer,
  country,
  region,
  grape_varieties,
  vintage,
  vivino_url,
  vivino_rating,
  vivino_review_count,
  vivino_match_confidence,
  vivino_last_checked,
  vivino_enrichment_status
`

const SKIP_STATUSES: VivinoEnrichmentStatus[] = ['matched', 'complete', 'review_required']

export type PendingQueryOptions = {
  force: boolean
  onlyFullyMissing: boolean
}

function isWinePending(
  wine: WineEnrichmentRecord,
  { force, onlyFullyMissing }: PendingQueryOptions,
): boolean {
  if (onlyFullyMissing && (wine.vivino_url != null || wine.vivino_rating != null)) {
    return false
  }

  const missingVivinoData = wine.vivino_url == null || wine.vivino_rating == null
  if (!missingVivinoData) return false
  if (force) return true

  if (wine.vivino_enrichment_status === 'failed') return true
  if (wine.vivino_enrichment_status && SKIP_STATUSES.includes(wine.vivino_enrichment_status)) {
    return false
  }

  return wine.vivino_last_checked == null || wine.vivino_enrichment_status == null
}

function applyPendingQuery<T extends { is: Function; or: Function }>(
  query: T,
  onlyFullyMissing: boolean,
): T {
  if (onlyFullyMissing) {
    return query.is('vivino_url', null).is('vivino_rating', null) as T
  }

  return query.or('vivino_url.is.null,vivino_rating.is.null') as T
}

export class WineRepository {
  constructor(private readonly client: SupabaseClient) {}

  async fetchPendingBatch(
    limit: number,
    options: PendingQueryOptions,
  ): Promise<WineEnrichmentRecord[]> {
    const fetchLimit = Math.max(limit * 4, limit)
    let query = this.client.from('wines').select(wineSelect)
    query = applyPendingQuery(query, options.onlyFullyMissing)

    const { data, error } = await query
      .order('vivino_last_checked', { ascending: true, nullsFirst: true })
      .order('producer', { ascending: true })
      .order('wine_name', { ascending: true })
      .limit(fetchLimit)

    if (error) {
      throw new Error(`Failed to fetch pending wines: ${error.message}`)
    }

    const rows = (data ?? []) as WineEnrichmentRecord[]
    return rows.filter((wine) => isWinePending(wine, options)).slice(0, limit)
  }

  async countPending(options: PendingQueryOptions): Promise<number> {
    let query = this.client.from('wines').select(wineSelect)
    query = applyPendingQuery(query, options.onlyFullyMissing)

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to count pending wines: ${error.message}`)
    }

    const rows = (data ?? []) as WineEnrichmentRecord[]
    return rows.filter((wine) => isWinePending(wine, options)).length
  }

  async updateWine(wineId: string, update: WineEnrichmentUpdate): Promise<void> {
    const { error } = await this.client.from('wines').update(update).eq('id', wineId)

    if (error) {
      throw new Error(`Failed to update wine ${wineId}: ${error.message}`)
    }
  }

  buildPartialUpdate(
    wine: WineEnrichmentRecord,
    scraped: {
      url?: string | null
      rating?: number | null
      reviewCount?: number | null
      country?: string | null
      region?: string | null
      grapeVarieties?: string | null
    },
    confidence: number,
    status: VivinoEnrichmentStatus,
  ): WineEnrichmentUpdate {
    const update: WineEnrichmentUpdate = {
      vivino_last_checked: new Date().toISOString(),
      vivino_match_confidence: confidence,
      vivino_enrichment_status: status,
    }

    if (wine.vivino_url == null && scraped.url) {
      update.vivino_url = scraped.url
    }
    if (wine.vivino_rating == null && scraped.rating != null) {
      update.vivino_rating = scraped.rating
    }
    if (wine.vivino_review_count == null && scraped.reviewCount != null) {
      update.vivino_review_count = scraped.reviewCount
    }
    if (wine.country == null && scraped.country) {
      update.country = scraped.country
    }
    if (wine.region == null && scraped.region) {
      update.region = scraped.region
    }
    if (wine.grape_varieties == null && scraped.grapeVarieties) {
      update.grape_varieties = scraped.grapeVarieties
    }

    return update
  }

  buildFailureUpdate(confidence = 0): WineEnrichmentUpdate {
    return {
      vivino_last_checked: new Date().toISOString(),
      vivino_match_confidence: confidence,
      vivino_enrichment_status: 'failed',
    }
  }
}
