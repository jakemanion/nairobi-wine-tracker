import axios from 'axios'
import * as cheerio from 'cheerio'
import type { EnrichmentConfig } from '../config'
import {
  detectBlockIndicators,
  diagnoseAxiosError,
  diagnoseHttpResponse,
  diagnoseVivinoParseFailure,
  EnrichmentFailureError,
} from '../utils/failureDiagnostics'
import { withRetry } from '../utils/retry'

export type VivinoScrapedData = {
  url: string
  wineName: string | null
  producer: string | null
  rating: number | null
  reviewCount: number | null
  country: string | null
  region: string | null
  grapeVarieties: string | null
}

function hasUsefulScrapedData(data: VivinoScrapedData): boolean {
  return (
    data.rating != null ||
    data.reviewCount != null ||
    Boolean(data.wineName) ||
    Boolean(data.producer)
  )
}

export type VivinoFetchMeta = {
  httpStatus: number
  htmlLength: number
  blockIndicators: string[]
  serverHeader: string | null
}

export type VivinoScrapeOutcome = {
  data: VivinoScrapedData
  meta: VivinoFetchMeta
}

function parseNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const text = String(value).replace(/,/g, '').trim()
  const match = text.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null

  const parsed = Number.parseFloat(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value: unknown): number | null {
  const parsed = parseNumber(value)
  return parsed == null ? null : Math.round(parsed)
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

function extractFromJsonLd($: cheerio.CheerioAPI): Partial<VivinoScrapedData> {
  const result: Partial<VivinoScrapedData> = {}

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim()
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as unknown
      const nodes = Array.isArray(parsed) ? parsed : [parsed]

      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        const record = node as Record<string, unknown>

        if (!result.wineName && typeof record.name === 'string') {
          result.wineName = record.name
        }

        const brand = record.brand
        if (!result.producer && brand && typeof brand === 'object') {
          const brandName = (brand as Record<string, unknown>).name
          if (typeof brandName === 'string') result.producer = brandName
        }

        const aggregateRating = record.aggregateRating
        if (aggregateRating && typeof aggregateRating === 'object') {
          const ratingValue = (aggregateRating as Record<string, unknown>).ratingValue
          const reviewCount = (aggregateRating as Record<string, unknown>).reviewCount
          if (result.rating == null) result.rating = parseNumber(ratingValue)
          if (result.reviewCount == null) result.reviewCount = parseInteger(reviewCount)
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  })

  return result
}

function extractFromMeta($: cheerio.CheerioAPI): Partial<VivinoScrapedData> {
  const result: Partial<VivinoScrapedData> = {}

  result.wineName = firstNonEmpty(
    $('meta[property="og:title"]').attr('content'),
    $('meta[name="twitter:title"]').attr('content'),
    $('title').text(),
  )

  const description = firstNonEmpty(
    $('meta[property="og:description"]').attr('content'),
    $('meta[name="description"]').attr('content'),
  )

  if (description) {
    const ratingMatch = description.match(/(\d(?:\.\d)?)\s*(?:average|avg)?\s*rating/i)
    const reviewsMatch = description.match(/(\d[\d,]*)\s+ratings?/i)
    if (ratingMatch) result.rating = parseNumber(ratingMatch[1])
    if (reviewsMatch) result.reviewCount = parseInteger(reviewsMatch[1])
  }

  return result
}

function extractFromSelectors($: cheerio.CheerioAPI): Partial<VivinoScrapedData> {
  const result: Partial<VivinoScrapedData> = {}

  const ratingSelectors = [
    '[data-testid="wine-rating"]',
    '[class*="wineRating"]',
    '[class*="average__rating"]',
    '[class*="vivinoRating"]',
    '.rating',
  ]

  for (const selector of ratingSelectors) {
    const text = $(selector).first().text()
    const rating = parseNumber(text)
    if (rating != null && rating <= 5) {
      result.rating = rating
      break
    }
  }

  const reviewSelectors = [
    '[data-testid="wine-review-count"]',
    '[class*="reviewCount"]',
    '[class*="ratingsCount"]',
    '[class*="count"]',
  ]

  for (const selector of reviewSelectors) {
    const text = $(selector).first().text()
    const count = parseInteger(text)
    if (count != null && count > 0) {
      result.reviewCount = count
      break
    }
  }

  const factLabels = ['Country', 'Region', 'Grapes', 'Grape varieties', 'Grape Varieties']
  $('dt, th, .wineFacts__factsLabels, .wineFacts__factLabel, [class*="factLabel"]').each(
    (_, element) => {
      const label = $(element).text().replace(/\s+/g, ' ').trim()
      if (!label) return

      const value = firstNonEmpty(
        $(element).next('dd').text(),
        $(element).next('td').text(),
        $(element).parent().find('dd').first().text(),
        $(element).parent().find('[class*="factValue"]').first().text(),
      )

      if (!value) return

      if (!result.country && /^country$/i.test(label)) result.country = value
      if (!result.region && /^region$/i.test(label)) result.region = value
      if (!result.grapeVarieties && /grape/i.test(label)) result.grapeVarieties = value
    },
  )

  if (!result.grapeVarieties) {
    const grapeLinkText = $('[href*="/grapes/"]').map((_, el) => $(el).text().trim()).get()
    if (grapeLinkText.length) {
      result.grapeVarieties = [...new Set(grapeLinkText.filter(Boolean))].join(', ')
    }
  }

  return result
}

