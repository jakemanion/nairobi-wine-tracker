'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { EditableTextCell } from '@/components/editable-text-cell'
import { firstListingImageUrl, ListingThumbnail } from '@/components/listing-thumbnail'
import {
  adminClearStoreListingMatch,
  adminCreateWine,
  adminDeleteStoreListing,
  adminDeleteWine,
  adminMatchStoreListingToWine,
  adminPromoteListingToCanonicalWine,
  adminUpdateStoreListingField,
  adminUpdateWineField,
} from '@/app/admin/actions'
import {
  formatGrapeVarieties,
  parseGrapeVarietiesInput,
} from '@/lib/grape-varieties'
import { type StoreListingField, type StoreListingRecord } from '@/lib/store-listings'
import { formatStoreUrlDirectory, formatVivinoProductName } from '@/lib/url-display'
import { suggestWineMatches } from '@/lib/wine-match-suggestions'
import {
  formatWineLabel,
  type WineField,
  type WineRecord,
} from '@/lib/wines'

function parsePrice(raw: string | null): number | null {
  if (!raw) return null
  const n = parseFloat(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const MATCHED_WINE_SCROLL_MS = 500 / 3

function scrollContainerToElement(
  container: HTMLElement,
  element: HTMLElement,
  durationMs: number,
) {
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const elementTop = elementRect.top - containerRect.top + container.scrollTop
  const elementBottom = elementTop + element.offsetHeight
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight

  let targetScroll = viewTop
  if (elementTop < viewTop) {
    targetScroll = elementTop
  } else if (elementBottom > viewBottom) {
    targetScroll = elementBottom - container.clientHeight
  } else {
    return
  }

  targetScroll = Math.max(0, Math.min(targetScroll, container.scrollHeight - container.clientHeight))

  const start = container.scrollTop
  const distance = targetScroll - start
  if (Math.abs(distance) < 1) return

  const startTime = performance.now()

  function step(now: number) {
    const progress = Math.min((now - startTime) / durationMs, 1)
    const eased = 1 - (1 - progress) ** 3
    container.scrollTop = start + distance * eased
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

function groupListingsByWineId(
  listings: StoreListingRecord[],
): Map<string, StoreListingRecord[]> {
  const groups = new Map<string, StoreListingRecord[]>()

  for (const listing of listings) {
    if (!listing.wine_id) continue
    const group = groups.get(listing.wine_id) ?? []
    group.push(listing)
    groups.set(listing.wine_id, group)
  }

  for (const group of groups.values()) {
    group.sort((a, b) =>
      (a.stores?.name ?? '').localeCompare(b.stores?.name ?? '', undefined, {
        sensitivity: 'base',
      }),
    )
  }

  return groups
}

function formatListingPriceLabel(listing: StoreListingRecord): string {
  const store = listing.stores?.name?.trim() || 'Store'
  const price =
    listing.current_price_ksh != null ? `KES ${listing.current_price_ksh}` : '—'
  return `${store}: ${price}`
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
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#fff',
  overflow: 'hidden' as const,
}

const scrollStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  padding: '6px 8px',
}

const selectedRowStyle = {
  backgroundColor: '#e8f4ff',
  borderColor: '#6af',
}

const matchedRowStyle = {
  backgroundColor: '#f3faf3',
}

const linkedToSelectedWineStyle = {
  backgroundColor: '#fff8e6',
  borderColor: '#e6a800',
}

const perfectMatchRowStyle = {
  borderColor: '#BA1628',
  borderWidth: 2,
}

function wineMatchConfidence(wine: WineRecord): number | null {
  const value = wine.vivino_match_confidence
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function isPerfectMatch(wine: WineRecord): boolean {
  return wineMatchConfidence(wine) === 100
}

const rowStyle = {
  display: 'flex' as const,
  alignItems: 'stretch' as const,
  gap: 6,
  border: '1px solid #e8e8e8',
  borderRadius: 4,
  padding: '3px 6px',
  cursor: 'pointer' as const,
  fontSize: 12,
  lineHeight: 1.3,
  minHeight: 28,
}

const inlineLineStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex' as const,
  alignItems: 'flex-start' as const,
  flexWrap: 'wrap' as const,
  gap: '2px 0',
  color: '#333',
  wordBreak: 'break-word' as const,
}

function Pipe() {
  return (
    <span aria-hidden style={{ color: '#ccc', padding: '0 5px', userSelect: 'none', flexShrink: 0 }}>
      |
    </span>
  )
}

function isEditableKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, onActivate: () => void) {
  if (isEditableKeyTarget(event.target)) return

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onActivate()
  }
}

const STORE_PREVIEW_WINDOW_NAME = 'wine-store-preview'
const VIVINO_PREVIEW_WINDOW_NAME = 'wine-vivino-preview'

const externalLinkStyle: CSSProperties = {
  color: '#0a7',
  fontSize: 11,
  flexShrink: 0,
  marginTop: 2,
  textDecoration: 'none',
}

function openNamedPreviewWindow(url: string, windowName: string) {
  window.open(url, windowName)
}

function ExternalLink({
  href,
  label = '[Link]',
  windowName,
}: {
  href: string
  label?: string
  windowName: string
}) {
  return (
    <a
      href={href}
      style={externalLinkStyle}
      title={href}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        openNamedPreviewWindow(href, windowName)
      }}
    >
      {label}
    </a>
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

function iconActionButtonStyle(
  variant: 'primary' | 'danger' | 'default',
  enabled: boolean,
): CSSProperties {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    padding: 0,
    borderRadius: 4,
    cursor: enabled ? 'pointer' : 'not-allowed',
    flexShrink: 0,
  }

  if (variant === 'primary') {
    return {
      ...base,
      border: '1px solid #067a5c',
      background: enabled ? '#0a7' : '#d8ebe6',
      color: enabled ? '#fff' : '#4a6a62',
    }
  }

  if (variant === 'default') {
    return {
      ...base,
      border: '1px solid #bbb',
      background: enabled ? '#fff' : '#f4f4f4',
      color: enabled ? '#444' : '#bbb',
    }
  }

  return {
    ...base,
    border: '1px solid #d9a0a0',
    background: enabled ? '#fff' : '#f4f4f4',
    color: enabled ? '#c33' : '#bbb',
  }
}

