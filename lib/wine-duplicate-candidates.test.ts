import { describe, expect, it } from 'vitest'
import { findLikelyDuplicateWineIds } from '@/lib/wine-duplicate-candidates'

describe('findLikelyDuplicateWineIds', () => {
  it('flags wines that share a wine name ignoring vintage', () => {
    const ids = findLikelyDuplicateWineIds([
      { id: 'a', wine_name: 'Château Latour' },
      { id: 'b', wine_name: 'chateau  latour' },
      { id: 'c', wine_name: 'Something Else' },
    ])
    expect([...ids].sort()).toEqual(['a', 'b'])
  })

  it('ignores empty wine names', () => {
    const ids = findLikelyDuplicateWineIds([
      { id: 'a', wine_name: null },
      { id: 'b', wine_name: '  ' },
      { id: 'c', wine_name: 'Solo' },
    ])
    expect(ids.size).toBe(0)
  })

  it('does not flag unique names', () => {
    const ids = findLikelyDuplicateWineIds([
      { id: 'a', wine_name: 'Alpha' },
      { id: 'b', wine_name: 'Beta' },
    ])
    expect(ids.size).toBe(0)
  })
})
