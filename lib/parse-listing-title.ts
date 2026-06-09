import type { WineRecord } from '@/lib/wines'

export type ParsedListingWine = Partial<Omit<WineRecord, 'id'>>

const VINTAGE_RE = /\b(19\d{2}|20\d{2})\b/

const STYLE_KEYWORDS: Array<{ pattern: RegExp; style: string }> = [
  { pattern: /\bsparkling\b/i, style: 'Sparkling' },
  { pattern: /\bchampagne\b/i, style: 'Sparkling' },
  { pattern: /\bprosecco\b/i, style: 'Sparkling' },
  { pattern: /\bcava\b/i, style: 'Sparkling' },
  { pattern: /\bros[eé]\b/i, style: 'Rosé' },
  { pattern: /\bdessert\b/i, style: 'Dessert' },
  { pattern: /\bfortified\b/i, style: 'Fortified' },
  { pattern: /\bport\b/i, style: 'Fortified' },
  { pattern: /\bsweet\s+white\b/i, style: 'Sweet white' },
  { pattern: /\bred\s+wine\b/i, style: 'Red' },
  { pattern: /\bwhite\s+wine\b/i, style: 'White' },
]

const RED_GRAPES = new Set([
  'cabernet sauvignon',
  'merlot',
  'pinot noir',
  'shiraz',
  'syrah',
  'malbec',
  'tempranillo',
  'grenache',
  'zinfandel',
  'sangiovese',
  'nebbiolo',
  'barbera',
  'gamay',
  'mourvedre',
  'mourvèdre',
  'carmenere',
  'carmenère',
  'petit verdot',
  'pinotage',
])

const WHITE_GRAPES = new Set([
  'sauvignon blanc',
  'chardonnay',
  'riesling',
  'pinot grigio',
  'pinot gris',
  'chenin blanc',
  'gewurztraminer',
  'gewürztraminer',
  'viognier',
  'semillon',
  'muscat',
  'albarino',
  'albariño',
  'gruner veltliner',
  'grüner veltliner',
])

const GRAPE_NAMES = [
  'Cabernet Sauvignon',
  'Sauvignon Blanc',
  'Pinot Grigio',
  'Pinot Gris',
  'Pinot Noir',
  'Chenin Blanc',
  'Gewürztraminer',
  'Gewurztraminer',
  'Grüner Veltliner',
  'Gruner Veltliner',
  'Petit Verdot',
  'Mourvèdre',
  'Mourvedre',
  'Carmenère',
  'Carmenere',
  'Albariño',
  'Albarino',
  'Chardonnay',
  'Merlot',
  'Shiraz',
  'Syrah',
  'Malbec',
  'Riesling',
  'Tempranillo',
  'Grenache',
  'Viognier',
  'Semillon',
  'Muscat',
  'Zinfandel',
  'Sangiovese',
  'Nebbiolo',
  'Barbera',
  'Gamay',
  'Pinotage',
]

const COUNTRIES: Array<{ pattern: RegExp; country: string }> = [
  { pattern: /\bsouth\s+africa\b/i, country: 'South Africa' },
  { pattern: /\bnew\s+zealand\b/i, country: 'New Zealand' },
  { pattern: /\bunited\s+states\b/i, country: 'USA' },
  { pattern: /\bfrance\b/i, country: 'France' },
  { pattern: /\bitaly\b/i, country: 'Italy' },
  { pattern: /\bspain\b/i, country: 'Spain' },
  { pattern: /\bchile\b/i, country: 'Chile' },
  { pattern: /\bargentina\b/i, country: 'Argentina' },
  { pattern: /\baustralia\b/i, country: 'Australia' },
  { pattern: /\bportugal\b/i, country: 'Portugal' },
  { pattern: /\bgermany\b/i, country: 'Germany' },
  { pattern: /\bkenya\b/i, country: 'Kenya' },
]

