import { firstListingImageUrl } from '@/components/listing-thumbnail'
import type { WineRow } from '@/components/wine-table'
import { minWinePriceKES } from '@/lib/calculate-value-score'
import { formatGrapeVarieties } from '@/lib/grape-varieties'

export type WineColour = 'Red' | 'White' | 'Rosé' | 'Sparkling'

export type PreviewWineCardData = {
  id: string
  producer: string
  name: string
  country: string
  region: string
  colour: WineColour
  grapes: string[]
  vivinoRating: number | null
  vivinoUrl: string | null
  prices: Array<{ shop: string; price: number }>
  image: string | null
}

const colourRibbonBg: Record<WineColour, string> = {
  Red: '#8F1A2B',
  White: '#7A5A18',
  Rosé: '#8A3828',
  Sparkling: '#1E4A6A',
}

const colourLabel: Record<WineColour, string> = {
  Red: 'RED',
  White: 'WHITE',
  Rosé: 'ROSÉ',
  Sparkling: 'SPAR',
}

export function colourRibbonStyle(colour: WineColour) {
  return { background: colourRibbonBg[colour], label: colourLabel[colour] }
}

function parseColour(style: string | null | undefined): WineColour {
  const s = (style ?? '').toLowerCase()
  if (s.includes('white')) return 'White'
  if (s.includes('ros')) return 'Rosé'
  if (s.includes('spark') || s.includes('champagne') || s.includes('prosecco') || s.includes('cava')) {
    return 'Sparkling'
  }
  return 'Red'
}

function ratingNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function parseGrapes(value: unknown): string[] {
  const formatted = formatGrapeVarieties(value)
  if (!formatted) return []
  return formatted.split(',').map((g) => g.trim()).filter(Boolean)
}

function parseListingPrice(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

export function toPreviewWineCard(wine: WineRow): PreviewWineCardData {
  const prices = (wine.store_listings ?? [])
    .map((listing) => {
      const price = parseListingPrice(listing.current_price_ksh)
      const shop = listing.stores?.name?.trim()
      if (price == null || !shop) return null
      return { shop, price }
    })
    .filter((row): row is { shop: string; price: number } => row != null)

  return {
    id: String(wine.id),
    producer: wine.producer?.trim() || 'Unknown producer',
    name: wine.wine_name?.trim() || 'Unnamed wine',
    country: wine.country?.trim() || '—',
    region: wine.region?.trim() || '—',
    colour: parseColour(wine.style),
    grapes: parseGrapes(wine.grape_varieties),
    vivinoRating: ratingNum(wine.vivino_rating),
    vivinoUrl: wine.vivino_url?.trim() || null,
    prices,
    image: firstListingImageUrl(wine.store_listings ?? []) || null,
  }
}

export function countWinesByColour(wines: PreviewWineCardData[]) {
  return {
    Red: wines.filter((w) => w.colour === 'Red').length,
    White: wines.filter((w) => w.colour === 'White').length,
    Rosé: wines.filter((w) => w.colour === 'Rosé').length,
    Sparkling: wines.filter((w) => w.colour === 'Sparkling').length,
  }
}

export function lowestPrice(prices: PreviewWineCardData['prices']): number | null {
  if (!prices.length) return null
  return minWinePriceKES(
    prices.map((p) => ({ current_price_ksh: p.price })),
  )
}
