'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { PreviewWineCard } from '@/components/preview/preview-wine-card'
import type { WineReview, WineRow } from '@/components/wine-table'
import type { PreviewWineCardData } from '@/lib/preview/wine-card-model'

/** First few visible rows may eager-load bottle images; keep low for mobile bandwidth. */
export const EAGER_IMAGE_COUNT = 5

const OVERSCAN = 8
/** Typical card height before measureElement runs (excludes gap). Mobile stacks the review panel, so estimate a bit taller. */
const ESTIMATED_CARD_HEIGHT = 168

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

export function PreviewVirtualWineList({
  previewWines,
  winesById,
  isLoggedIn,
  isAdmin = false,
  userId,
  gapPx,
  resetKey,
  onReviewChange,
  reportedWineIds,
}: PreviewVirtualWineListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const node = listRef.current
    if (!node) return

    const updateMargin = () => {
      const rect = node.getBoundingClientRect()
      setScrollMargin(rect.top + window.scrollY)
    }

    updateMargin()

    const observer = new ResizeObserver(updateMargin)
    observer.observe(node)
    if (node.parentElement) observer.observe(node.parentElement)
    window.addEventListener('resize', updateMargin)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateMargin)
    }
  }, [previewWines.length, resetKey])

  const virtualizer = useWindowVirtualizer({
    count: previewWines.length,
    estimateSize: () => ESTIMATED_CARD_HEIGHT + gapPx,
    overscan: OVERSCAN,
    scrollMargin,
  })

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [resetKey])

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
            key={wine.id}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              paddingBottom: virtualRow.index < previewWines.length - 1 ? gapPx : 0,
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
