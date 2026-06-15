import axios from 'axios'
import type { EnrichmentConfig } from '../config'
import { randomDelay } from '../utils/delay'
import {
  diagnoseAxiosError,
  diagnoseSerpNoResults,
  type SerpAttemptDiagnostic,
} from '../utils/failureDiagnostics'
import { withRetry } from '../utils/retry'
import { buildSearchQueries } from '../utils/searchQuery'

export type SerpApiResult = {
  url: string
  title: string
  snippet: string
  query: string
}

export type SerpDiscoveryOutcome = {
  result: SerpApiResult | null
  attempts: SerpAttemptDiagnostic[]
}

const EXCLUDED_VIVINO_PATHS = [
  /\/users?\//i,
  /\/explore\//i,
  /\/news\//i,
  /\/wineries?\//i,
  /\/merchants?\//i,
  /\/toplists?\//i,
  /\/awards?\//i,
  /\/purchase/i,
  /\/checkout/i,
]

function isVivinoHost(hostname: string): boolean {
  return hostname === 'vivino.com' || hostname.endsWith('.vivino.com')
}

function isVivinoWinePath(pathname: string): boolean {
  if (EXCLUDED_VIVINO_PATHS.some((pattern) => pattern.test(pathname))) return false
  if (/\/w\/\d+/i.test(pathname)) return true
  if (/\/wines\/\d+/i.test(pathname)) return true
  return false
}

function normalizeVivinoUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    if (!isVivinoHost(url.hostname)) return null
    if (!isVivinoWinePath(url.pathname)) return null

    url.hash = ''
    url.search = ''
    return url.toString()
  } catch {
    return null
  }
}

function scoreSerpResult(
  result: SerpApiResult,
  wine: {
    producer?: string | null
    wine_name?: string | null
  },
): number {
  const haystack = `${result.title} ${result.snippet} ${result.url}`.toLowerCase()
  const producer = (wine.producer ?? '').toLowerCase()
  const wineName = (wine.wine_name ?? '').toLowerCase()
  let score = 0

  if (/\/w\/\d+/i.test(result.url)) score += 60
  else if (/\/wines\/\d+/i.test(result.url)) score += 50

  if (producer && haystack.includes(producer)) score += 20
  if (wineName) {
    const shortName = wineName.replace(/\bwine\b/g, '').trim()
    if (shortName && haystack.includes(shortName)) score += 20
  }

  if (haystack.includes('vivino')) score += 5
  if (haystack.includes('rating')) score += 3

  return score
}

function isNonRetryableSerpError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("hasn't returned any results") ||
    lower.includes('has not returned any results') ||
    lower.includes('no results') ||
    lower.includes('invalid api key')
  )
}

type SerpApiResponse = {
  organic_results?: Array<{
    link?: string
    title?: string
    snippet?: string
  }>
  error?: string
}

type SerpSearchAttempt = {
  response: SerpApiResponse
  error?: string
}

export class SerpApiService {
  constructor(private readonly config: EnrichmentConfig) {}

  async findVivinoUrl(wine: {
    producer?: string | null
    wine_name?: string | null
    vintage?: string | number | null
  }): Promise<SerpDiscoveryOutcome> {
    const queries = buildSearchQueries({
      producer: wine.producer,
      wineName: wine.wine_name,
      vintage: wine.vintage,
    })

    if (!queries.length) {
      throw new Error('Cannot build SerpAPI query without producer or wine name')
    }

    const candidates: SerpApiResult[] = []
    const attempts: SerpAttemptDiagnostic[] = []

    for (let index = 0; index < queries.length; index += 1) {
      const query = queries[index]
      const attempt = await this.search(query)
      const organic = Array.isArray(attempt.response.organic_results)
        ? attempt.response.organic_results
        : []

      let vivinoCandidateCount = 0
      for (const item of organic) {
        const link = typeof item?.link === 'string' ? item.link : null
        if (!link) continue

        const normalized = normalizeVivinoUrl(link)
        if (!normalized) continue

        vivinoCandidateCount += 1
        candidates.push({
          url: normalized,
          title: typeof item?.title === 'string' ? item.title : '',
          snippet: typeof item?.snippet === 'string' ? item.snippet : '',
          query,
        })
      }

      attempts.push({
        query,
        organicCount: organic.length,
        vivinoCandidateCount,
        error: attempt.error ?? attempt.response.error,
      })

      if (candidates.length) break

      if (index < queries.length - 1) {
        await randomDelay(this.config.requestDelayMinMs, this.config.requestDelayMaxMs)
      }
    }

    if (!candidates.length) {
      return { result: null, attempts }
    }

    candidates.sort((a, b) => scoreSerpResult(b, wine) - scoreSerpResult(a, wine))
    return { result: candidates[0] ?? null, attempts }
  }

  describeNoResult(outcome: SerpDiscoveryOutcome) {
    return diagnoseSerpNoResults(outcome.attempts)
  }

  private async search(query: string): Promise<SerpSearchAttempt> {
    try {
      const response = await withRetry(
        async () => {
          const { data } = await axios.get<SerpApiResponse>('https://serpapi.com/search.json', {
            params: {
              engine: 'google',
              q: query,
              api_key: this.config.serpApiKey,
              num: 10,
            },
            timeout: this.config.serpApiTimeoutMs,
            validateStatus: (status) => status >= 200 && status < 500,
          })

          if (data?.error) {
            const message = String(data.error)
            if (isNonRetryableSerpError(message)) {
              return { organic_results: [], error: message }
            }
            throw new Error(message)
          }

          return data ?? { organic_results: [] }
        },
        {
          maxRetries: this.config.maxRetries,
          label: 'SerpAPI search',
        },
      )

      return { response }
    } catch (error) {
      const diagnostic = diagnoseAxiosError('serpapi_search', error)
      return {
        response: { organic_results: [] },
        error: diagnostic.reason,
      }
    }
  }
}

export { normalizeVivinoUrl, isVivinoWinePath }
