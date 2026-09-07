'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Loader2, RefreshCw, X } from 'lucide-react'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import {
  getMySharedList,
  regenerateSharedListSlug,
  upsertSharedList,
  type SharedListConfig,
} from '@/lib/share/shared-list-actions'
import {
  BUILTIN_SHARE_COLLECTIONS,
  DEFAULT_SHARE_COLLECTION_KEYS,
} from '@/lib/share/collection-keys'

type ShareListsModalProps = {
  open: boolean
  onClose: () => void
}

function buildShareUrl(slug: string): string {
  if (typeof window === 'undefined') return `/share/${slug}`
  return `${window.location.origin}/share/${slug}`
}

function selectionChanged(selected: string[], configKeys: string[]): boolean {
  if (selected.length !== configKeys.length) return true
  const known = new Set(configKeys)
  return selected.some((key) => !known.has(key))
}

export function ShareListsModal({ open, onClose }: ShareListsModalProps) {
  const { colors } = usePreviewTheme()
  const [mounted, setMounted] = useState(false)
  const [selected, setSelected] = useState<string[]>(DEFAULT_SHARE_COLLECTION_KEYS)
  const [config, setConfig] = useState<SharedListConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [awaitingLink, setAwaitingLink] = useState(false)
  const [saving, setSaving] = useState(false)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    setError(null)
    setCopied(false)
    setSelected(DEFAULT_SHARE_COLLECTION_KEYS)
    setConfig(null)
    setAwaitingLink(true)

    let cancelled = false

    void (async () => {
      const sharedResult = await getMySharedList()
      if (cancelled) return

      if (sharedResult.error) {
        setError(sharedResult.error)
        setAwaitingLink(false)
        return
      }

      if (sharedResult.config) {
        setConfig(sharedResult.config)
        const known = new Set(DEFAULT_SHARE_COLLECTION_KEYS)
        const fromConfig = sharedResult.config.collectionKeys.filter((key) => known.has(key))
        setSelected(fromConfig.length > 0 ? fromConfig : DEFAULT_SHARE_COLLECTION_KEYS)
        setAwaitingLink(false)
        return
      }

      const created = await upsertSharedList(selectedRef.current)
      if (cancelled) return

      if (created.error || !created.config) {
        setError(created.error ?? 'Failed to generate share link.')
        setAwaitingLink(false)
        return
      }

      setConfig(created.config)
      setSelected(created.config.collectionKeys)
      setAwaitingLink(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  async function persistSelection(nextSelected: string[]) {
    if (!config || nextSelected.length === 0) return
    if (!selectionChanged(nextSelected, config.collectionKeys)) return

    setSaving(true)
    setError(null)
    const result = await upsertSharedList(nextSelected)
    setSaving(false)

    if (result.error || !result.config) {
      setError(result.error ?? 'Failed to save selection.')
      return
    }

    setConfig(result.config)
    setSelected(result.config.collectionKeys)
  }

  function toggleKey(key: string) {
    setSelected((current) => {
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      void persistSelection(next)
      return next
    })
  }

  async function regenerate() {
    setError(null)
    setCopied(false)
    setAwaitingLink(true)
    setConfig(null)

    const saved = await upsertSharedList(selectedRef.current)
    if (saved.error || !saved.config) {
      setError(saved.error ?? 'Failed to update collections.')
      setAwaitingLink(false)
      return
    }

    const result = await regenerateSharedListSlug()
    if (result.error || !result.config) {
      setError(result.error ?? 'Failed to regenerate share link.')
      // Restore previous config from save so the user is not left blank.
      setConfig(saved.config)
      setAwaitingLink(false)
      return
    }

    setConfig(result.config)
    setSelected(result.config.collectionKeys)
    setAwaitingLink(false)
  }

  async function copyLink() {
    if (!config) return
    const url = buildShareUrl(config.slug)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy link. Select and copy it manually.')
    }
  }

  if (!mounted || !open) return null

  const shareUrl = config ? buildShareUrl(config.slug) : null
  const busy = awaitingLink || saving

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-lists-title"
    >
      <button
        type="button"
        aria-label="Close share dialog"
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.62)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-xl p-5"
        style={{
          background: colors.toolbarBg,
          border: `1px solid ${colors.toolbarBorder}`,
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
        }}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute top-3 right-3 inline-flex items-center justify-center rounded-sm hover:opacity-80"
          style={{ color: colors.muted, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onClose}
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <h2
          id="share-lists-title"
          className="m-0 text-lg font-semibold pr-8"
          style={{ color: colors.headerTitle, fontFamily: colors.headingFont }}
        >
          Share your wine list
        </h2>
        <p
          className="m-0 mt-2 text-[12px] leading-relaxed"
          style={{ color: colors.headerSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Choose which collections to include in a read-only shared link.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {BUILTIN_SHARE_COLLECTIONS.map((option) => {
            const checked = selected.includes(option.key)
            return (
              <label
                key={option.key}
                className="flex items-center gap-2.5 cursor-pointer"
                style={{
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  opacity: awaitingLink ? 0.7 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={awaitingLink || (selected.length === 1 && checked)}
                  onChange={() => toggleKey(option.key)}
                  className="accent-current"
                  style={{ accentColor: colors.accent }}
                />
                <span className="text-[13px]" style={{ color: colors.searchText }}>
                  {option.label}
                </span>
              </label>
            )
          })}
        </div>

        {awaitingLink ? (
          <div
            className="mt-4 rounded-lg p-3 flex items-center gap-2.5"
            style={{
              background: colors.searchBg,
              border: `1px solid ${colors.searchBorder}`,
            }}
            role="status"
            aria-live="polite"
          >
            <Loader2
              size={16}
              strokeWidth={2}
              className="animate-spin flex-shrink-0"
              style={{ color: colors.accent }}
              aria-hidden
            />
            <span
              className="text-[13px]"
              style={{ color: colors.searchText, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              Generating unique link
            </span>
          </div>
        ) : null}

        {shareUrl ? (
          <div
            className="mt-4 rounded-lg p-3 flex flex-col gap-2.5"
            style={{
              background: colors.searchBg,
              border: `1px solid ${colors.searchBorder}`,
            }}
          >
            <p
              className="m-0 text-[10px] uppercase tracking-wider"
              style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              Public link
            </p>
            <p
              className="m-0 text-[12px] break-all leading-snug"
              style={{ color: colors.searchText, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {shareUrl}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg text-[12px]"
                style={{
                  background: colors.buttonBg,
                  border: `1px solid ${colors.buttonBorder}`,
                  color: colors.buttonText,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  padding: '7px 10px',
                  cursor: 'pointer',
                }}
                onClick={() => void copyLink()}
              >
                {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={2} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg text-[12px]"
                style={{
                  background: colors.buttonBg,
                  border: `1px solid ${colors.buttonBorder}`,
                  color: colors.buttonText,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  padding: '7px 10px',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                }}
                onClick={() => void regenerate()}
              >
                <RefreshCw size={13} strokeWidth={2} />
                Regenerate Link
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="m-0 mt-3 text-[12px]" style={{ color: '#F08080' }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