const SUGGESTION_LIMIT = 10
const SUGGESTION_PANEL_MAX_HEIGHT = 520

const rowActionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
  alignSelf: 'flex-start',
  marginTop: 2,
}

const rowActionsColumnStyle: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 4,
  flexShrink: 0,
  alignSelf: 'flex-start',
  marginTop: 2,
  minWidth: 22,
}

const suggestionRowContainerStyle: CSSProperties = {
  flexShrink: 0,
  width: '100%',
  minWidth: 0,
}

const suggestionRowStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  flexShrink: 0,
  background: '#fff',
}

function formatVivinoSearchQuery(wine: Pick<WineRecord, 'producer' | 'wine_name'>): string {
  const producer = (wine.producer ?? '').trim()
  const wineName = (wine.wine_name ?? '').trim()
  return `vivino ${producer} - ${wineName}`
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <rect
        x="4"
        y="4"
        width="6.5"
        height="6.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
      />
      <path
        d="M3.5 8V2.75A.75.75 0 0 1 4.25 2h5.25"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function CopyVivinoSearchButton({ wine }: { wine: WineRecord }) {
  const query = formatVivinoSearchQuery(wine)

  return (
    <button
      type="button"
      title={`Copy search: ${query}`}
      aria-label={`Copy Vivino search: ${query}`}
      onClick={(event) => {
        event.stopPropagation()
        void navigator.clipboard.writeText(query)
      }}
      style={iconActionButtonStyle('default', true)}
    >
      <CopyIcon />
    </button>
  )
}

function VerifiedButton({
  enabled,
  onClick,
}: {
  enabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      title="Set Vivino confidence to 100"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      style={{
        ...actionButtonStyle('default', enabled),
        padding: '2px 5px',
        fontSize: 10,
        lineHeight: 1.2,
        width: '100%',
      }}
    >
      Verified
    </button>
  )
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M6 1v10M1 6h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M2.5 3.5h7M4.25 3.5V2.75h3.5V3.5M4.5 5.25v4.25M7.5 5.25v4.25M3.75 3.5l.4 6.25h3.7l.4-6.25"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function AddToWinesIconButton({
  enabled,
  busy,
  title,
  onClick,
}: {
  enabled: boolean
  busy: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      title={title}
      aria-label={busy ? 'Adding to wines' : 'Add to wines'}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      style={iconActionButtonStyle('primary', enabled)}
    >
      <PlusIcon />
    </button>
  )
}

