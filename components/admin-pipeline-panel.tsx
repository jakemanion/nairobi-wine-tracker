'use client'

import Link from 'next/link'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ORPHAN_BREAKDOWN_LABELS,
  lineageFromSnapshot,
  resolvePipelineChain,
  type OrphanBreakdownKind,
  type OrphanWineRow,
  type PipelineExceptionQueues,
  type PipelineFunnel,
  type PipelineLineageSnapshot,
  type RelinkCandidate,
} from '@/lib/pipeline-lineage'
import { formatWineLabel } from '@/lib/wines'

type QueueKey = keyof PipelineExceptionQueues

const QUEUE_META: { key: QueueKey; label: string }[] = [
  { key: 'orphanWines', label: 'Orphan wines' },
  { key: 'stuckImports', label: 'Stuck imports' },
  { key: 'doneButUnlinked', label: 'Done but unlinked' },
  { key: 'brokenImportLinks', label: 'Broken import links' },
  { key: 'unmatchedListings', label: 'Unmatched listings' },
  { key: 'fieldDrift', label: 'Field drift' },
]

type Focus =
  | { kind: 'import'; id: string }
  | { kind: 'listing'; id: string }
  | { kind: 'wine'; id: string }
  | null

function queueCount(queues: PipelineExceptionQueues, key: QueueKey): number {
  return queues[key].length
}

function truncate(value: string | null | undefined, max = 72): string {
  const text = (value ?? '').trim()
  if (!text) return '—'
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function storeLabel(row: { stores?: { name?: string | null } | null } | null | undefined): string {
  return row?.stores?.name?.trim() || '—'
}

const shellStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  overflow: 'hidden',
}

const cardStyle: CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#fff',
  padding: '10px 12px',
}

const tabStyle = (active: boolean): CSSProperties => ({
  padding: '6px 10px',
  fontSize: 12,
  border: `1px solid ${active ? '#0a7' : '#ccc'}`,
  borderRadius: 6,
  background: active ? '#e8f7f1' : '#fafafa',
  color: active ? '#066' : '#333',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
})

const rowStyle = (active: boolean): CSSProperties => ({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 10px',
  border: 'none',
  borderBottom: '1px solid #eee',
  background: active ? '#eef8f4' : 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 1.35,
})

const funnelChipStyle = (active: boolean, alert = false): CSSProperties => ({
  display: 'inline-flex',
  flexDirection: 'column',
  gap: 2,
  padding: '8px 10px',
  borderRadius: 6,
  border: `1px solid ${active ? '#0a7' : alert ? '#e6c200' : '#ddd'}`,
  background: active ? '#e8f7f1' : alert ? '#fff8e1' : '#fafafa',
  cursor: 'pointer',
  minWidth: 92,
})

function FunnelChip({
  label,
  value,
  active,
  alert,
  onClick,
}: {
  label: string
  value: number
  active?: boolean
  alert?: boolean
  onClick?: () => void
}) {
  return (
    <button type="button" style={funnelChipStyle(Boolean(active), alert)} onClick={onClick}>
      <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 650, color: alert && value > 0 ? '#8a6d00' : '#222' }}>
        {value}
      </span>
    </button>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 650, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {children}
    </div>
  )
}

function ChainNode({
  title,
  subtitle,
  body,
  tone = 'default',
}: {
  title: string
  subtitle?: string
  body: ReactNode
  tone?: 'default' | 'warn' | 'ok' | 'missing'
}) {
  const border =
    tone === 'warn'
      ? '#e6c200'
      : tone === 'ok'
        ? '#81c995'
        : tone === 'missing'
          ? '#e8a0a0'
          : '#ddd'
  const bg =
    tone === 'warn'
      ? '#fff8e1'
      : tone === 'ok'
        ? '#eef8f0'
        : tone === 'missing'
          ? '#fff1f1'
          : '#fafafa'

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 6, background: bg, padding: '8px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 12 }}>{title}</strong>
        {subtitle ? <span style={{ fontSize: 11, color: '#666' }}>{subtitle}</span> : null}
      </div>
      <div style={{ fontSize: 12, color: '#333' }}>{body}</div>
    </div>
  )
}