const NOISE_RE = [
  /\b\d+\s*x\s*\d+\b/gi,
  /\b\d+(\.\d+)?\s*(ml|cl|l|litre|liter|litres|liters)\b/gi,
  /\b\d+\s*pack\b/gi,
  /\bpack\s+of\s+\d+\b/gi,
  /\bbottle\b/gi,
  /\bbtl\b/gi,
  /\b750\b/gi,
]

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripNoise(value: string): string {
  let next = value
  for (const pattern of NOISE_RE) {
    next = next.replace(pattern, ' ')
  }
  return normalizeSpaces(next)
}

function extractVintage(title: string): { vintage: number | null; remainder: string } {
  const match = title.match(VINTAGE_RE)
  if (!match) return { vintage: null, remainder: title }
  return {
    vintage: Number(match[1]),
    remainder: normalizeSpaces(title.replace(match[0], ' ')),
  }
}

function extractStyle(title: string): { style: string | null; remainder: string } {
  for (const { pattern, style } of STYLE_KEYWORDS) {
    if (pattern.test(title)) {
      return { style, remainder: normalizeSpaces(title.replace(pattern, ' ')) }
    }
  }
  return { style: null, remainder: title }
}

function extractCountry(title: string): { country: string | null; remainder: string } {
  for (const { pattern, country } of COUNTRIES) {
    if (pattern.test(title)) {
      return { country, remainder: normalizeSpaces(title.replace(pattern, ' ')) }
    }
  }
  return { country: null, remainder: title }
}

function extractGrapes(title: string): { grapes: string[]; remainder: string } {
  let remainder = title
  const grapes: string[] = []

  const sorted = [...GRAPE_NAMES].sort((a, b) => b.length - a.length)
  for (const grape of sorted) {
    const pattern = new RegExp(`\\b${grape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (pattern.test(remainder)) {
      grapes.push(grape)
      remainder = normalizeSpaces(remainder.replace(pattern, ' '))
    }
  }

  return { grapes, remainder }
}

function inferStyleFromGrapes(grapes: string[]): string | null {
  if (!grapes.length) return null

  const lower = grapes.map((grape) => grape.toLowerCase())
  const hasRed = lower.some((grape) => RED_GRAPES.has(grape))
  const hasWhite = lower.some((grape) => WHITE_GRAPES.has(grape))

  if (hasRed && !hasWhite) return 'Red'
  if (hasWhite && !hasRed) return 'White'
  return null
}

function splitProducerAndName(remainder: string): { producer: string | null; wine_name: string | null } {
  const cleaned = normalizeSpaces(remainder)
  if (!cleaned) return { producer: null, wine_name: null }

  const dashParts = cleaned.split(/\s[-–|]\s/).map((part) => part.trim()).filter(Boolean)
  if (dashParts.length >= 2) {
    return {
      producer: dashParts[0] || null,
      wine_name: dashParts.slice(1).join(' - ') || null,
    }
  }

  const words = cleaned.split(' ')
  if (words.length <= 2) {
    return { producer: null, wine_name: cleaned }
  }

  const producerWordCount = words.length >= 4 ? 2 : 1
  return {
    producer: words.slice(0, producerWordCount).join(' '),
    wine_name: words.slice(producerWordCount).join(' ') || cleaned,
  }
}

export function parseListingTitle(rawTitle: string | null | undefined): ParsedListingWine {
  if (!rawTitle?.trim()) {
    return {}
  }

  let working = stripNoise(rawTitle.trim())

  const { vintage, remainder: afterVintage } = extractVintage(working)
  working = afterVintage

  const { country, remainder: afterCountry } = extractCountry(working)
  working = afterCountry

  const { grapes, remainder: afterGrapes } = extractGrapes(working)
  working = afterGrapes

  const { style: explicitStyle, remainder: afterStyle } = extractStyle(working)
  working = afterStyle

  const { producer, wine_name } = splitProducerAndName(working)
  const style = explicitStyle ?? inferStyleFromGrapes(grapes)

  return {
    producer,
    wine_name: wine_name ?? (producer ? null : rawTitle.trim()),
    vintage,
    country,
    region: null,
    grape_varieties: grapes.length ? grapes.join(', ') : null,
    style,
    vivino_url: null,
    vivino_rating: null,
  }
}
