'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Link2, RefreshCw, X } from 'lucide-react'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import {
  getMySharedList,
  listShareableCollections,
  regenerateSharedListSlug,
  upsertSharedList,
  type SharedListConfig,
} from '@/lib/share/shared-list-actions'
import type { ShareableCollectionOption } from '@/lib/share/collection-keys'

type ShareListsModalProps = {
  open: boolean
  onClose: () => void
}

function buildShareUrl(slug: string): string {
  if (typeof window === 'undefined') return `/share/${slug}`
  return `${window.location.origin}/share/${slug}`
}

export function ShareListsModal({ open, onClose }: ShareListsModalProps) {
  const { colors } = usePreviewTheme()
  const [mounted, setMounted] = useState(false)
  const [options, setOptions] = useState<ShareableCollectionOption[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [config, setConfig] = useState<SharedListConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    setError(null)
    setCopied(false)
    startTransition(async () => {
      const [collectionsResult, sharedResult] = await Promise.all([
        listShareableCollections(),
        getMySharedList(),
      ])

      if (collectionsResult.error) setError(collectionsResult.error)
      setOptions(collectionsResult.options)

      if (sharedResult.error) setError(sharedResult.error)
      if (sharedResult.config) {
        setConfig(sharedResult.config)
        setSelected(sharedResult.config.collectionKeys)
      } else {
        setConfig(null)
        setSelected([])
      }
    })
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  function toggleKey(key: string) {
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  function generate() {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await upsertSharedList(selected)
      if (result.error || !result.config) {
        setError(result.error ?? 'Failed to generate share link.')
        return
      }
      setConfig(result.config)
      setSelected(result.config.collectionKeys)
    })
  }

  function regenerate() {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      // Persist current checkbox selection, then rotate the slug.
      const saved = await upsertSharedList(selected)
      if (saved.error || !saved.config) {
        setError(saved.error ?? 'Failed to update collections.')
        return
      }
      const result = await regenerateSharedListSlug()
      if (result.error || !result.config) {
        setError(result.error ?? 'Failed to regenerate share link.')
        return
      }
      setConfig(result.config)
      setSelected(result.config.collectionKeys)
    })
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
          style={{ color: colors.headerTitle, fontFamily: 'var(--font-playfair), serif' }}
        >
          Share my wines
        </h2>
        <p
          className="m-0 mt-2 text-[12px] leading-relaxed"
          style={{ color: colors.headerSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Choose which collections you would like to include in a read-only shared link.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {options.map((option) => {
            const checked = selected.includes(option.key)
            return (
              <label
                key={option.key}
                className="flex items-center gap-2.5 cursor-pointer"
                style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
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

        <button
          type="button"
          disabled={pending || selected.length === 0}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium"
          style={{
            background: selected.length === 0 ? colors.buttonBg : colors.accent,
            border: `1px solid ${selected.length === 0 ? colors.buttonBorder : colors.accent}`,
            color: selected.length === 0 ? colors.buttonText : '#FFFFFF',
            borderRadius: colors.panelRadius,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            padding: '10px 14px',
            cursor: pending || selected.length === 0 ? 'default' : 'pointer',
            opacity: pending ? 0.7 : 1,
          }}
          onClick={generate}
        >
          <Link2 size={15} strokeWidth={2} />
          {config ? 'Update Share Link' : 'Generate Share Link'}
        </button>

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
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg text-[12px]"
                style={{
                  background: colors.buttonBg,
                  border: `1px solid ${colors.buttonBorder}`,
                  color: colors.buttonText,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  padding: '7px 10px',
                  cursor: pending ? 'default' : 'pointer',
                  opacity: pending ? 0.7 : 1,
                }}
                onClick={regenerate}
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
