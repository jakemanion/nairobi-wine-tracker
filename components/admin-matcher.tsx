'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditableBoolCell } from '@/components/editable-bool-cell'
import { EditableTextCell } from '@/components/editable-text-cell'
import {
  clearStoreListingMatch,
  matchStoreListingToWine,
  updateStoreListingField,
  type StoreListingRecord,
} from '@/lib/store-listings'
import {
  createWine,
  formatWineLabel,
  updateWineField,
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
  padding: 12,
}

const selectedRowStyle = {
  backgroundColor: '#e8f4ff',
  borderColor: '#6af',
}

const matchedRowStyle = {
  backgroundColor: '#f3faf3',
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
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  useEffect(() => {
    setListings(initialListings)
  }, [initialListings])

  useEffect(() => {
    setWines(initialWines)
  }, [initialWines])

  const groupedListings = useMemo(() => groupListingsByStore(listings), [listings])

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
    if (!selectedListingId || !selectedWineId || matching) return

    setMatching(true)
    setMatchError(null)

    const result = await matchStoreListingToWine({
      listingId: selectedListingId,
      wineId: selectedWineId,
    })

    setMatching(false)

    if (result.error || !result.listing) {
      setMatchError(result.error ?? 'Failed to match listing.')
      return
    }

    setListings((current) => updateListingInState(current, result.listing!))
  }

  async function handleClearMatch() {
    if (!selectedListingId || matching) return

    setMatching(true)
    setMatchError(null)

    const result = await clearStoreListingMatch(selectedListingId)

    setMatching(false)

    if (result.error || !result.listing) {
      setMatchError(result.error ?? 'Failed to clear match.')
      return
    }

    setListings((current) => updateListingInState(current, result.listing!))
    setSelectedWineId(null)
  }

  async function handleAddWine() {
    const result = await createWine()
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

    const result = await updateStoreListingField({
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

    const result = await updateWineField({
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

  const canMatch = Boolean(selectedListingId && selectedWineId && !matching)
  const canClearMatch = Boolean(selectedListing?.wine_id && !matching)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 'calc(100vh - 40px)' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          border: '1px solid #ddd',
          borderRadius: 8,
          background: '#fafafa',
        }}
      >
        <button
          type="button"
          disabled={!canMatch}
          onClick={() => void handleMatch()}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            cursor: canMatch ? 'pointer' : 'not-allowed',
            opacity: canMatch ? 1 : 0.5,
          }}
        >
          {matching ? 'Saving…' : 'Match'}
        </button>
        <button
          type="button"
          disabled={!canClearMatch}
          onClick={() => void handleClearMatch()}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            cursor: canClearMatch ? 'pointer' : 'not-allowed',
            opacity: canClearMatch ? 1 : 0.5,
          }}
        >
          Clear match
        </button>
        <span style={{ color: '#555', fontSize: 14 }}>
          {selectedListing && selectedWine
            ? `Link "${selectedListing.raw_title ?? 'listing'}" → ${formatWineLabel(selectedWine)}`
            : 'Select a store listing and a canonical wine, then click Match.'}
        </span>
        {matchError && <span style={{ color: '#c33', fontSize: 14 }}>{matchError}</span>}
      </div>

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        <section style={panelStyle}>
          <header
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid #eee',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Store listings ({listings.length})
          </header>
          <div style={scrollStyle}>
            {groupedListings.length === 0 ? (
              <p style={{ color: '#888' }}>No store listings yet.</p>
            ) : (
              groupedListings.map((group) => (
                <div key={group.storeName} style={{ marginBottom: 20 }}>
                  <h3
                    style={{
                      margin: '0 0 8px',
                      fontSize: 13,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#666',
                    }}
                  >
                    {group.storeName}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                            border: '1px solid #e4e4e4',
                            borderRadius: 6,
                            padding: 10,
                            cursor: 'pointer',
                            ...(isSelected ? selectedRowStyle : {}),
                            ...(!isSelected && isMatched ? matchedRowStyle : {}),
                          }}
                        >
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <input
                              type="radio"
                              checked={isSelected}
                              readOnly
                              aria-label={`Select ${listing.raw_title ?? 'listing'}`}
                              style={{ marginTop: 4 }}
                            />
                            <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                                <EditableTextCell
                                  label="Raw title"
                                  value={listing.raw_title}
                                  onSave={(value) => saveListingField(listing, 'raw_title', value)}
                                />
                              </div>
                              <div style={{ display: 'grid', gap: 4, color: '#444' }}>
                                <div>
                                  <span style={{ color: '#888' }}>Price: </span>
                                  <EditableTextCell
                                    label="Price"
                                    value={listing.current_price_ksh}
                                    display={
                                      listing.current_price_ksh != null
                                        ? `KES ${listing.current_price_ksh}`
                                        : '-'
                                    }
                                    onSave={(value) =>
                                      saveListingField(listing, 'current_price_ksh', value)
                                    }
                                  />
                                </div>
                                <div>
                                  <span style={{ color: '#888' }}>URL: </span>
                                  {listing.store_product_url ? (
                                    <a
                                      href={listing.store_product_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: '#0a7', marginRight: 8 }}
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      open
                                    </a>
                                  ) : null}
                                  <EditableTextCell
                                    label="Product URL"
                                    value={listing.store_product_url}
                                    onSave={(value) =>
                                      saveListingField(listing, 'store_product_url', value)
                                    }
                                  />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ color: '#888' }}>In stock: </span>
                                  <EditableBoolCell
                                    label="In stock"
                                    value={listing.in_stock}
                                    onSave={(value) =>
                                      saveListingField(listing, 'in_stock', value)
                                    }
                                  />
                                </div>
                                <div>
                                  <span style={{ color: '#888' }}>Matched wine: </span>
                                  <strong style={{ color: isMatched ? '#060' : '#999' }}>
                                    {matchedLabel ?? 'Not matched'}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={panelStyle}>
          <header
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>Canonical wines ({wines.length})</span>
            <button
              type="button"
              onClick={() => void handleAddWine()}
              style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
            >
              Add wine
            </button>
          </header>
          <div style={scrollStyle}>
            {wines.length === 0 ? (
              <p style={{ color: '#888' }}>No wines yet. Add one to start matching.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                        border: '1px solid #e4e4e4',
                        borderRadius: 6,
                        padding: 10,
                        cursor: 'pointer',
                        fontSize: 14,
                        ...(isSelected ? selectedRowStyle : {}),
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <input
                          type="radio"
                          checked={isSelected}
                          readOnly
                          aria-label={`Select ${formatWineLabel(wine)}`}
                          style={{ marginTop: 4 }}
                        />
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '6px 12px',
                          }}
                        >
                          <Field label="Producer" wine={wine} field="producer" onSave={saveWineField} />
                          <Field label="Wine name" wine={wine} field="wine_name" onSave={saveWineField} />
                          <Field label="Vintage" wine={wine} field="vintage" onSave={saveWineField} />
                          <Field label="Country" wine={wine} field="country" onSave={saveWineField} />
                          <Field label="Region" wine={wine} field="region" onSave={saveWineField} />
                          <Field label="Style" wine={wine} field="style" onSave={saveWineField} />
                          <Field
                            label="Grapes"
                            wine={wine}
                            field="grape_varieties"
                            display={formatGrapeVarieties(wine.grape_varieties) || '-'}
                            onSave={saveWineField}
                          />
                          <Field label="Vivino URL" wine={wine} field="vivino_url" onSave={saveWineField} />
                          <Field
                            label="Vivino rating"
                            wine={wine}
                            field="vivino_rating"
                            onSave={saveWineField}
                          />
                        </div>
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

function Field({
  label,
  wine,
  field,
  display,
  onSave,
}: {
  label: string
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
    <div>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 2 }}>{label}</div>
      <EditableTextCell
        label={label}
        value={value}
        display={display}
        onSave={(next) => onSave(wine, field, next)}
      />
    </div>
  )
}
