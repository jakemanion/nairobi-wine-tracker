import type { WineRow } from '@/components/wine-table'
import { filterWines, type WineFilters } from '@/lib/wine-filters'
import {
  createWineSearchIndex,
  hasActiveWineSearch,
  searchWinesFromIndex,
} from '@/lib/wine-search'

/**
 * Search the full catalogue first, then refine with filters.
 * When there is no active search, filters apply to the full catalogue.
 * Pass a prebuilt `index` from `createWineSearchIndex(wines)` to avoid rebuilding Fuse.
 */
export function selectWinesForList<T extends WineRow>(
  wines: T[],
  searchQuery: string,
  filters: WineFilters,
  index?: ReturnType<typeof createWineSearchIndex<T>>,
): T[] {
  if (!hasActiveWineSearch(searchQuery)) {
    return filterWines(wines, filters)
  }

  const searched = searchWinesFromIndex(index ?? createWineSearchIndex(wines), searchQuery)
  return filterWines(searched, filters)
}
