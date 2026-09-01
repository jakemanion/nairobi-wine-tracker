import { firstListingImageUrl } from '@/components/listing-thumbnail'
import type { WineRow } from '@/components/wine-table'
import { minWinePriceKES } from '@/lib/calculate-value-score'
import { formatGrapeVarieties } from '@/lib/grape-varieties'

export type StyleRibbonVariant = 'red' | 'white' | 'rose' | 'sparkling' | 'default'

export type StyleRibbonStyle = {
  label: string
  background: string
  color: string
  variant: StyleRibbonVariant
}

export type PreviewWineCardData = {
  id: string
  producer: string
  name: string
  vintage: string | null
  country: string
  region: string
  style: string | null
  grapes: string[]
  vivinoRating: number | null
  vivinoUrl: string | null
  prices: Array<{ shop: string; price: number; url: string | null }>
  image: string | null
}

const RED_RIBBON = {
  background: '#8F1A2B',
  color: '#FFFFFF',
} as const

const PALE_YELLOW_RIBBON = {
  background: '#F5E6A8',
  color: '#000000',
} as const

const PALE_PINK_RIBBON = {
  background: '#F5D0D8',
  color: '#000000',
} as const

/** Case-insensitive style → ribbon colours. Edit here to adjust label styling. */
export function styleRibbonStyle(style: string | null | undefined): StyleRibbonStyle | null {
  const label = style?.trim()
  if (!label) return null

  const normalized = label.toLowerCase()

  if (normalized === 'red' || normalized === 'sweet red') {
    return { label, variant: 'red', ...RED_RIBBON }
  }
  if (normalized === 'white') {
    return { label, variant: 'white', ...PALE_YELLOW_RIBBON }
  }
  if (normalized === 'rose' || normalized === 'rosé') {
    return { label, variant: 'rose', ...PALE_PINK_RIBBON }
  }
  if (normalized === 'sparkling') {
    return { label, variant: 'sparkling', ...PALE_YELLOW_RIBBON }
  }

  return { label, variant: 'default', ...RED_RIBBON }
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
      return {
        shop,
        price,
        url: listing.store_product_url?.trim() || null,
      }
    })
    .filter((row): row is { shop: string; price: number; url: string | null } => row != null)

  const style = wine.style?.trim() || null

  return {
    id: String(wine.id),
    producer: wine.producer?.trim() || 'Unknown producer',
    name: wine.wine_name?.trim() || 'Unnamed wine',
    vintage: wine.vintage != null && String(wine.vintage).trim() ? String(wine.vintage).trim() : null,
    country: wine.country?.trim() || '—',
    region: wine.region?.trim() || '—',
    style,
    grapes: parseGrapes(wine.grape_varieties),
    vivinoRating: ratingNum(wine.vivino_rating),
    vivinoUrl: wine.vivino_url?.trim() || null,
    prices,
    image: firstListingImageUrl(wine.store_listings ?? []) || null,
  }
}

export function countWinesByStyleVariant(wines: PreviewWineCardData[]) {
  const counts = { red: 0, white: 0, rose: 0, sparkling: 0, default: 0 }
  for (const wine of wines) {
    const ribbon = styleRibbonStyle(wine.style)
    if (ribbon) counts[ribbon.variant] += 1
  }
  return counts
}

export function lowestPrice(prices: PreviewWineCardData['prices']): number | null {
  if (!prices.length) return null
  return minWinePriceKES(
    prices.map((p) => ({ current_price_ksh: p.price })),
  )
}
