import axios, { type AxiosError, type AxiosResponse } from 'axios'

export type FailureStage =
  | 'serpapi_search'
  | 'vivino_fetch'
  | 'vivino_parse'
  | 'matching'
  | 'database'
  | 'unknown'

export type FailureCategory =
  | 'no_results'
  | 'blocked'
  | 'rate_limited'
  | 'http_error'
  | 'timeout'
  | 'parse_error'
  | 'network'
  | 'low_confidence'
  | 'unknown'

export type FailureDiagnostic = {
  stage: FailureStage
  category: FailureCategory
  reason: string
  httpStatus?: number
  blocked?: boolean
  blockIndicators?: string[]
  queriesTried?: string[]
  serpAttempts?: SerpAttemptDiagnostic[]
  vivinoUrl?: string
  responseSnippet?: string
  errorCode?: string
  detail?: string
}

export type SerpAttemptDiagnostic = {
  query: string
  organicCount: number
  vivinoCandidateCount: number
  error?: string
}

const BLOCK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /cloudflare/i, label: 'cloudflare' },
  { pattern: /cf-browser-verification/i, label: 'cf-browser-verification' },
  { pattern: /captcha/i, label: 'captcha' },
  { pattern: /access denied/i, label: 'access denied' },
  { pattern: /please enable javascript/i, label: 'javascript required' },
  { pattern: /bot detection/i, label: 'bot detection' },
  { pattern: /automated traffic/i, label: 'automated traffic' },
  { pattern: /ray id/i, label: 'cloudflare ray id' },
  { pattern: /blocked/i, label: 'blocked' },
  { pattern: /forbidden/i, label: 'forbidden' },
]

export function snippet(text: string, max = 240): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= max) return compact
  return `${compact.slice(0, max)}…`
}

export function detectBlockIndicators(
  html: string,
  headers: Record<string, unknown> = {},
): string[] {
  const indicators: string[] = []
  const headerText = JSON.stringify(headers).toLowerCase()

  if (headerText.includes('cloudflare') || headerText.includes('cf-ray')) {
    indicators.push('cloudflare headers')
  }

  for (const { pattern, label } of BLOCK_PATTERNS) {
    if (pattern.test(html)) indicators.push(label)
  }

  return [...new Set(indicators)]
}

export function diagnoseHttpResponse(
  stage: FailureStage,
  response: Pick<AxiosResponse, 'status' | 'data' | 'headers'>,
  url?: string,
): FailureDiagnostic {
  const html = String(response.data ?? '')
  const blockIndicators = detectBlockIndicators(html, response.headers as Record<string, unknown>)
  const blocked = blockIndicators.length > 0 || response.status === 403 || response.status === 429

  let category: FailureCategory = 'http_error'
  let reason = `HTTP ${response.status} from ${stage === 'vivino_fetch' ? 'Vivino' : 'remote server'}`

  if (response.status === 429) {
    category = 'rate_limited'
    reason = 'Rate limited (HTTP 429) — too many requests'
  } else if (response.status === 403 && blockIndicators.length) {
    category = 'blocked'
    reason = `Likely blocked by Vivino/WAF (HTTP 403: ${blockIndicators.join(', ')})`
  } else if (response.status === 403) {
    category = 'blocked'
    reason = 'Forbidden (HTTP 403) — Vivino may be blocking automated access'
  } else if (blocked) {
    category = 'blocked'
    reason = `Possible bot block detected (${blockIndicators.join(', ')})`
  }

  return {
    stage,
    category,
    reason,
    httpStatus: response.status,
    blocked,
    blockIndicators: blockIndicators.length ? blockIndicators : undefined,
    vivinoUrl: url,
    responseSnippet: html ? snippet(html) : undefined,
  }
}

export function diagnoseAxiosError(stage: FailureStage, error: unknown, url?: string): FailureDiagnostic {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError

    if (axiosError.response) {
      const diagnostic = diagnoseHttpResponse(stage, axiosError.response, url)
      diagnostic.errorCode = axiosError.code
      diagnostic.detail = axiosError.message
      return diagnostic
    }

    const code = axiosError.code ?? 'UNKNOWN'
    const isTimeout = code === 'ECONNABORTED' || code === 'ETIMEDOUT'

    return {
      stage,
      category: isTimeout ? 'timeout' : 'network',
      reason: isTimeout
        ? `Request timed out (${stage === 'vivino_fetch' ? 'Vivino' : 'SerpAPI'})`
        : `Network error: ${axiosError.message}`,
      errorCode: code,
      vivinoUrl: url,
      detail: axiosError.message,
    }
  }

  const message = error instanceof Error ? error.message : String(error)
  return {
    stage,
    category: 'unknown',
    reason: message,
    vivinoUrl: url,
    detail: message,
  }
}

export function diagnoseSerpNoResults(attempts: SerpAttemptDiagnostic[]): FailureDiagnostic {
  const queriesTried = attempts.map((attempt) => attempt.query)
  const errors = attempts.map((attempt) => attempt.error).filter(Boolean)

  if (errors.some((error) => /invalid api key/i.test(error ?? ''))) {
    return {
      stage: 'serpapi_search',
      category: 'unknown',
      reason: 'SerpAPI rejected the API key',
      queriesTried,
      serpAttempts: attempts,
      detail: errors.join(' | '),
    }
  }

  const totalOrganic = attempts.reduce((sum, attempt) => sum + attempt.organicCount, 0)
  const totalCandidates = attempts.reduce((sum, attempt) => sum + attempt.vivinoCandidateCount, 0)

  if (totalOrganic > 0 && totalCandidates === 0) {
    return {
      stage: 'serpapi_search',
      category: 'no_results',
      reason: 'Google returned results but none were valid Vivino wine pages (/w/ or /wines/)',
      queriesTried,
      serpAttempts: attempts,
    }
  }

  return {
    stage: 'serpapi_search',
    category: 'no_results',
    reason: 'No Vivino URL found — Google returned no matching results for any search query',
    queriesTried,
    serpAttempts: attempts,
    detail: errors.length ? errors.join(' | ') : undefined,
  }
}

export function diagnoseVivinoParseFailure(
  url: string,
  html: string,
  headers: Record<string, unknown> = {},
): FailureDiagnostic {
  const blockIndicators = detectBlockIndicators(html, headers)
  if (blockIndicators.length) {
    return {
      stage: 'vivino_parse',
      category: 'blocked',
      reason: `Vivino page looks blocked or incomplete (${blockIndicators.join(', ')})`,
      blocked: true,
      blockIndicators,
      vivinoUrl: url,
      responseSnippet: snippet(html),
    }
  }

  if (html.length < 500) {
    return {
      stage: 'vivino_parse',
      category: 'parse_error',
      reason: 'Vivino response was too small to parse — page may be empty or blocked',
      vivinoUrl: url,
      responseSnippet: snippet(html),
    }
  }

  return {
    stage: 'vivino_parse',
    category: 'parse_error',
    reason: 'Vivino page loaded but rating/review data could not be extracted',
    vivinoUrl: url,
    responseSnippet: snippet(html),
  }
}

export class EnrichmentFailureError extends Error {
  readonly diagnostic: FailureDiagnostic

  constructor(diagnostic: FailureDiagnostic) {
    super(diagnostic.reason)
    this.name = 'EnrichmentFailureError'
    this.diagnostic = diagnostic
  }
}