function extractFromEmbeddedJson(html: string): Partial<VivinoScrapedData> {
  const result: Partial<VivinoScrapedData> = {}
  const patterns = [
    /"rating":\s*{\s*"average":\s*([0-9.]+)/i,
    /"average_rating":\s*([0-9.]+)/i,
    /"reviews_count":\s*(\d+)/i,
    /"ratings_count":\s*(\d+)/i,
    /"name":\s*"([^"]+)"/i,
    /"winery":\s*{\s*"name":\s*"([^"]+)"/i,
    /"country":\s*{\s*"name":\s*"([^"]+)"/i,
    /"region":\s*{\s*"name":\s*"([^"]+)"/i,
  ]

  const ratingMatch = html.match(patterns[0]) ?? html.match(patterns[1])
  if (ratingMatch) result.rating = parseNumber(ratingMatch[1])

  const reviewMatch = html.match(patterns[2]) ?? html.match(patterns[3])
  if (reviewMatch) result.reviewCount = parseInteger(reviewMatch[1])

  if (!result.wineName) {
    const nameMatch = html.match(patterns[4])
    if (nameMatch) result.wineName = nameMatch[1]
  }

  if (!result.producer) {
    const producerMatch = html.match(patterns[5])
    if (producerMatch) result.producer = producerMatch[1]
  }

  if (!result.country) {
    const countryMatch = html.match(patterns[6])
    if (countryMatch) result.country = countryMatch[1]
  }

  if (!result.region) {
    const regionMatch = html.match(patterns[7])
    if (regionMatch) result.region = regionMatch[1]
  }

  return result
}

function mergeScraped(
  url: string,
  parts: Array<Partial<VivinoScrapedData>>,
): VivinoScrapedData {
  const merged: VivinoScrapedData = {
    url,
    wineName: null,
    producer: null,
    rating: null,
    reviewCount: null,
    country: null,
    region: null,
    grapeVarieties: null,
  }

  for (const part of parts) {
    merged.wineName ??= part.wineName ?? null
    merged.producer ??= part.producer ?? null
    merged.rating ??= part.rating ?? null
    merged.reviewCount ??= part.reviewCount ?? null
    merged.country ??= part.country ?? null
    merged.region ??= part.region ?? null
    merged.grapeVarieties ??= part.grapeVarieties ?? null
  }

  return merged
}

export class VivinoScraperService {
  constructor(private readonly config: EnrichmentConfig) {}

  async scrape(url: string): Promise<VivinoScrapeOutcome> {
    let html = ''
    let httpStatus = 0
    let headers: Record<string, unknown> = {}

    try {
      const response = await withRetry(
        async () => {
          const result = await axios.get(url, {
            timeout: this.config.vivinoFetchTimeoutMs,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            validateStatus: (status) => status >= 200 && status < 600,
          })

          if (result.status >= 400) {
            throw new EnrichmentFailureError(diagnoseHttpResponse('vivino_fetch', result, url))
          }

          return result
        },
        {
          maxRetries: this.config.maxRetries,
          label: 'Vivino page fetch',
        },
      )

      html = String(response.data ?? '')
      httpStatus = response.status
      headers = response.headers as Record<string, unknown>
    } catch (error) {
      if (error instanceof EnrichmentFailureError) throw error
      throw new EnrichmentFailureError(diagnoseAxiosError('vivino_fetch', error, url))
    }

    const blockIndicators = detectBlockIndicators(html, headers)
    const meta: VivinoFetchMeta = {
      httpStatus,
      htmlLength: html.length,
      blockIndicators,
      serverHeader:
        typeof headers.server === 'string'
          ? headers.server
          : typeof headers['x-powered-by'] === 'string'
            ? headers['x-powered-by']
            : null,
    }

    if (blockIndicators.length) {
      throw new EnrichmentFailureError({
        stage: 'vivino_fetch',
        category: 'blocked',
        reason: `Vivino response looks blocked (${blockIndicators.join(', ')})`,
        blocked: true,
        blockIndicators,
        httpStatus,
        vivinoUrl: url,
        detail: meta.serverHeader ? `server: ${meta.serverHeader}` : undefined,
      })
    }

    const $ = cheerio.load(html)
    const data = mergeScraped(url, [
      extractFromJsonLd($),
      extractFromMeta($),
      extractFromSelectors($),
      extractFromEmbeddedJson(html),
    ])

    if (!hasUsefulScrapedData(data)) {
      throw new EnrichmentFailureError(diagnoseVivinoParseFailure(url, html, headers))
    }

    return { data, meta }
  }
}
