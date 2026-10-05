'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { PreviewWineCard } from '@/components/preview/preview-wine-card'
import type { WineReview, WineRow } from '@/components/wine-table'
import type { PreviewWineCardData } from '@/lib/preview/wine-card-model'

/** First few visible rows may eager-load bottle images; keep low for mobile bandwidth. */
export const EAGER_IMAGE_COUNT = 5

const OVERSCAN = 8
/**
 * Initial height guess before measureElement runs (excludes gap).
 * Prefer slightly tall over short: short estimates cause overlaps until measured.
 */
const ESTIMATED_CARD_HEIGHT_MOBILE = 220
const ESTIMATED_CARD_HEIGHT_DESKTOP = 168

type PreviewVirtualWineListProps = {
  previewWines: PreviewWineCardData[]
  winesById: Map<string, WineRow>
  isLoggedIn: boolean
  isAdmin?: boolean
  userId: string
  /** Vertical gap between cards (matches former space-y utility). */
  gapPx: number
  /** Change when filters/search/sort change so scroll resets to the top. */
  resetKey: string
  onReviewChange: (wineId: string, review: WineReview | null) => void
  reportedWineIds?: ReadonlySet<string>
}

function documentOffsetTop(node: HTMLElement): number {
  const rect = node.getBoundingClientRect()
  return rect.top + window.scrollY
}

/**
 * Remount on resetKey so filter/search/sort changes get a fresh virtualizer
 * (no stale index→size cache) without wiping measurements on every update.
 */
export function PreviewVirtualWineList(props: PreviewVirtualWineListProps) {
  return <PreviewVirtualWineListInner key={props.resetKey} {...props} />
}

function PreviewVirtualWineListInner({
  previewWines,
  winesById,
  isLoggedIn,
  isAdmin = false,
  userId,
  gapPx,
  onReviewChange,
  reportedWineIds,
}: PreviewVirtualWineListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const cardGapPx = gapPx

  useLayoutEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  useLayoutEffect(() => {
    const node = listRef.current
    if (!node) return

    const updateMargin = () => {
      setScrollMargin(documentOffsetTop(node))
    }

    updateMargin()

    // Observe layout above the list, not the list itself — the list height is
    // owned by the virtualizer and changes constantly as rows measure.
    const observer = new ResizeObserver(updateMargin)
    if (node.parentElement) observer.observe(node.parentElement)
    window.addEventListener('resize', updateMargin)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateMargin)
    }
  }, [])

  const getItemKey = useCallback(
    (index: number) => previewWines[index]?.id ?? index,
    [previewWines],
  )

  const virtualizer = useWindowVirtualizer({
    count: previewWines.length,
    estimateSize: () =>
      typeof window !== 'undefined' && window.innerWidth < 640
        ? ESTIMATED_CARD_HEIGHT_MOBILE
        : ESTIMATED_CARD_HEIGHT_DESKTOP,
    overscan: OVERSCAN,
    scrollMargin,
    gap: cardGapPx,
    getItemKey,
  })

  if (previewWines.length === 0) return null

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={listRef}
      style={{
        height: virtualizer.getTotalSize(),
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const wine = previewWines[virtualRow.index]
        if (!wine) return null
        const source = winesById.get(wine.id)

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
            }}
          >
            <PreviewWineCard
              wine={wine}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              userId={userId}
              review={isLoggedIn ? source?.review : undefined}
              imagePriority={virtualRow.index < EAGER_IMAGE_COUNT}
              hasOpenReport={reportedWineIds?.has(wine.id) ?? false}
              onReviewChange={(review) => onReviewChange(wine.id, review)}
            />
          </div>
        )
      })}
    </div>
  )
}