function CandidateList({ candidates }: { candidates: RelinkCandidate[] }) {
  if (candidates.length === 0) {
    return <span style={{ color: '#888' }}>No fuzzy candidates</span>
  }
  return (
    <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
      {candidates.map((candidate) => (
        <li key={`${candidate.kind}-${candidate.id}`} style={{ marginBottom: 2 }}>
          <span style={{ color: '#666' }}>{candidate.kind}</span>
          {' · '}
          {truncate(candidate.title, 48)}
          {candidate.storeName ? ` (${candidate.storeName})` : ''}
          <span style={{ color: '#888' }}> · score {candidate.score}</span>
        </li>
      ))}
    </ul>
  )
}

function OrphanBadge({ kind }: { kind: OrphanBreakdownKind }) {
  const alert =
    kind === 'listing_deleted' ||
    kind === 'link_cleared_or_promote_failed' ||
    kind === 'rematched_away' ||
    kind === 'blank_add_wine'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: alert ? '#fff3cd' : '#eee',
        color: alert ? '#664d00' : '#444',
      }}
    >
      {ORPHAN_BREAKDOWN_LABELS[kind]}
    </span>
  )
}

function FunnelBar({
  funnel,
  activeQueue,
  onSelectQueue,
}: {
  funnel: PipelineFunnel
  activeQueue: QueueKey
  onSelectQueue: (key: QueueKey) => void
}) {
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionTitle>Pipeline funnel</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888', width: 56 }}>Imports</span>
          <FunnelChip label="Total" value={funnel.importsTotal} />
          <FunnelChip
            label="No listing link"
            value={funnel.importsWithoutListingLink}
            alert={funnel.importsWithoutListingLink > 0}
            active={activeQueue === 'stuckImports' || activeQueue === 'doneButUnlinked'}
            onClick={() => onSelectQueue('stuckImports')}
          />
          <FunnelChip label="Done" value={funnel.importsDone} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888', width: 56 }}>Shop</span>
          <FunnelChip label="Total" value={funnel.listingsTotal} />
          <FunnelChip
            label="Unlinked"
            value={funnel.listingsUnlinked}
            alert={funnel.listingsUnlinked > 0}
            active={activeQueue === 'unmatchedListings'}
            onClick={() => onSelectQueue('unmatchedListings')}
          />
          <FunnelChip label="Linked" value={funnel.listingsLinked} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888', width: 56 }}>Canonical</span>
          <FunnelChip label="Total" value={funnel.winesTotal} />
          <FunnelChip label="With listings" value={funnel.winesWithListings} />
          <FunnelChip
            label="Orphans"
            value={funnel.winesOrphan}
            alert={funnel.winesOrphan > 0}
            active={activeQueue === 'orphanWines'}
            onClick={() => onSelectQueue('orphanWines')}
          />
          <FunnelChip label="Verified" value={funnel.winesVerified} />
          <FunnelChip label="On site" value={funnel.winesOnSite} />
        </div>
      </div>
    </div>
  )
}

