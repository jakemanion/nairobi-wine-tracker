'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { EditableBoolCell } from '@/components/editable-bool-cell'
import { EditableTextCell } from '@/components/editable-text-cell'
import {
  adminClearStoreListingMatch,
  adminCreateWine,
  adminMatchStoreListingToWine,
  adminPromoteListingToCanonicalWine,
  adminUpdateStoreListingField,
  adminUpdateWineField,
} from '@/app/admin/actions'
import { type StoreListingRecord } from '@/lib/store-listings'
import {
  formatWineLabel,
  type WineField,
  type WineRecord,
} from '@/lib/wines'

function formatGrapeVarieties(value: unknown): string {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function parseGrapeVarieties(raw: string | null): string | string[] | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as string[]
    } catch {
      return trimmed
    }
  }
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((part) => part.trim()).filter(Boolean)
  }
  return trimmed
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null
  const n = parseFloat(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function groupListingsByStore(
  listings: StoreListingRecord[],
): Array<{ storeName: string; listings: StoreListingRecord[] }> {
  const groups = new Map<string, StoreListingRecord[]>()

  for (const listing of listings) {
    const storeName = listing.stores?.name?.trim() || 'Unknown store'
    const group = groups.get(storeName) ?? []
    group.push(listing)
    groups.set(storeName, group)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([storeName, storeListings]) => ({
      storeName,
      listings: [...storeListings].sort((a, b) =>
        (a.raw_title ?? '').localeCompare(b.raw_title ?? '', undefined, { sensitivity: 'base' }),
      ),
    }))
}

function updateListingInState(
  listings: StoreListingRecord[],
  listing: StoreListingRecord,
): StoreListingRecord[] {
  return listings.map((row) => (row.id === listing.id ? listing : row))
}

function updateWineInState(wines: WineRecord[], wine: WineRecord): WineRecord[] {
  return wines.map((row) => (row.id === wine.id ? wine : row))
}

const panelStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#fff',
}

const scrollStyle = {
  flex: 1,
  overflowY: 'auto' as const,
  padding: '6px 8px',
}

const selectedRowStyle = {
  backgroundColor: '#e8f4ff',
  borderColor: '#6af',
}

const matchedRowStyle = {
  backgroundColor: '#f3faf3',
}

const rowStyle = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 6,
  border: '1px solid #e8e8e8',
  borderRadius: 4,
  padding: '3px 6px',
  cursor: 'pointer' as const,
  fontSize: 12,
  lineHeight: 1.3,
  minHeight: 24,
}

const inlineLineStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex' as const,
  alignItems: 'center' as const,
  flexWrap: 'wrap' as const,
  gap: '2px 0',
  color: '#333',
}

function Pipe() {
  return (
    <span aria-hidden style={{ color: '#ccc', padding: '0 5px', userSelect: 'none', flexShrink: 0 }}>
      |
    </span>
  )
}

function actionButtonStyle(
  variant: 'primary' | 'default',
  enabled: boolean,
): CSSProperties {
  const primary = variant === 'primary'

  return {
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: primary ? 600 : 400,
    border: primary ? '1px solid #067a5c' : '1px solid #bbb',
    borderRadius: 4,
    background: primary ? (enabled ? '#0a7' : '#d8ebe6') : enabled ? '#fff' : '#f4f4f4',
    color: primary ? (enabled ? '#fff' : '#4a6a62') : enabled ? '#222' : '#888',
    cursor: enabled ? 'pointer' : 'not-allowed',
  }
}

function AddToWinesButton({
  enabled,
  busy,
  onClick,
  title,
}: {
  enabled: boolean
  busy: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      title={title}
      onClick={onClick}
      style={actionButtonStyle('primary', enabled)}
    >
      {busy ? 'Saving…' : 'Add to wines'}
    </button>
  )
}

type AdminMatcherProps = {
  initialListings: StoreListingRecord[]
  initialWines: WineRecord[]
}

