import { describe, expect, it } from 'vitest'
import {
  EMPTY_WINE_FILTERS,
  passesMyWineToggles,
  type WineFilters,
} from '@/lib/wine-filters'
import type { WineReview, WineRow } from '@/components/wine-table'

function review( partial: Partial<WineReview>): WineReview {
  return {
    id: 'r1',
    overall_score: null,
    value_score: null,
    wishlist: null,
    tried_status: null,
    shortlist: null,
    hide: null,
    tasting_notes: null,
    tasted_on: null,
    ...partial,
  }
}

function wine( partialReview?: Partial<WineReview> | null): WineRow {
  return {
    id: 'w1',
    producer: 'Test',
    wine_name: 'Wine',
    vintage: null,
    country: null,
    region: null,
    grape_varieties: null,
    style: null,
    vivino_url: null,
    vivino_rating: null,
    review: partialReview === null ? null : review(partialReview ?? {}),
  }
}

function filters(patch: Partial<WineFilters> = {}): WineFilters {
  return { ...EMPTY_WINE_FILTERS, ...patch }
}

describe('passesMyWineToggles', () => {
  it('hides one-status wines when their toggle is off', () => {
    expect(passesMyWineToggles(wine({}), filters({ includeUnmarked: false }))).toBe(false)
    expect(passesMyWineToggles(wine({ wishlist: 1 }), filters({ includeBookmarked: false }))).toBe(
      false,
    )
    expect(
      passesMyWineToggles(wine({ tried_status: 1 }), filters({ includeBuyAgain: false })),
    ).toBe(false)
    expect(
      passesMyWineToggles(wine({ tried_status: 2 }), filters({ includeDontBuyAgain: false })),
    ).toBe(false)
    expect(passesMyWineToggles(wine({ hide: true }), filters({ includeHidden: false }))).toBe(
      false,
    )
  })

  it('shows bookmarked + buy again unless both toggles are off', () => {
    const marked = wine({ wishlist: 1, tried_status: 1 })
    expect(passesMyWineToggles(marked, filters({ includeBookmarked: false }))).toBe(true)
    expect(passesMyWineToggles(marked, filters({ includeBuyAgain: false }))).toBe(true)
    expect(
      passesMyWineToggles(
        marked,
        filters({ includeBookmarked: false, includeBuyAgain: false }),
      ),
    ).toBe(false)
  })

  it('hides bookmarked + don’t-buy when don’t-buy toggle is off', () => {
    const marked = wine({ wishlist: 1, tried_status: 2 })
    expect(passesMyWineToggles(marked, filters({ includeDontBuyAgain: false }))).toBe(false)
    expect(passesMyWineToggles(marked, filters({ includeBookmarked: false }))).toBe(true)
  })

  it('hides ignored combos when Ignored is off, even if another status is on', () => {
    expect(
      passesMyWineToggles(
        wine({ wishlist: 1, hide: true }),
        filters({ includeHidden: false }),
      ),
    ).toBe(false)
    expect(
      passesMyWineToggles(
        wine({ tried_status: 1, hide: true }),
        filters({ includeHidden: false }),
      ),
    ).toBe(false)
    expect(
      passesMyWineToggles(
        wine({ tried_status: 2, hide: true }),
        filters({ includeHidden: false }),
      ),
    ).toBe(false)
  })

  it('shows ignored wine when Ignored is on even if bookmark/buy toggles are off', () => {
    expect(
      passesMyWineToggles(
        wine({ wishlist: 1, hide: true }),
        filters({ includeBookmarked: false }),
      ),
    ).toBe(true)
    expect(
      passesMyWineToggles(
        wine({ tried_status: 1, hide: true }),
        filters({ includeBuyAgain: false }),
      ),
    ).toBe(true)
  })

  it('hides don’t-buy + ignored when either toggle is off', () => {
    const marked = wine({ tried_status: 2, hide: true })
    expect(passesMyWineToggles(marked, filters({ includeDontBuyAgain: false }))).toBe(false)
    expect(passesMyWineToggles(marked, filters({ includeHidden: false }))).toBe(false)
  })

  it('hides bookmarked + buy again + ignored when Ignored is off', () => {
    const marked = wine({ wishlist: 1, tried_status: 1, hide: true })
    expect(passesMyWineToggles(marked, filters({ includeHidden: false }))).toBe(false)
    expect(
      passesMyWineToggles(
        marked,
        filters({ includeBookmarked: false, includeBuyAgain: false }),
      ),
    ).toBe(true)
  })
})