function DeleteIconButton({
  enabled,
  title,
  onClick,
}: {
  enabled: boolean
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      style={iconActionButtonStyle('danger', enabled)}
    >
      <TrashIcon />
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
  const [storePanelCollapsed, setStorePanelCollapsed] = useState(false)
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

  const listingsByWineId = useMemo(() => groupListingsByWineId(listings), [listings])

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

  const wineRowRefs = useRef(new Map<string, HTMLDivElement>())
  const canonicalScrollRef = useRef<HTMLDivElement>(null)

  const showMatchSuggestions = Boolean(selectedListing && !selectedListing.wine_id)

  const suggestedWines = useMemo(
    () =>
      selectedListing && showMatchSuggestions
        ? suggestWineMatches(selectedListing, wines, SUGGESTION_LIMIT)
        : [],
    [selectedListing, showMatchSuggestions, wines],
  )

  useEffect(() => {
    if (!selectedListing?.wine_id || selectedWineId !== selectedListing.wine_id) return

    const container = canonicalScrollRef.current
    const row = wineRowRefs.current.get(selectedListing.wine_id)
    if (!container || !row) return

    scrollContainerToElement(container, row, MATCHED_WINE_SCROLL_MS)
  }, [selectedListing, selectedListingId, selectedWineId])

  function setWineRowRef(wineId: string, element: HTMLDivElement | null) {
    if (element) wineRowRefs.current.set(wineId, element)
    else wineRowRefs.current.delete(wineId)
  }

  function selectListing(listing: StoreListingRecord) {
    setSelectedListingId(listing.id)
    setMatchError(null)
    if (listing.wine_id) {
      setSelectedWineId(listing.wine_id)
    }
  }

  function toggleListingSelection(listing: StoreListingRecord) {
    if (selectedListingId === listing.id) {
      setSelectedListingId(null)
      setMatchError(null)
      if (listing.wine_id && selectedWineId === listing.wine_id) {
        setSelectedWineId(null)
      }
      return
    }
    selectListing(listing)
  }

  function selectWine(wine: WineRecord) {
    setSelectedWineId(wine.id)
    setMatchError(null)
  }

  function toggleWineSelection(wine: WineRecord) {
    if (selectedWineId === wine.id) {
      setSelectedWineId(null)
      setMatchError(null)
      return
    }
    selectWine(wine)
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

  async function handleDeleteListing(listing: StoreListingRecord) {
    if (busy) return
    if (!window.confirm(`Delete store listing "${listing.raw_title ?? 'listing'}"?`)) return

    setBusy(true)
    setMatchError(null)

    const result = await adminDeleteStoreListing(listing.id)

    setBusy(false)

    if (result.error) {
      setMatchError(result.error)
      return
    }

    setListings((current) => current.filter((row) => row.id !== listing.id))
    if (selectedListingId === listing.id) {
      setSelectedListingId(null)
      if (listing.wine_id && selectedWineId === listing.wine_id) {
        setSelectedWineId(null)
      }
    }
  }

  async function handleDeleteWine(wine: WineRecord) {
    if (busy) return
    if (
      !window.confirm(
        `Delete wine "${formatWineLabel(wine)}"? Matched store listings will be unmatched.`,
      )
    ) {
      return
    }

    setBusy(true)
    setMatchError(null)

    const result = await adminDeleteWine(wine.id)

    setBusy(false)

    if (result.error) {
      setMatchError(result.error)
      return
    }

    setWines((current) => current.filter((row) => row.id !== wine.id))
    setListings((current) =>
      current.map((listing) =>
        listing.wine_id === wine.id ? { ...listing, wine_id: null, wines: null } : listing,
      ),
    )
    if (selectedWineId === wine.id) {
      setSelectedWineId(null)
    }
  }

  async function saveListingField(
    listing: StoreListingRecord,
    field: StoreListingField,
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
    } else if (field === 'grape_varieties') {
      if (typeof value === 'string') {
        parsed = parseGrapeVarietiesInput(value)
      }
    } else if (field === 'vintage') {
      if (typeof value === 'string') {
        if (!value.trim()) {
          parsed = null
        } else {
          const n = Number(value)
          parsed = Number.isFinite(n) ? n : value
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
    let parsed: string | number | null = value

    if (field === 'grape_varieties') {
      parsed = parseGrapeVarietiesInput(value)
    } else if (field === 'vintage' || field === 'vivino_rating' || field === 'vivino_match_confidence') {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, width: '100%' }}>
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
        <button
          type="button"
          onClick={() => setStorePanelCollapsed((collapsed) => !collapsed)}
          style={actionButtonStyle('default', true)}
          title={storePanelCollapsed ? 'Show store listings panel' : 'Hide store listings panel'}
        >
          {storePanelCollapsed ? 'Show listings' : 'Hide listings'}
        </button>
        <span style={{ color: '#555' }}>
          {selectedListing && selectedWine
            ? `${selectedListing.raw_title ?? 'listing'} → ${formatWineLabel(selectedWine)}`
            : 'Add to wines: select unmatched listing. Match: select listing + wine.'}
        </span>
        {matchError && <span style={{ color: '#c33' }}>{matchError}</span>}
      </div>

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {!storePanelCollapsed ? (
        <section style={{ ...panelStyle, flex: 1 }}>
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
                      const isLinkedToSelectedWine =
                        selectedWineId != null && listing.wine_id === selectedWineId
                      const matchedLabel = listing.wines
                        ? formatWineLabel(listing.wines)
                        : null

                      return (
                        <div
                          key={listing.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectListing(listing)}
                          onKeyDown={(event) =>
                            handleRowKeyDown(event, () => selectListing(listing))
                          }
                          style={{
                            ...rowStyle,
                            ...(isSelected ? selectedRowStyle : {}),
                            ...(!isSelected && isLinkedToSelectedWine ? linkedToSelectedWineStyle : {}),
                            ...(!isSelected && !isLinkedToSelectedWine && isMatched
                              ? matchedRowStyle
                              : {}),
                          }}
                        >
                          <span
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleListingSelection(listing)
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                            style={{ display: 'inline-flex', flexShrink: 0, marginTop: 2 }}
                          >
                            <input
                              type="radio"
                              checked={isSelected}
                              readOnly
                              tabIndex={-1}
                              aria-label={`Select ${listing.raw_title ?? 'listing'}`}
                              style={{ margin: 0, pointerEvents: 'none' }}
                            />
                          </span>
                          <div style={inlineLineStyle}>
                            <ListingInlineField
                              listing={listing}
                              field="producer"
                              onSave={saveListingField}
                            />
                            <Pipe />
                            <ListingInlineField
                              listing={listing}
                              field="raw_title"
                              onSave={saveListingField}
                            />
                            <Pipe />
                            <ListingInlineField
                              listing={listing}
                              field="current_price_ksh"
                              display={
                                listing.current_price_ksh != null
                                  ? `KES ${listing.current_price_ksh}`
                                  : '—'
                              }
                              onSave={saveListingField}
                            />
                            <Pipe />
                            <ListingUrlField listing={listing} onSave={saveListingField} />
                            <Pipe />
                            <ListingInlineField
                              listing={listing}
                              field="vintage"
                              onSave={saveListingField}
                            />
                            <Pipe />
                            <ListingInlineField
                              listing={listing}
                              field="country"
                              onSave={saveListingField}
                            />
                            <Pipe />
                            <ListingInlineField
                              listing={listing}
                              field="region"
                              onSave={saveListingField}
                            />
                            <Pipe />
                            <ListingInlineField
                              listing={listing}
                              field="style"
                              onSave={saveListingField}
                            />
                            <Pipe />
                            <ListingInlineField
                              listing={listing}
                              field="grape_varieties"
                              display={formatGrapeVarieties(listing.grape_varieties) || '—'}
                              onSave={saveListingField}
                            />
                            <Pipe />
                            <LabeledField label="Matched">
                              <span
                                style={{
                                  color: isMatched ? '#060' : '#aaa',
                                  fontWeight: isMatched ? 500 : 400,
                                }}
                              >
                                {matchedLabel ?? '—'}
                              </span>
                            </LabeledField>
                          </div>
                          {isSelected ? (
                            <span style={rowActionsColumnStyle}>
                              <span style={rowActionsStyle}>
                                {!isMatched ? (
                                  <AddToWinesIconButton
                                    enabled={!busy}
                                    busy={busy}
                                    title={addToWinesHint}
                                    onClick={() => void handleAddListingToWines()}
                                  />
                                ) : null}
                                <DeleteIconButton
                                  enabled={!busy}
                                  title="Delete store listing"
                                  onClick={() => void handleDeleteListing(listing)}
                                />
                              </span>
                              {selectedWineId && !isMatched ? (
                                <button
                                  type="button"
                                  disabled={!canMatch}
                                  title="Match selected listing to selected wine"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleMatch()
                                  }}
                                  style={{
                                    ...actionButtonStyle('default', canMatch),
                                    padding: '3px 6px',
                                    fontSize: 11,
                                    minWidth: 22,
                                  }}
                                >
                                  Match
                                </button>
                              ) : null}
                            </span>
                          ) : null}
                          <ListingThumbnail
                            imageUrl={listing.image_url}
                            alt={listing.raw_title ?? 'Store listing'}
                          />
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
        ) : null}

        <section style={{ ...panelStyle, flex: 1 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>Canonical wines ({wines.length})</span>
              {storePanelCollapsed ? (
                <button
                  type="button"
                  onClick={() => setStorePanelCollapsed(false)}
                  style={{ padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                >
                  Show listings
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void handleAddWine()}
              style={{ padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}
            >
              Add wine
            </button>
          </header>
          {showMatchSuggestions && (
            <div
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid #b8cfe8',
                background: '#e8f0fc',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#4a6080',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: 6,
                }}
              >
                Suggested matches
              </div>
              {suggestedWines.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: '#5a6d88' }}>
                  No close matches on producer or wine name.
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    maxHeight: SUGGESTION_PANEL_MAX_HEIGHT,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '4px 6px',
                    borderRadius: 6,
                    background: '#dce8f8',
                  }}
                >
                  {suggestedWines.map((wine) => (
                    <div key={wine.id} style={suggestionRowContainerStyle}>
                      <CanonicalWineRow
                        variant="suggestion"
                        wine={wine}
                        matchedListings={listingsByWineId.get(wine.id) ?? []}
                        isSelected={wine.id === selectedWineId}
                        busy={busy}
                        onSelect={() => selectWine(wine)}
                        onToggleRadio={() => toggleWineSelection(wine)}
                        onDelete={() => void handleDeleteWine(wine)}
                        onVerify={() =>
                          void saveWineField(wine, 'vivino_match_confidence', '100')
                        }
                        onSave={saveWineField}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div ref={canonicalScrollRef} style={scrollStyle}>
            {wines.length === 0 ? (
              <p style={{ color: '#888', fontSize: 12, margin: 0 }}>No wines yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {wines.map((wine) => (
                  <CanonicalWineRow
                    key={wine.id}
                    wine={wine}
                    matchedListings={listingsByWineId.get(wine.id) ?? []}
                    isSelected={wine.id === selectedWineId}
                    busy={busy}
                    rowRef={(element) => setWineRowRef(wine.id, element)}
                    onSelect={() => selectWine(wine)}
                    onToggleRadio={() => toggleWineSelection(wine)}
                    onDelete={() => void handleDeleteWine(wine)}
                    onVerify={() => void saveWineField(wine, 'vivino_match_confidence', '100')}
                    onSave={saveWineField}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

const fieldLabelStyle: CSSProperties = {
  color: '#888',
  fontSize: 10,
  flexShrink: 0,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
        flexWrap: 'wrap',
        maxWidth: '100%',
      }}
    >
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </span>
  )
}

const listingFieldLabels: Record<
  Exclude<StoreListingField, 'in_stock'>,
  string
> = {
  producer: 'Producer',
  raw_title: 'Raw title',
  store_product_url: 'URL',
  current_price_ksh: 'Price',
  vintage: 'Vintage',
  country: 'Country',
  region: 'Region',
  style: 'Style',
  grape_varieties: 'Grapes',
}

function ListingUrlField({
  listing,
  onSave,
}: {
  listing: StoreListingRecord
  onSave: (
    listing: StoreListingRecord,
    field: StoreListingField,
    value: string | boolean | null,
  ) => Promise<{ error?: string }>
}) {
  const url = listing.store_product_url

  return (
    <LabeledField label={listingFieldLabels.store_product_url}>
      <EditableTextCell
        label="Product URL"
        inline
        noTruncate
        emptyDisplay="—"
        value={url}
        display={formatStoreUrlDirectory(url)}
        onSave={(next) => onSave(listing, 'store_product_url', next)}
      />
      {url ? <ExternalLink href={url} windowName={STORE_PREVIEW_WINDOW_NAME} /> : null}
    </LabeledField>
  )
}

function VivinoUrlField({
  wine,
  onSave,
}: {
  wine: WineRecord
  onSave: (
    wine: WineRecord,
    field: WineField,
    value: string | null,
  ) => Promise<{ error?: string }>
}) {
  const url = wine.vivino_url

  return (
    <LabeledField label={wineFieldLabels.vivino_url}>
      <EditableTextCell
        label="Vivino URL"
        inline
        noTruncate
        emptyDisplay="—"
        value={url}
        display={formatVivinoProductName(url)}
        onSave={(next) => onSave(wine, 'vivino_url', next)}
      />
      {url ? <ExternalLink href={url} windowName={VIVINO_PREVIEW_WINDOW_NAME} /> : null}
    </LabeledField>
  )
}

function ListingInlineField({
  listing,
  field,
  display,
  onSave,
}: {
  listing: StoreListingRecord
  field: Exclude<StoreListingField, 'in_stock'>
  display?: string
  onSave: (
    listing: StoreListingRecord,
    field: StoreListingField,
    value: string | boolean | null,
  ) => Promise<{ error?: string }>
}) {
  const value =
    field === 'grape_varieties'
      ? formatGrapeVarieties(listing.grape_varieties)
      : (listing[field] as string | number | null)

  return (
    <LabeledField label={listingFieldLabels[field]}>
      <EditableTextCell
        label={listingFieldLabels[field]}
        inline
        noTruncate
        emptyDisplay="—"
        value={value}
        display={display}
        onSave={(next) => onSave(listing, field, next)}
      />
    </LabeledField>
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
  vivino_match_confidence: 'Vivino confidence',
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
    <LabeledField label={wineFieldLabels[field]}>
      <EditableTextCell
        label={wineFieldLabels[field]}
        inline
        noTruncate
        emptyDisplay="—"
        value={value}
        display={display}
        onSave={(next) => onSave(wine, field, next)}
      />
    </LabeledField>
  )
}

function wineRowStyle(wine: WineRecord, isSelected: boolean): CSSProperties {
  return {
    ...rowStyle,
    ...(isSelected ? selectedRowStyle : {}),
    ...(isPerfectMatch(wine) ? perfectMatchRowStyle : {}),
  }
}

function MatchedListingPrices({ listings }: { listings: StoreListingRecord[] }) {
  if (listings.length === 0) return null

  return (
    <LabeledField label="Prices">
      <span
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: '0 6px',
        }}
      >
        {listings.map((listing, index) => (
          <span key={listing.id} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
            {index > 0 ? (
              <span aria-hidden style={{ color: '#ccc', userSelect: 'none' }}>
                |
              </span>
            ) : null}
            {listing.store_product_url ? (
              <ExternalLink
                href={listing.store_product_url}
                label={formatListingPriceLabel(listing)}
                windowName={STORE_PREVIEW_WINDOW_NAME}
              />
            ) : (
              <span style={{ fontSize: 11, color: '#333' }}>
                {formatListingPriceLabel(listing)}
              </span>
            )}
          </span>
        ))}
      </span>
    </LabeledField>
  )
}

function CanonicalWineFields({
  wine,
  matchedListings,
  onSave,
}: {
  wine: WineRecord
  matchedListings: StoreListingRecord[]
  onSave: (
    wine: WineRecord,
    field: WineField,
    value: string | null,
  ) => Promise<{ error?: string }>
}) {
  return (
    <>
      <WineInlineField wine={wine} field="producer" onSave={onSave} />
      <Pipe />
      <WineInlineField wine={wine} field="wine_name" onSave={onSave} />
      <Pipe />
      <WineInlineField wine={wine} field="vintage" onSave={onSave} />
      <Pipe />
      <WineInlineField wine={wine} field="country" onSave={onSave} />
      <Pipe />
      <WineInlineField wine={wine} field="region" onSave={onSave} />
      <Pipe />
      <WineInlineField wine={wine} field="style" onSave={onSave} />
      <Pipe />
      <WineInlineField
        wine={wine}
        field="grape_varieties"
        display={formatGrapeVarieties(wine.grape_varieties) || '—'}
        onSave={onSave}
      />
      <Pipe />
      <VivinoUrlField wine={wine} onSave={onSave} />
      <Pipe />
      <WineInlineField wine={wine} field="vivino_rating" onSave={onSave} />
      <Pipe />
      <WineInlineField wine={wine} field="vivino_match_confidence" onSave={onSave} />
      {matchedListings.length > 0 ? (
        <>
          <Pipe />
          <MatchedListingPrices listings={matchedListings} />
        </>
      ) : null}
    </>
  )
}

function CanonicalWineRow({
  wine,
  matchedListings,
  isSelected,
  busy,
  variant = 'list',
  rowRef,
  onSelect,
  onToggleRadio,
  onDelete,
  onVerify,
  onSave,
}: {
  wine: WineRecord
  matchedListings: StoreListingRecord[]
  isSelected: boolean
  busy: boolean
  variant?: 'list' | 'suggestion'
  rowRef?: (element: HTMLDivElement | null) => void
  onSelect: () => void
  onToggleRadio: () => void
  onDelete: () => void
  onVerify: () => void
  onSave: (
    wine: WineRecord,
    field: WineField,
    value: string | null,
  ) => Promise<{ error?: string }>
}) {
  const radio = (
    <span
      onClick={(event) => {
        event.stopPropagation()
        onToggleRadio()
      }}
      onKeyDown={(event) => event.stopPropagation()}
      style={{ display: 'inline-flex', flexShrink: 0, marginTop: 2 }}
    >
      <input
        type="radio"
        checked={isSelected}
        readOnly
        tabIndex={-1}
        aria-label={`Select ${formatWineLabel(wine)}`}
        style={{ margin: 0, pointerEvents: 'none' }}
      />
    </span>
  )

  const deleteAction = isSelected ? (
    <DeleteIconButton enabled={!busy} title="Delete wine" onClick={onDelete} />
  ) : null

  const rowActions = (
    <span style={rowActionsColumnStyle}>
      <span style={rowActionsStyle}>
        <CopyVivinoSearchButton wine={wine} />
        {deleteAction}
      </span>
      <VerifiedButton enabled={!busy} onClick={onVerify} />
    </span>
  )

  const thumbnail = (
    <ListingThumbnail
      imageUrl={firstListingImageUrl(matchedListings)}
      alt={formatWineLabel(wine)}
    />
  )

  if (variant === 'suggestion') {
    return (
      <div
        ref={rowRef}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => handleRowKeyDown(event, onSelect)}
        style={{
          ...wineRowStyle(wine, isSelected),
          ...suggestionRowStyle,
        }}
      >
        {radio}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={inlineLineStyle}>
            <CanonicalWineFields wine={wine} matchedListings={matchedListings} onSave={onSave} />
          </div>
          {rowActions}
        </div>
        {thumbnail}
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => handleRowKeyDown(event, onSelect)}
      style={wineRowStyle(wine, isSelected)}
    >
      {radio}
      <div style={inlineLineStyle}>
        <CanonicalWineFields wine={wine} matchedListings={matchedListings} onSave={onSave} />
      </div>
      {rowActions}
      {thumbnail}
    </div>
  )
}