export function AdminMatcher({ initialListings, initialWines }: AdminMatcherProps) {
  const [listings, setListings] = useState(initialListings)
  const [wines, setWines] = useState(initialWines)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [unmatchedOnly, setUnmatchedOnly] = useState(false)
  const [collapsedStores, setCollapsedStores] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setListings(initialListings)
  }, [initialListings])

  useEffect(() => {
    setWines(initialWines)
  }, [initialWines])

  const unmatchedCount = useMemo(
    () => listings.filter((listing) => !listing.wine_id).length,
    [listings],
  )

  const visibleListings = useMemo(
    () => (unmatchedOnly ? listings.filter((listing) => !listing.wine_id) : listings),
    [listings, unmatchedOnly],
  )

  const groupedListings = useMemo(() => groupListingsByStore(visibleListings), [visibleListings])

  function toggleStoreCollapsed(storeName: string) {
    setCollapsedStores((current) => {
      const next = new Set(current)
      if (next.has(storeName)) next.delete(storeName)
      else next.add(storeName)
      return next
    })
  }

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === selectedListingId) ?? null,
    [listings, selectedListingId],
  )

  const selectedWine = useMemo(
    () => wines.find((wine) => wine.id === selectedWineId) ?? null,
    [wines, selectedWineId],
  )

  function selectListing(listing: StoreListingRecord) {
    setSelectedListingId(listing.id)
    setMatchError(null)
    if (listing.wine_id) {
      setSelectedWineId(listing.wine_id)
    }
  }

  function selectWine(wine: WineRecord) {
    setSelectedWineId(wine.id)
    setMatchError(null)
  }

  async function handleMatch() {
    if (!selectedListingId || !selectedWineId || busy) return

    setBusy(true)
    setMatchError(null)

    const result = await adminMatchStoreListingToWine({
      listingId: selectedListingId,
      wineId: selectedWineId,
    })

    setBusy(false)

    if (result.error || !result.listing) {
      setMatchError(result.error ?? 'Failed to match listing.')
      return
    }

    setListings((current) => updateListingInState(current, result.listing!))
  }

  async function handleClearMatch() {
    if (!selectedListingId || busy) return

    setBusy(true)
    setMatchError(null)

    const result = await adminClearStoreListingMatch(selectedListingId)

    setBusy(false)

    if (result.error || !result.listing) {
      setMatchError(result.error ?? 'Failed to clear match.')
      return
    }

    setListings((current) => updateListingInState(current, result.listing!))
    setSelectedWineId(null)
  }

  async function handleAddListingToWines() {
    if (!selectedListing || busy) return

    setBusy(true)
    setMatchError(null)

    const result = await adminPromoteListingToCanonicalWine(selectedListing)

    setBusy(false)

    if (result.error || !result.wine || !result.listing) {
      setMatchError(result.error ?? 'Failed to create wine from listing.')
      return
    }

    setWines((current) => [...current, result.wine!])
    setListings((current) => updateListingInState(current, result.listing!))
    setSelectedWineId(result.wine.id)
  }

  async function handleAddWine() {
    const result = await adminCreateWine()
    if (result.error || !result.wine) return
    setWines((current) => [...current, result.wine!])
    setSelectedWineId(result.wine.id)
  }

  async function saveListingField(
    listing: StoreListingRecord,
    field: 'raw_title' | 'store_product_url' | 'current_price_ksh' | 'in_stock',
    value: string | boolean | null,
  ) {
    let parsed: string | number | boolean | null = value

    if (field === 'current_price_ksh') {
      if (typeof value === 'string') {
        try {
          parsed = parsePrice(value)
        } catch {
          return { error: 'Enter a valid price' }
        }
        if (value.trim() && parsed == null) {
          return { error: 'Enter a valid price' }
        }
      }
    }

    const result = await adminUpdateStoreListingField({
      listingId: listing.id,
      field,
      value: parsed,
    })

    if (result.listing) {
      setListings((current) => updateListingInState(current, result.listing!))
    }

    return { error: result.error }
  }

  async function saveWineField(wine: WineRecord, field: WineField, value: string | null) {
    let parsed: string | number | string[] | null = value

    if (field === 'grape_varieties') {
      parsed = parseGrapeVarieties(value)
    } else if (field === 'vintage' || field === 'vivino_rating') {
      if (!value) {
        parsed = null
      } else {
        const n = Number(value)
        parsed = Number.isFinite(n) ? n : value
      }
    }

    const result = await adminUpdateWineField({
      wineId: wine.id,
      field,
      value: parsed,
    })

    if (result.wine) {
      setWines((current) => updateWineInState(current, result.wine!))
      setListings((current) =>
        current.map((listing) =>
          listing.wine_id === result.wine!.id
            ? {
                ...listing,
                wines: {
                  id: result.wine!.id,
                  producer: result.wine!.producer,
                  wine_name: result.wine!.wine_name,
                  vintage: result.wine!.vintage,
                },
              }
            : listing,
        ),
      )
    }

    return { error: result.error }
  }

  const canMatch = Boolean(selectedListingId && selectedWineId && !busy)
  const canClearMatch = Boolean(selectedListing?.wine_id && !busy)
  const canAddListingToWines = Boolean(selectedListing && !selectedListing.wine_id && !busy)

  const addToWinesHint = !selectedListing
    ? 'Select an unmatched store listing first'
    : selectedListing.wine_id
      ? 'Listing already matched — use Clear to unlink first'
      : 'Create a canonical wine from the selected listing'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 'calc(100vh - 40px)' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          border: '1px solid #ddd',
          borderRadius: 6,
          background: '#fafafa',
          fontSize: 12,
        }}
      >
        <AddToWinesButton
          enabled={canAddListingToWines}
          busy={busy}
          title={addToWinesHint}
          onClick={() => void handleAddListingToWines()}
        />
        <button
          type="button"
          disabled={!canMatch}
          onClick={() => void handleMatch()}
          style={actionButtonStyle('default', canMatch)}
        >
          Match
        </button>
        <button
          type="button"
          disabled={!canClearMatch}
          onClick={() => void handleClearMatch()}
          style={actionButtonStyle('default', canClearMatch)}
        >
          Clear
        </button>
        <span style={{ color: '#555' }}>
          {selectedListing && selectedWine
            ? `${selectedListing.raw_title ?? 'listing'} → ${formatWineLabel(selectedWine)}`
            : 'Add to wines: select unmatched listing. Match: select listing + wine.'}
        </span>
        {matchError && <span style={{ color: '#c33' }}>{matchError}</span>}
      </div>

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        <section style={panelStyle}>
          <header
            style={{
              padding: '6px 10px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              fontSize: 13,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>
                Store listings ({unmatchedOnly ? `${visibleListings.length} unmatched` : listings.length})
              </span>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  color: '#555',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={unmatchedOnly}
                  onChange={(event) => setUnmatchedOnly(event.target.checked)}
                />
                Unmatched only ({unmatchedCount})
              </label>
            </div>
            <AddToWinesButton
              enabled={canAddListingToWines}
              busy={busy}
              title={addToWinesHint}
              onClick={() => void handleAddListingToWines()}
            />
          </header>
          <div style={scrollStyle}>
            {groupedListings.length === 0 ? (
              <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
                {unmatchedOnly ? 'No unmatched listings.' : 'No store listings yet.'}
              </p>
            ) : (
              groupedListings.map((group) => {
                const isCollapsed = collapsedStores.has(group.storeName)

                return (
                <div key={group.storeName} style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={() => toggleStoreCollapsed(group.storeName)}
                    aria-expanded={!isCollapsed}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      width: '100%',
                      margin: '0 0 3px',
                      padding: '2px 0',
                      border: 'none',
                      background: 'none',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#666',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span aria-hidden style={{ width: 10, flexShrink: 0 }}>
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                    <span>{group.storeName}</span>
                    <span style={{ color: '#999', fontWeight: 400 }}>({group.listings.length})</span>
                  </button>
                  {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {group.listings.map((listing) => {
                      const isSelected = listing.id === selectedListingId
                      const isMatched = Boolean(listing.wine_id)
                      const matchedLabel = listing.wines
                        ? formatWineLabel(listing.wines)
                        : null

                      return (
                        <div
                          key={listing.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectListing(listing)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              selectListing(listing)
                            }
                          }}
                          style={{
                            ...rowStyle,
                            ...(isSelected ? selectedRowStyle : {}),
                            ...(!isSelected && isMatched ? matchedRowStyle : {}),
                          }}
                        >
                          <input
                            type="radio"
                            checked={isSelected}
                            readOnly
                            aria-label={`Select ${listing.raw_title ?? 'listing'}`}
                            style={{ margin: 0, flexShrink: 0 }}
                          />
                          <div style={inlineLineStyle}>
                            <EditableTextCell
                              label="Raw title"
                              inline
                              emptyDisplay="—"
                              value={listing.raw_title}
                              onSave={(value) => saveListingField(listing, 'raw_title', value)}
                            />
                            <Pipe />
                            <EditableTextCell
                              label="Price"
                              inline
                              emptyDisplay="—"
                              value={listing.current_price_ksh}
                              display={
                                listing.current_price_ksh != null
                                  ? `KES ${listing.current_price_ksh}`
                                  : '—'
                              }
                              onSave={(value) =>
                                saveListingField(listing, 'current_price_ksh', value)
                              }
                            />
                            <Pipe />
                            {listing.store_product_url ? (
                              <a
                                href={listing.store_product_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#0a7', flexShrink: 0, fontSize: 11 }}
                                onClick={(event) => event.stopPropagation()}
                                title={listing.store_product_url}
                              >
                                ↗
                              </a>
                            ) : null}
                            <EditableTextCell
                              label="Product URL"
                              inline
                              emptyDisplay="—"
                              value={listing.store_product_url}
                              onSave={(value) =>
                                saveListingField(listing, 'store_product_url', value)
                              }
                            />
                            <Pipe />
                            <EditableBoolCell
                              label="In stock"
                              value={listing.in_stock}
                              onSave={(value) => saveListingField(listing, 'in_stock', value)}
                            />
                            <Pipe />
                            <span
                              style={{
                                color: isMatched ? '#060' : '#aaa',
                                fontWeight: isMatched ? 500 : 400,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 180,
                              }}
                              title={matchedLabel ?? 'Not matched'}
                            >
                              {matchedLabel ?? '—'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  )}
                </div>
              )})
            )}
          </div>
        </section>

        <section style={panelStyle}>
          <header
            style={{
              padding: '6px 10px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 600 }}>Canonical wines ({wines.length})</span>
            <button
              type="button"
              onClick={() => void handleAddWine()}
              style={{ padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}
            >
              Add wine
            </button>
          </header>
          <div style={scrollStyle}>
            {wines.length === 0 ? (
              <p style={{ color: '#888', fontSize: 12, margin: 0 }}>No wines yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {wines.map((wine) => {
                  const isSelected = wine.id === selectedWineId

                  return (
                    <div
                      key={wine.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectWine(wine)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          selectWine(wine)
                        }
                      }}
                      style={{
                        ...rowStyle,
                        ...(isSelected ? selectedRowStyle : {}),
                      }}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        readOnly
                        aria-label={`Select ${formatWineLabel(wine)}`}
                        style={{ margin: 0, flexShrink: 0 }}
                      />
                      <div style={inlineLineStyle}>
                        <WineInlineField wine={wine} field="producer" onSave={saveWineField} />
                        <Pipe />
                        <WineInlineField wine={wine} field="wine_name" onSave={saveWineField} />
                        <Pipe />
                        <WineInlineField wine={wine} field="vintage" onSave={saveWineField} />
                        <Pipe />
                        <WineInlineField wine={wine} field="country" onSave={saveWineField} />
                        <Pipe />
                        <WineInlineField wine={wine} field="region" onSave={saveWineField} />
                        <Pipe />
                        <WineInlineField wine={wine} field="style" onSave={saveWineField} />
                        <Pipe />
                        <WineInlineField
                          wine={wine}
                          field="grape_varieties"
                          display={formatGrapeVarieties(wine.grape_varieties) || '—'}
                          onSave={saveWineField}
                        />
                        <Pipe />
                        <WineInlineField wine={wine} field="vivino_url" onSave={saveWineField} />
                        <Pipe />
                        <WineInlineField wine={wine} field="vivino_rating" onSave={saveWineField} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

const wineFieldLabels: Record<WineField, string> = {
  producer: 'Producer',
  wine_name: 'Wine name',
  vintage: 'Vintage',
  country: 'Country',
  region: 'Region',
  grape_varieties: 'Grapes',
  style: 'Style',
  vivino_url: 'Vivino URL',
  vivino_rating: 'Vivino rating',
}

function WineInlineField({
  wine,
  field,
  display,
  onSave,
}: {
  wine: WineRecord
  field: WineField
  display?: string
  onSave: (
    wine: WineRecord,
    field: WineField,
    value: string | null,
  ) => Promise<{ error?: string }>
}) {
  const value =
    field === 'grape_varieties'
      ? formatGrapeVarieties(wine.grape_varieties)
      : (wine[field] as string | number | null)

  return (
    <EditableTextCell
      label={wineFieldLabels[field]}
      inline
      emptyDisplay="—"
      value={value}
      display={display}
      onSave={(next) => onSave(wine, field, next)}
    />
  )
}