function QueueList({
  queueKey,
  queues,
  focus,
  onFocus,
}: {
  queueKey: QueueKey
  queues: PipelineExceptionQueues
  focus: Focus
  onFocus: (focus: Focus) => void
}) {
  if (queueKey === 'orphanWines') {
    const rows = queues.orphanWines
    if (rows.length === 0) return <EmptyQueue message="No orphan wines." />
    return (
      <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        {rows.map((row) => (
          <OrphanRow
            key={row.wine.id}
            row={row}
            active={focus?.kind === 'wine' && focus.id === row.wine.id}
            onSelect={() => onFocus({ kind: 'wine', id: row.wine.id })}
          />
        ))}
      </div>
    )
  }

  if (queueKey === 'stuckImports' || queueKey === 'doneButUnlinked' || queueKey === 'brokenImportLinks') {
    const rows = queues[queueKey]
    if (rows.length === 0) return <EmptyQueue message="No rows in this queue." />
    return (
      <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            style={rowStyle(focus?.kind === 'import' && focus.id === row.id)}
            onClick={() => onFocus({ kind: 'import', id: row.id })}
          >
            <div style={{ fontWeight: 600 }}>{truncate(row.raw_title)}</div>
            <div style={{ color: '#666' }}>
              {storeLabel(row)} · status {row.status ?? '—'}
              {row.matched_store_listing_id
                ? ` · listing ${row.matched_store_listing_id.slice(0, 8)}…`
                : ' · no listing link'}
            </div>
          </button>
        ))}
      </div>
    )
  }

  if (queueKey === 'unmatchedListings') {
    const rows = queues.unmatchedListings
    if (rows.length === 0) return <EmptyQueue message="No unmatched listings." />
    return (
      <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            style={rowStyle(focus?.kind === 'listing' && focus.id === row.id)}
            onClick={() => onFocus({ kind: 'listing', id: row.id })}
          >
            <div style={{ fontWeight: 600 }}>{truncate(row.raw_title)}</div>
            <div style={{ color: '#666' }}>
              {storeLabel(row)}
              {row.producer ? ` · ${row.producer}` : ''}
            </div>
          </button>
        ))}
      </div>
    )
  }

  const rows = queues.fieldDrift
  if (rows.length === 0) return <EmptyQueue message="No field drift on linked imports." />
  return (
    <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
      {rows.map((row) => (
        <button
          key={row.importRow.id}
          type="button"
          style={rowStyle(focus?.kind === 'import' && focus.id === row.importRow.id)}
          onClick={() => onFocus({ kind: 'import', id: row.importRow.id })}
        >
          <div style={{ fontWeight: 600 }}>{truncate(row.importRow.raw_title)}</div>
          <div style={{ color: '#666' }}>
            {storeLabel(row.importRow)} · differs: {row.diffFields.join(', ')}
          </div>
        </button>
      ))}
    </div>
  )
}

function EmptyQueue({ message }: { message: string }) {
  return (
    <div style={{ padding: 16, color: '#888', fontSize: 13 }}>{message}</div>
  )
}

function OrphanRow({
  row,
  active,
  onSelect,
}: {
  row: OrphanWineRow
  active: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" style={rowStyle(active)} onClick={onSelect}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <span style={{ fontWeight: 600 }}>{formatWineLabel(row.wine)}</span>
        <OrphanBadge kind={row.breakdown} />
      </div>
      <div style={{ color: '#666', marginTop: 2 }}>{truncate(row.evidence, 110)}</div>
    </button>
  )
}

