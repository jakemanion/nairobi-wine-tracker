import type { WineEnrichmentRecord } from '../db/wineRepository'
import {
  producerMatches,
  similarityPercent,
} from '../utils/stringSimilarity'
import type { VivinoScrapedData } from './vivinoScraper'

export type MatchResult = {
  confidence: number
  producerScore: number
  wineNameScore: number
  vintageScore: number
  countryScore: number
  producerMismatch: boolean
  wineNameLowSimilarity: boolean
  reviewRequired: boolean
  status: 'matched' | 'review_required'
}

function normalizeVintage(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null
  const text = String(value).trim()
  const match = text.match(/\b(19|20)\d{2}\b/)
  return match ? match[0] : text
}

function vintageMatches(
  canonicalVintage: string | number | null | undefined,
  scrapedText: string | null | undefined,
): boolean {
  const canonical = normalizeVintage(canonicalVintage)
  if (!canonical) return true

  const scrapedVintage = normalizeVintage(scrapedText ?? null)
  if (!scrapedVintage) return false

  return canonical === scrapedVintage
}

function countryMatches(
  canonicalCountry: string | null | undefined,
  scrapedCountry: string | null | undefined,
): boolean {
  const left = (canonicalCountry ?? '').trim().toLowerCase()
  const right = (scrapedCountry ?? '').trim().toLowerCase()
  if (!left || !right) return true
  return left === right || left.includes(right) || right.includes(left)
}

export function scoreWineMatch(
  wine: WineEnrichmentRecord,
  scraped: VivinoScrapedData,
  threshold: number,
): MatchResult {
  const producerMatched = producerMatches(wine.producer, scraped.producer)
  const producerScore = producerMatched ? 40 : 0

  const wineNameScoreRaw = similarityPercent(wine.wine_name, scraped.wineName)
  const wineNameScore = Math.round((wineNameScoreRaw / 100) * 40)
  const wineNameLowSimilarity = wineNameScoreRaw < 60

  const vintageScore = vintageMatches(wine.vintage, scraped.wineName) ? 10 : 0
  const countryScore = countryMatches(wine.country, scraped.country) ? 10 : 0

  let confidence = producerScore + wineNameScore + vintageScore + countryScore
  const producerMismatch = !producerMatched

  if (producerMismatch) {
    confidence = Math.min(confidence, 60)
  }

  const reviewRequired = confidence < threshold || wineNameLowSimilarity
  const status = reviewRequired ? 'review_required' : 'matched'

  return {
    confidence,
    producerScore,
    wineNameScore,
    vintageScore,
    countryScore,
    producerMismatch,
    wineNameLowSimilarity,
    reviewRequired,
    status,
  }
}
