import { describe, expect, it } from 'vitest'
import type { WineRow } from '@/components/wine-table'
import { EMPTY_WINE_FILTERS } from '@/lib/wine-filters'
import { selectWinesForList } from '@/lib/wine-list-query'

function wine(partial: Partial<WineRow> & Pick<WineRow, 'id'>): WineRow {
  return {
    producer: null,
    wine_name: null,
    vintage: null,
    country: null,
    region: null,
    grape_varieties: null,
    style: null,
    vivino_url: null,
    vivino_rating: null,
    review: null,
    ...partial,
  }
}

describe('selectWinesForList', () => {
  const catalogue = [
    wine({ id: '1', wine_name: 'Malbec Reserve', style: 'Red', country: 'Argentina' }),
    wine({ id: '2', wine_name: 'Malbec Classic', style: 'Red', country: 'Chile' }),
    wine({ id: '3', wine_name: 'Sauvignon Blanc', style: 'White', country: 'Argentina' }),
  ]

  it('applies filters to the full catalogue when search is empty', () => {
    const rows = selectWinesForList(catalogue, '', {
      ...EMPTY_WINE_FILTERS,
      styles: ['White'],
    })
    expect(rows.map((row) => row.id)).toEqual(['3'])
  })

  it('searches the full catalogue then refines with filters', () => {
    const rows = selectWinesForList(catalogue, 'malbec', {
      ...EMPTY_WINE_FILTERS,
      country: 'Argentina',
    })
    expect(rows.map((row) => row.id)).toEqual(['1'])
  })

  it('keeps all search hits when filters are empty', () => {
    const rows = selectWinesForList(catalogue, 'malbec', EMPTY_WINE_FILTERS)
    expect(rows.map((row) => row.id).sort()).toEqual(['1', '2'])
  })
})
