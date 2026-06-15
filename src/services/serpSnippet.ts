import type { VivinoScrapedData } from './vivinoScraper'

export type SerpSnippetData = {
  wineName: string | null
  producer: string | null
  rating: number | null
  reviewCount: number | null
  country: string | null
  region: string | null
  grapeVarieties: null
}

function parseNumber(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value: string): number | null {
  const parsed = Number.parseInt(value.replace(/,/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|\-–—]\s*vivino.*$/i, '')
    .replace(/\s+on vivino$/i, '')
    .trim()
}

export function parseSerpVivinoSnippet(title: string, snippet: string): SerpSnippetData {
  const combined = `${title} ${snippet}`
  const result: SerpSnippetData = {
    wineName: cleanTitle(title) || null,
    producer: null,
    rating: null,
    reviewCount: null,
    country: null,
    region: null,
    grapeVarieties: null,
  }

  const ratingPatterns = [
    /(\d(?:\.\d)?)\s*(?:out of 5|\/5|★|stars?)/i,
    /rating[:\s]+(\d(?:\.\d)?)/i,
    /(\d(?:\.\d)?)\s*(?:average|avg)\s*rating/i,
    /(?:^|[·•|])\s*(\d(?:\.\d)?)\s*(?:[·•|]|$)/,
  ]

  for (const pattern of ratingPatterns) {
    const match = combined.match(pattern)
    if (match) {
      const rating = parseNumber(match[1])
      if (rating != null && rating >= 1 && rating <= 5) {
        result.rating = rating
        break
      }
    }
  }

  const reviewPatterns = [
    /([\d,]+)\s+ratings?\b/i,
    /([\d,]+)\s+reviews?\b/i,
  ]

  for (const pattern of reviewPatterns) {
    const match = combined.match(pattern)
    if (match) {
      result.reviewCount = parseInteger(match[1])
      if (result.reviewCount != null) break
    }
  }

  const countryMatch = snippet.match(/\bfrom\s+([A-Za-z][A-Za-z\s.'-]+?)(?:\s*[·•|,]|$)/i)
  if (countryMatch) {
    result.country = countryMatch[1].trim()
  }

  const regionMatch = snippet.match(/\b(?:from|in)\s+([A-Za-z][A-Za-z\s.'-]+?)(?:\s*[·•|,]|$)/i)
  if (regionMatch && !result.country) {
    result.region = regionMatch[1].trim()
  }

  return result
}

export function serpSnippetToScrapedData(
  url: string,
  title: string,
  snippet: string,
): VivinoScrapedData {
  const parsed = parseSerpVivinoSnippet(title, snippet)
  return {
    url,
    wineName: parsed.wineName,
    producer: parsed.producer,
    rating: parsed.rating,
    reviewCount: parsed.reviewCount,
    country: parsed.country,
    region: parsed.region,
    grapeVarieties: null,
  }
}

export function hasSnippetRating(data: SerpSnippetData): boolean {
  return data.rating != null
}
