import type { WineRecord } from '@/lib/wines'

function normalizeWineName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Wines that share a non-empty wine name with at least one other wine.
 * Vintage/year is ignored — different years of the same bottle still count.
 */
export function findLikelyDuplicateWineIds(
  wines: ReadonlyArray<Pick<WineRecord, 'id' | 'wine_name'>>,
): Set<string> {
  const byName = new Map<string, string[]>()

  for (const wine of wines) {
    const name = normalizeWineName(wine.wine_name)
    if (!name) continue
    const list = byName.get(name) ?? []
    list.push(wine.id)
    byName.set(name, list)
  }

  const duplicateIds = new Set<string>()
  for (const ids of byName.values()) {
    if (ids.length < 2) continue
    for (const id of ids) duplicateIds.add(id)
  }
  return duplicateIds
}

export function countLikelyDuplicateWines(
  wines: ReadonlyArray<Pick<WineRecord, 'id' | 'wine_name'>>,
): number {
  return findLikelyDuplicateWineIds(wines).size
}
