import { describe, expect, it } from 'vitest'
import {
  WINE_REPORT_DESCRIPTION_MAX_LENGTH,
  WINE_REPORT_ISSUE_TYPES,
} from '@/lib/reports/constants'
import {
  isUuid,
  isWineReportIssueType,
  normalizeReportDescription,
  normalizeResolutionNote,
  validateSubmitWineReportInput,
} from '@/lib/reports/validation'
import { aggregateOpenReportCounts } from '@/lib/reports/open-report-counts'

describe('validateSubmitWineReportInput', () => {
  const wineId = '11111111-1111-4111-8111-111111111111'
  const listingId = '22222222-2222-4222-8222-222222222222'

  it('accepts a valid wine-level report', () => {
    const result = validateSubmitWineReportInput({
      wineId,
      issueType: 'incorrect_price',
      description: 'Price looks wrong',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.wineId).toBe(wineId)
      expect(result.data.storeListingId).toBeNull()
      expect(result.data.issueType).toBe('incorrect_price')
      expect(result.data.description).toBe('Price looks wrong')
    }
  })

  it('accepts an optional store listing id', () => {
    const result = validateSubmitWineReportInput({
      wineId,
      storeListingId: listingId,
      issueType: 'duplicate_listing',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.storeListingId).toBe(listingId)
    }
  })

  it('rejects missing wine id', () => {
    const result = validateSubmitWineReportInput({
      wineId: '',
      issueType: 'other',
    })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid wine id', () => {
    const result = validateSubmitWineReportInput({
      wineId: 'not-a-uuid',
      issueType: 'other',
    })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid store listing id', () => {
    const result = validateSubmitWineReportInput({
      wineId,
      storeListingId: 'bad',
      issueType: 'other',
    })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid issue categories', () => {
    const result = validateSubmitWineReportInput({
      wineId,
      issueType: 'not_a_real_issue',
    })
    expect(result.ok).toBe(false)
  })

  it('rejects oversized descriptions', () => {
    const result = validateSubmitWineReportInput({
      wineId,
      issueType: 'other',
      description: 'x'.repeat(WINE_REPORT_DESCRIPTION_MAX_LENGTH + 1),
    })
    expect(result.ok).toBe(false)
  })

  it('treats blank description as null', () => {
    const result = validateSubmitWineReportInput({
      wineId,
      issueType: 'other',
      description: '   ',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.description).toBeNull()
  })
})

describe('issue type helpers', () => {
  it('recognises every configured issue type', () => {
    for (const type of WINE_REPORT_ISSUE_TYPES) {
      expect(isWineReportIssueType(type)).toBe(true)
    }
  })

  it('validates uuids', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isUuid('nope')).toBe(false)
  })
})

describe('normalizeResolutionNote', () => {
  it('trims and accepts notes', () => {
    expect(normalizeResolutionNote('  fixed price  ')).toEqual({
      ok: true,
      note: 'fixed price',
    })
  })

  it('rejects oversized notes', () => {
    const result = normalizeResolutionNote('y'.repeat(2001))
    expect(result.ok).toBe(false)
  })
})

describe('normalizeReportDescription', () => {
  it('rejects non-string values', () => {
    expect(normalizeReportDescription(12).ok).toBe(false)
  })
})

describe('aggregateOpenReportCounts', () => {
  it('counts open reports by wine and listing', () => {
    const counts = aggregateOpenReportCounts([
      { wine_id: 'w1', store_listing_id: 'l1', status: 'open' },
      { wine_id: 'w1', store_listing_id: null, status: 'open' },
      { wine_id: 'w2', store_listing_id: 'l2', status: 'resolved' },
      { wine_id: 'w3', store_listing_id: 'l1', status: 'open' },
    ])

    expect(counts.totalOpen).toBe(3)
    expect(counts.byWineId).toEqual({ w1: 2, w3: 1 })
    expect(counts.byStoreListingId).toEqual({ l1: 2 })
  })

  it('clears flags when all reports are resolved', () => {
    const counts = aggregateOpenReportCounts([
      { wine_id: 'w1', store_listing_id: 'l1', status: 'resolved' },
    ])
    expect(counts.totalOpen).toBe(0)
    expect(counts.byWineId).toEqual({})
    expect(counts.byStoreListingId).toEqual({})
  })
})
