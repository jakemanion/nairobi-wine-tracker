import Fuse, { type IFuseOptions } from 'fuse.js'
import type { WineRow } from '@/components/wine-table'

/** Lowercase, strip accents/diacritics and punctuation, collapse whitespace. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type SearchableWineEntry<T extends WineRow> = {
  wine: T
  producerSearch: string
  wineNameSearch: string
  combinedSearch: string
}

function toSearchableEntry<T extends WineRow>(wine: T): SearchableWineEntry<T> {
  const producerSearch = normalizeSearchText(wine.producer ?? '')
  const wineNameSearch = normalizeSearchText(wine.wine_name ?? '')
  const combinedSearch = [producerSearch, wineNameSearch].filter(Boolean).join(' ')

  return { wine, producerSearch, wineNameSearch, combinedSearch }
}

const FUSE_OPTIONS: IFuseOptions<SearchableWineEntry<WineRow>> = {
  keys: [
    { name: 'producerSearch', weight: 1 },
    { name: 'wineNameSearch', weight: 1.15 },
    { name: 'combinedSearch', weight: 0.9 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: false,
}

export function createWineSearchIndex<T extends WineRow>(wines: T[]) {
  const entries = wines.map(toSearchableEntry)
  return new Fuse(entries, FUSE_OPTIONS as IFuseOptions<SearchableWineEntry<T>>)
}

export function fuzzySearchWines<T extends WineRow>(wines: T[], query: string): T[] {
  const trimmed = query.trim()
  if (!trimmed) return wines

  const normalizedQuery = normalizeSearchText(trimmed)
  if (!normalizedQuery) return wines

  const index = createWineSearchIndex(wines)
  return index.search(normalizedQuery).map((result) => result.item.wine)
}
