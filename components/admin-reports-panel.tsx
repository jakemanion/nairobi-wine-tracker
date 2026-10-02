'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import {
  deleteWineReport,
  listAdminStoresForFilter,
  listAdminWineReports,
  reopenWineReport,
  resolveWineReport,
  type ListAdminWineReportsFilters,
} from '@/app/admin/report-actions'
import {
  WINE_REPORT_ISSUE_LABELS,
  WINE_REPORT_ISSUE_TYPES,
  type WineReportIssueType,
} from '@/lib/reports/constants'
import type { WineReportAdminRow } from '@/lib/reports/types'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function wineLabel(report: WineReportAdminRow): string {
  const producer = report.wine_producer?.trim()
  const name = report.wine_name?.trim()
  const vintage =
    report.wine_vintage != null && String(report.wine_vintage).trim()
      ? String(report.wine_vintage).trim()
      : null
  const base = [producer, name].filter(Boolean).join(' ') || 'Unknown wine'
  return vintage ? `${base} (${vintage})` : base
}

function previewText(value: string | null, max = 80): string {
  if (!value) return '—'
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

type StatusFilter = 'open' | 'resolved' | 'all'

export function AdminReportsPanel() {
  const [status, setStatus] = useState<StatusFilter>('open')
  const [issueType, setIssueType] = useState<WineReportIssueType | 'all'>('all')
  const [storeId, setStoreId] = useState<string | 'all'>('all')
  const [page, setPage] = useState(1)
  const [reports, setReports] = useState<WineReportAdminRow[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const selected = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? null,
    [reports, selectedId],
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const filters: ListAdminWineReportsFilters = {
        status,
        issueType,
        storeId,
        page,
        pageSize: 25,
      }
      const result = await listAdminWineReports(filters)
      if (cancelled) return

      if (result.error) {
        setError(result.error)
        setReports([])
        setTotal(0)
        setLoading(false)
        return
      }

      setError(null)
      setReports(result.reports)
      setTotal(result.total)
      setPageSize(result.pageSize)
      setLoading(false)
      setSelectedId((current) =>
        current && !result.reports.some((row) => row.id === current) ? null : current,
      )
    })()

    return () => {
      cancelled = true
    }
  }, [issueType, page, status, storeId])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const result = await listAdminStoresForFilter()
      if (cancelled || result.error) return
      setStores(result.stores)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function reloadReports() {
    setLoading(true)
    setError(null)
    const result = await listAdminWineReports({
      status,
      issueType,
      storeId,
      page,
      pageSize: 25,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      setReports([])
      setTotal(0)
      return
    }
    setReports(result.reports)
    setTotal(result.total)
    setPageSize(result.pageSize)
  }

  async function handleResolve() {
    if (!selected || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    setActionMessage(null)
    const result = await resolveWineReport({
      reportId: selected.id,
      resolutionNote,
    })
    setActionBusy(false)
    if (result.error || !result.report) {
      setActionError(result.error ?? 'Failed to resolve report.')
      return
    }
    setActionMessage('Report marked as resolved.')
    setResolutionNote('')
    await reloadReports()
  }

  async function handleReopen() {
    if (!selected || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    setActionMessage(null)
    const result = await reopenWineReport({ reportId: selected.id })
    setActionBusy(false)
    if (result.error || !result.report) {
      setActionError(result.error ?? 'Failed to reopen report.')
      return
    }
    setActionMessage('Report reopened.')
    await reloadReports()
  }

  async function handleDelete() {
    if (!selected || actionBusy) return
    if (!window.confirm('Delete this report permanently?')) return
    setActionBusy(true)
    setActionError(null)
    setActionMessage(null)
    const result = await deleteWineReport({ reportId: selected.id })
    setActionBusy(false)
    if (result.error) {
      setActionError(result.error)
      return
    }
    setSelectedId(null)
    setActionMessage('Report deleted.')
    await reloadReports()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          fontSize: 12,
        }}
      >
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Status
          <select
            value={status}
            onChange={(event) => {
              setLoading(true)
              setPage(1)
              setStatus(event.target.value as StatusFilter)
            }}
            style={{ fontSize: 12, padding: '2px 4px' }}
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Issue
          <select
            value={issueType}
            onChange={(event) => {
              setLoading(true)
              setPage(1)
              setIssueType(event.target.value as WineReportIssueType | 'all')
            }}
            style={{ fontSize: 12, padding: '2px 4px' }}
          >
            <option value="all">All categories</option>
            {WINE_REPORT_ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {WINE_REPORT_ISSUE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Store
          <select
            value={storeId}
            onChange={(event) => {
              setLoading(true)
              setPage(1)
              setStoreId(event.target.value)
            }}
            style={{ fontSize: 12, padding: '2px 4px' }}
          >
            <option value="all">All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>

        <span style={{ color: '#666', marginLeft: 'auto' }}>
          {total} report{total === 1 ? '' : 's'}
        </span>
      </div>

      {error ? <p style={{ color: '#c05050', margin: 0, fontSize: 13 }}>{error}</p> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.9fr)',
          gap: 10,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 4,
            overflow: 'auto',
            background: '#fff',
            minHeight: 0,
          }}
        >
          {loading ? (
            <p style={{ margin: 12, fontSize: 13, color: '#666' }}>Loading reports…</p>
          ) : reports.length === 0 ? (
            <p style={{ margin: 12, fontSize: 13, color: '#888' }}>
              No reports match these filters.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f6f6f8', textAlign: 'left' }}>
                  <th style={thStyle}>Wine</th>
                  <th style={thStyle}>Store</th>
                  <th style={thStyle}>Issue</th>
                  <th style={thStyle}>Details</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Submitted</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const isSelected = report.id === selectedId
                  return (
                    <tr
                      key={report.id}
                      onClick={() => {
                        setSelectedId(report.id)
                        setActionError(null)
                        setActionMessage(null)
                        setResolutionNote(report.resolution_note ?? '')
                      }}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? '#e8f4ec' : undefined,
                        borderTop: '1px solid #eee',
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{wineLabel(report)}</div>
                        {report.wine_id ? (
                          <Link
                            href={`/admin?wine=${encodeURIComponent(report.wine_id)}`}
                            onClick={(event) => event.stopPropagation()}
                            style={{ color: '#0a7', fontSize: 11 }}
                          >
                            Edit wine
                          </Link>
                        ) : (
                          <span style={{ color: '#999', fontSize: 11 }}>Wine removed</span>
                        )}
                      </td>
                      <td style={tdStyle}>{report.store_name ?? '—'}</td>
                      <td style={tdStyle}>
                        {WINE_REPORT_ISSUE_LABELS[report.issue_type] ?? report.issue_type}
                      </td>
                      <td style={tdStyle}>{previewText(report.description)}</td>
                      <td style={tdStyle}>{report.reporter_display_name ?? 'User'}</td>
                      <td style={tdStyle}>{formatDate(report.created_at)}</td>
                      <td style={tdStyle}>
                        <StatusBadge status={report.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <aside
          style={{
            border: '1px solid #ddd',
            borderRadius: 4,
            background: '#fff',
            padding: 12,
            overflow: 'auto',
            minHeight: 0,
            fontSize: 12,
          }}
        >
          {!selected ? (
            <p style={{ margin: 0, color: '#888' }}>Select a report to view details.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15 }}>{wineLabel(selected)}</h2>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <DetailRow label="Issue">
                {WINE_REPORT_ISSUE_LABELS[selected.issue_type] ?? selected.issue_type}
              </DetailRow>
              <DetailRow label="Description">
                {selected.description?.trim() || '—'}
              </DetailRow>
              <DetailRow label="Reporter">
                {selected.reporter_display_name ?? selected.user_id}
              </DetailRow>
              <DetailRow label="Submitted">{formatDate(selected.created_at)}</DetailRow>
              <DetailRow label="Store">{selected.store_name ?? '—'}</DetailRow>
              <DetailRow label="Listing price">
                {selected.listing_price_ksh != null
                  ? Number(selected.listing_price_ksh).toLocaleString('en-KE')
                  : '—'}
              </DetailRow>

              <div>
                <div style={detailLabelStyle}>Snapshot at submission</div>
                <pre
                  style={{
                    margin: '4px 0 0',
                    padding: 8,
                    background: '#f7f7f9',
                    borderRadius: 4,
                    fontSize: 11,
                    overflow: 'auto',
                    maxHeight: 140,
                  }}
                >
                  {JSON.stringify(selected.listing_snapshot, null, 2)}
                </pre>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selected.wine_id ? (
                  <Link
                    href={`/admin?wine=${encodeURIComponent(selected.wine_id)}`}
                    style={linkButtonStyle}
                  >
                    Open wine in matcher
                  </Link>
                ) : null}
                {selected.store_listing_id ? (
                  <span style={{ color: '#666', fontSize: 11, alignSelf: 'center' }}>
                    Listing id: {selected.store_listing_id.slice(0, 8)}…
                  </span>
                ) : null}
              </div>

              {selected.status === 'resolved' ? (
                <>
                  <DetailRow label="Resolved">{formatDate(selected.resolved_at)}</DetailRow>
                  <DetailRow label="Resolved by">
                    {selected.resolver_display_name ?? selected.resolved_by ?? '—'}
                  </DetailRow>
                  <DetailRow label="Resolution note">
                    {selected.resolution_note?.trim() || '—'}
                  </DetailRow>
                </>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={detailLabelStyle}>Resolution note (optional)</span>
                  <textarea
                    value={resolutionNote}
                    onChange={(event) => setResolutionNote(event.target.value)}
                    rows={3}
                    disabled={actionBusy}
                    style={{
                      fontSize: 12,
                      padding: 6,
                      borderRadius: 4,
                      border: '1px solid #ccc',
                      resize: 'vertical',
                    }}
                  />
                </label>
              )}

              {actionError ? (
                <p style={{ margin: 0, color: '#c05050' }} role="alert">
                  {actionError}
                </p>
              ) : null}
              {actionMessage ? (
                <p style={{ margin: 0, color: '#0a7' }} role="status">
                  {actionMessage}
                </p>
              ) : null}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selected.status === 'open' ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleResolve()}
                    style={primaryButtonStyle}
                  >
                    Mark as resolved
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleReopen()}
                    style={secondaryButtonStyle}
                  >
                    Reopen
                  </button>
                )}
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleDelete()}
                  style={dangerButtonStyle}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: '#555',
        }}
      >
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => {
            setLoading(true)
            setPage((current) => Math.max(1, current - 1))
          }}
          style={{ fontSize: 12, padding: '2px 8px', cursor: page <= 1 ? 'default' : 'pointer' }}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => {
            setLoading(true)
            setPage((current) => current + 1)
          }}
          style={{
            fontSize: 12,
            padding: '2px 8px',
            cursor: page >= totalPages ? 'default' : 'pointer',
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const open = status === 'open'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: open ? '#fff3cd' : '#e8f5e9',
        color: open ? '#7a5b00' : '#1b5e20',
        border: `1px solid ${open ? '#e6c200' : '#a5d6a7'}`,
      }}
    >
      {open ? 'Open' : 'Resolved'}
    </span>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={detailLabelStyle}>{label}</div>
      <div style={{ marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{children}</div>
    </div>
  )
}

const thStyle: CSSProperties = {
  padding: '8px 8px',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: '#555',
  position: 'sticky',
  top: 0,
  background: '#f6f6f8',
  zIndex: 1,
}

const tdStyle: CSSProperties = {
  padding: '8px',
  verticalAlign: 'top',
}

const detailLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#888',
}

const linkButtonStyle: CSSProperties = {
  color: '#0a7',
  fontSize: 12,
  textDecoration: 'none',
}

const primaryButtonStyle: CSSProperties = {
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
  background: '#007B33',
  color: '#fff',
  border: '1px solid #007B33',
  borderRadius: 4,
}

const secondaryButtonStyle: CSSProperties = {
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
  background: '#fff',
  color: '#333',
  border: '1px solid #ccc',
  borderRadius: 4,
}

const dangerButtonStyle: CSSProperties = {
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
  background: '#fff',
  color: '#b00020',
  border: '1px solid #e0a0a8',
  borderRadius: 4,
}
