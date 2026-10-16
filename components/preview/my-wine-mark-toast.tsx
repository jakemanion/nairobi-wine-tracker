'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { WineReview } from '@/components/wine-table'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'
import { myWineMarkingLabel } from '@/lib/preview/my-wine-mark-label'
import {
  saveReviewField,
  saveReviewTriedStatusField,
  saveReviewWishlistField,
  type HideValue,
  type TriedStatusValue,
  type WishlistValue,
} from '@/lib/reviews'
import { passesMyWineToggles, type WineFilters } from '@/lib/wine-filters'

const TOAST_DURATION_MS = 5000

export type MyWineMarkNotifyInput = {
  wineId: string
  wineName: string
  previousReview: WineReview | null
  nextReview: WineReview
  /** Override label; defaults to status of nextReview. */
  markingLabel?: string
}

type ToastState = {
  id: number
  wineId: string
  wineName: string
  markingLabel: string
  hiddenByFilters: boolean
  previousReview: WineReview | null
  nextReview: WineReview
}

type MyWineMarkToastContextValue = {
  notifyMark: (input: MyWineMarkNotifyInput) => void
  toast: ToastState | null
  dismiss: () => void
  undo: () => void
  undoing: boolean
}

const MyWineMarkToastContext = createContext<MyWineMarkToastContextValue | null>(null)

function normalizeWishlist(value: number | null | undefined): WishlistValue {
  if (value != null && value >= 1) return 1
  if (value === 0) return 0
  return null
}

function normalizeTried(value: number | null | undefined): TriedStatusValue {
  if (value === 1) return 1
  if (value === 2 || value === 3) return 2
  return null
}

function normalizeHide(value: boolean | null | undefined): HideValue {
  if (value === true) return true
  if (value === false) return false
  return null
}

export function MyWineMarkToastProvider({
  userId,
  filters,
  onReviewRestored,
  children,
}: {
  userId: string
  filters: WineFilters
  onReviewRestored: (wineId: string, review: WineReview | null) => void
  children: ReactNode
}) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [undoing, setUndoing] = useState(false)
  const toastIdRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast(null)
    setUndoing(false)
  }, [])

  const notifyMark = useCallback(
    (input: MyWineMarkNotifyInput) => {
      const hiddenByFilters = !passesMyWineToggles(
        {
          id: input.wineId,
          producer: null,
          wine_name: input.wineName,
          vintage: null,
          country: null,
          region: null,
          grape_varieties: null,
          style: null,
          vivino_url: null,
          vivino_rating: null,
          review: input.nextReview,
        },
        filters,
      )
      const id = ++toastIdRef.current
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      setUndoing(false)
      setToast({
        id,
        wineId: input.wineId,
        wineName: input.wineName,
        markingLabel: input.markingLabel ?? myWineMarkingLabel(input.nextReview),
        hiddenByFilters,
        previousReview: input.previousReview,
        nextReview: input.nextReview,
      })
      timerRef.current = window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current))
        timerRef.current = null
      }, TOAST_DURATION_MS)
    },
    [filters],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const undo = useCallback(() => {
    if (!toast || undoing) return
    const snapshot = toast
    void (async () => {
      setUndoing(true)
      const prev = snapshot.previousReview
      const next = snapshot.nextReview
      const reviewId = next.id !== 'pending' ? next.id : prev?.id
      let restored: WineReview | null = prev

      try {
        const prevWishlist = normalizeWishlist(prev?.wishlist)
        const nextWishlist = normalizeWishlist(next.wishlist)
        if (prevWishlist !== nextWishlist) {
          const result = await saveReviewWishlistField({
            userId,
            wineId: snapshot.wineId,
            reviewId,
            value: prevWishlist,
          })
          if (result.error || !result.review) {
            setUndoing(false)
            return
          }
          restored = result.review
        }

        const prevTried = normalizeTried(prev?.tried_status)
        const nextTried = normalizeTried(next.tried_status)
        if (prevTried !== nextTried) {
          const result = await saveReviewTriedStatusField({
            userId,
            wineId: snapshot.wineId,
            reviewId: restored?.id ?? reviewId,
            value: prevTried,
          })
          if (result.error || !result.review) {
            setUndoing(false)
            return
          }
          restored = result.review
        }

        const prevHide = normalizeHide(prev?.hide)
        const nextHide = normalizeHide(next.hide)
        if (prevHide !== nextHide) {
          const result = await saveReviewField({
            userId,
            wineId: snapshot.wineId,
            reviewId: restored?.id ?? reviewId,
            field: 'hide',
            value: prevHide,
          })
          if (result.error || !result.review) {
            setUndoing(false)
            return
          }
          restored = result.review
        }

        onReviewRestored(snapshot.wineId, restored)
        dismiss()
      } catch {
        setUndoing(false)
      }
    })()
  }, [toast, undoing, userId, onReviewRestored, dismiss])

  const value = useMemo(
    () => ({ notifyMark, toast, dismiss, undo, undoing }),
    [notifyMark, toast, dismiss, undo, undoing],
  )

  return (
    <MyWineMarkToastContext.Provider value={value}>{children}</MyWineMarkToastContext.Provider>
  )
}

export function useMyWineMarkToast(): MyWineMarkToastContextValue | null {
  return useContext(MyWineMarkToastContext)
}

/** Notify when a mark changes; no-ops outside the provider (e.g. logged out). */
export function useNotifyMyWineMark(): (input: MyWineMarkNotifyInput) => void {
  const ctx = useMyWineMarkToast()
  return useCallback(
    (input: MyWineMarkNotifyInput) => {
      ctx?.notifyMark(input)
    },
    [ctx],
  )
}

export function MyWineMarkToastView({
  className = '',
}: {
  className?: string
}) {
  const ctx = useMyWineMarkToast()
  if (!ctx?.toast) return null

  const { toast, undo, undoing, dismiss } = ctx
  const message = toast.hiddenByFilters
    ? `${toast.wineName} marked as ${toast.markingLabel} and has been hidden based on your filters.`
    : `${toast.wineName} marked as ${toast.markingLabel}.`

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex max-w-md items-center gap-2 rounded-md px-2.5 py-1.5 shadow-md ${className}`}
      style={{
        background: BRAND_GREEN,
        color: '#FFFFFF',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        fontSize: 11,
        lineHeight: 1.35,
      }}
    >
      <p className="m-0 min-w-0 flex-1">{message}</p>
      <button
        type="button"
        disabled={undoing}
        onClick={undo}
        className="flex-shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold"
        style={{
          background: 'rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.65)',
          color: '#FFFFFF',
          cursor: undoing ? 'wait' : 'pointer',
          opacity: undoing ? 0.75 : 1,
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}
      >
        {undoing ? 'Undoing…' : 'Undo'}
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="flex-shrink-0 text-[14px] leading-none"
        style={{
          background: 'none',
          border: 'none',
          color: '#FFFFFF',
          cursor: 'pointer',
          opacity: 0.85,
          padding: '0 2px',
        }}
      >
        ×
      </button>
    </div>
  )
}

/** Mobile slot under the sticky header — renders nothing when idle. */
export function MobileMyWineMarkToastSlot({ maxWidth }: { maxWidth: string }) {
  const ctx = useMyWineMarkToast()
  if (!ctx?.toast) return null
  return (
    <div className="mx-auto w-full px-3 pb-2 sm:hidden" style={{ maxWidth }}>
      <MyWineMarkToastView />
    </div>
  )
}