function ChainInspector({
  snapshot,
  focus,
}: {
  snapshot: PipelineLineageSnapshot
  focus: Focus
}) {
  const lineage = useMemo(() => lineageFromSnapshot(snapshot), [snapshot])
  const chain = useMemo(() => {
    if (!focus) return null
    return resolvePipelineChain(lineage, {
      importId: focus.kind === 'import' ? focus.id : null,
      listingId: focus.kind === 'listing' ? focus.id : null,
      wineId: focus.kind === 'wine' ? focus.id : null,
    })
  }, [lineage, focus])

  if (!focus || !chain) {
    return (
      <div style={{ ...cardStyle, flex: 1, minHeight: 0, overflow: 'auto' }}>
        <SectionTitle>Chain inspector</SectionTitle>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#888' }}>
          Select a queue row to inspect import → listing → wine.
        </p>
      </div>
    )
  }

  const listingTone =
    chain.listingStatus === 'missing'
      ? 'missing'
      : chain.listingStatus === 'unlinked' || chain.listingStatus === 'other_wine'
        ? 'warn'
        : chain.listing
          ? 'ok'
          : 'default'

  return (
    <div
      style={{
        ...cardStyle,
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <SectionTitle>Chain inspector</SectionTitle>
        {chain.wine ? (
          <Link href={`/admin?wine=${chain.wine.id}`} style={{ color: '#0a7', fontSize: 12, textDecoration: 'none' }}>
            Open in Matcher →
          </Link>
        ) : null}
      </div>

      <ChainNode
        title="Import"
        subtitle={chain.importRow ? `status ${chain.importRow.status ?? '—'}` : undefined}
        tone={chain.importRow ? 'ok' : 'default'}
        body={
          chain.importRow ? (
            <>
              <div>{truncate(chain.importRow.raw_title, 100)}</div>
              <div style={{ color: '#666' }}>
                {storeLabel(chain.importRow)}
                {chain.importRow.current_price_ksh != null
                  ? ` · KES ${chain.importRow.current_price_ksh}`
                  : ''}
              </div>
            </>
          ) : (
            <span style={{ color: '#888' }}>None linked</span>
          )
        }
      />

      <div style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>↓</div>

      <ChainNode
        title="Store listing"
        subtitle={
          chain.listingStatus === 'missing'
            ? 'MISSING'
            : chain.listingStatus === 'unlinked'
              ? 'UNLINKED'
              : chain.listingStatus === 'other_wine'
                ? 'OTHER WINE'
                : chain.listingStatus === 'none'
                  ? 'NONE'
                  : undefined
        }
        tone={listingTone}
        body={
          chain.listing ? (
            <>
              <div>{truncate(chain.listing.raw_title, 100)}</div>
              <div style={{ color: '#666' }}>
                {storeLabel(chain.listing)}
                {chain.listing.wine_id
                  ? ` · wine ${chain.listing.wine_id.slice(0, 8)}…`
                  : ' · wine_id null'}
              </div>
            </>
          ) : chain.listingStatus === 'missing' ? (
            <span style={{ color: '#a33' }}>
              Import points at deleted listing{' '}
              {chain.importRow?.matched_store_listing_id
                ? `${chain.importRow.matched_store_listing_id.slice(0, 8)}…`
                : ''}
            </span>
          ) : (
            <span style={{ color: '#888' }}>No store listing in chain</span>
          )
        }
      />

      <div style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>↓</div>

      <ChainNode
        title="Canonical wine"
        subtitle={chain.orphan ? ORPHAN_BREAKDOWN_LABELS[chain.orphan.breakdown] : undefined}
        tone={chain.orphan ? 'warn' : chain.wine ? 'ok' : 'default'}
        body={
          chain.wine ? (
            <>
              <div>{formatWineLabel(chain.wine)}</div>
              <div style={{ color: '#666' }}>
                confidence {chain.wine.vivino_match_confidence ?? '—'}
                {' · '}
                {chain.wine.show_on_site ? 'on site' : 'hidden'}
              </div>
              {chain.orphan ? (
                <div style={{ marginTop: 6 }}>
                  <div style={{ color: '#664d00' }}>{chain.orphan.evidence}</div>
                  <div style={{ marginTop: 6 }}>
                    <strong style={{ fontSize: 11 }}>Candidate re-links</strong>
                    <CandidateList candidates={chain.orphan.candidates} />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <span style={{ color: '#888' }}>Not linked to a canonical wine</span>
          )
        }
      />
    </div>
  )
}

export function AdminPipelinePanel({ snapshot }: { snapshot: PipelineLineageSnapshot }) {
  const [activeQueue, setActiveQueue] = useState<QueueKey>('orphanWines')
  const [focus, setFocus] = useState<Focus>(null)

  function selectQueue(key: QueueKey) {
    setActiveQueue(key)
    setFocus(null)
  }

  return (
    <div style={shellStyle}>
      <FunnelBar funnel={snapshot.funnel} activeQueue={activeQueue} onSelectQueue={selectQueue} />

      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}>
        <div
          style={{
            ...cardStyle,
            flex: 1.35,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              padding: '10px 12px 0',
            }}
          >
            {QUEUE_META.map(({ key, label }) => {
              const count = queueCount(snapshot.queues, key)
              return (
                <button
                  key={key}
                  type="button"
                  style={tabStyle(activeQueue === key)}
                  onClick={() => selectQueue(key)}
                >
                  {label}
                  <span style={{ marginLeft: 4, color: count > 0 ? '#8a6d00' : '#888' }}>({count})</span>
                </button>
              )
            })}
          </div>

          <QueueList
            queueKey={activeQueue}
            queues={snapshot.queues}
            focus={focus}
            onFocus={setFocus}
          />
        </div>

        <div style={{ flex: 1, minWidth: 280, minHeight: 0, display: 'flex' }}>
          <ChainInspector snapshot={snapshot} focus={focus} />
        </div>
      </div>
    </div>
  )
}
