/**
 * Pure aggregation used by admin flag indicators and unit tests.
 * Live admin counts come from getOpenReportCounts() which queries open rows only.
 */
export function aggregateOpenReportCounts(
  rows: Array<{
    wine_id: string | null
    store_listing_id: string | null
    status: string
  }>,
): {
  byWineId: Record<string, number>
  byStoreListingId: Record<string, number>
  totalOpen: number
} {
  const byWineId: Record<string, number> = {}
  const byStoreListingId: Record<string, number> = {}
  let totalOpen = 0

  for (const row of rows) {
    if (row.status !== 'open') continue
    totalOpen += 1
    if (row.wine_id) {
      byWineId[row.wine_id] = (byWineId[row.wine_id] ?? 0) + 1
    }
    if (row.store_listing_id) {
      byStoreListingId[row.store_listing_id] =
        (byStoreListingId[row.store_listing_id] ?? 0) + 1
    }
  }

  return { byWineId, byStoreListingId, totalOpen }
}
