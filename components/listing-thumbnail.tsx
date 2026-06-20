'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'

const THUMB_DIMENSIONS = {
  default: { width: 28, minHeight: 28, maxImageHeight: 48 },
  large: { width: 56, minHeight: 56, maxImageHeight: 96 },
} as const

const PREVIEW_MAX_WIDTH = 280
const PREVIEW_MAX_HEIGHT = 420

function placePreview(clientX: number, clientY: number) {
  const gap = 18
  let left = clientX + gap
  let top = clientY - PREVIEW_MAX_HEIGHT / 2

  if (left + PREVIEW_MAX_WIDTH > window.innerWidth - 12) {
    left = clientX - PREVIEW_MAX_WIDTH - gap
  }
  if (left < 12) left = 12

  if (top < 12) top = 12
  if (top + PREVIEW_MAX_HEIGHT > window.innerHeight - 12) {
    top = window.innerHeight - PREVIEW_MAX_HEIGHT - 12
  }

  return { left, top }
}

export { placePreview as placeImagePreviewNearCursor }

const previewShellStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 10000,
  pointerEvents: 'none',
  padding: 8,
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 8,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
}

const previewImageStyle: CSSProperties = {
  display: 'block',
  maxWidth: PREVIEW_MAX_WIDTH,
  maxHeight: PREVIEW_MAX_HEIGHT,
  width: 'auto',
  height: 'auto',
  objectFit: 'contain',
}

type ThumbnailSize = keyof typeof THUMB_DIMENSIONS

function thumbStyles(size: ThumbnailSize) {
  const dims = THUMB_DIMENSIONS[size]
  return {
    wrap: {
      flexShrink: 0,
      width: dims.width,
      alignSelf: 'stretch',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
      minHeight: dims.minHeight,
    } satisfies CSSProperties,
    button: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      minHeight: dims.minHeight,
      padding: 0,
      border: '1px solid #e0e0e0',
      borderRadius: 3,
      background: '#fafafa',
      cursor: 'zoom-in',
      overflow: 'hidden',
    } satisfies CSSProperties,
    image: {
      display: 'block',
      width: '100%',
      height: '100%',
      maxHeight: dims.maxImageHeight,
      objectFit: 'contain',
    } satisfies CSSProperties,
  }
}

type ListingThumbnailProps = {
  imageUrl: string | null | undefined
  alt: string
  size?: ThumbnailSize
  showHoverPreview?: boolean
  onLoadStateChange?: (state: { loaded: boolean; failed: boolean }) => void
}

export function ListingThumbnail({
  imageUrl,
  alt,
  size = 'default',
  showHoverPreview = true,
  onLoadStateChange,
}: ListingThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [preview, setPreview] = useState<{ left: number; top: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  const src = imageUrl?.trim() || null

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
    setShouldLoad(false)
    setPreview(null)
  }, [src])

  useEffect(() => {
    const element = containerRef.current
    if (!element || !src) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '160px 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [src])

  function showPreview(event: ReactMouseEvent) {
    if (!showHoverPreview || !src || !loaded || failed) return
    setPreview(placePreview(event.clientX, event.clientY))
  }

  function hidePreview() {
    if (!showHoverPreview) return
    setPreview(null)
  }

  if (!src) {
    return null
  }

  const styles = thumbStyles(size)

  return (
    <>
      <div ref={containerRef} style={styles.wrap}>
        <button
          type="button"
          aria-label={`Preview image for ${alt}`}
          style={styles.button}
          onClick={(event) => event.stopPropagation()}
          onMouseEnter={showHoverPreview ? showPreview : undefined}
          onMouseMove={showHoverPreview ? showPreview : undefined}
          onMouseLeave={showHoverPreview ? hidePreview : undefined}
        >
          {shouldLoad ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                ...styles.image,
                visibility: loaded && !failed ? 'visible' : 'hidden',
              }}
              onLoad={() => {
                setLoaded(true)
                onLoadStateChange?.({ loaded: true, failed: false })
              }}
              onError={() => {
                setFailed(true)
                onLoadStateChange?.({ loaded: false, failed: true })
              }}
            />
          ) : null}
          {shouldLoad && !loaded && !failed ? (
            <span style={{ fontSize: 9, color: '#aaa' }}>…</span>
          ) : null}
          {failed ? <span style={{ fontSize: 9, color: '#c88' }}>!</span> : null}
        </button>
      </div>

      {mounted && showHoverPreview && preview && loaded && !failed
        ? createPortal(
            <div style={{ ...previewShellStyle, left: preview.left, top: preview.top }}>
              <img src={src} alt={alt} style={previewImageStyle} />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export function CursorImagePreview({
  src,
  alt,
  position,
}: {
  src: string
  alt: string
  position: { left: number; top: number }
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div style={{ ...previewShellStyle, left: position.left, top: position.top }}>
      <img src={src} alt={alt} style={previewImageStyle} />
    </div>,
    document.body,
  )
}

export function firstListingImageUrl(listings: Array<{ image_url?: string | null }>): string | null {
  for (const listing of listings) {
    const url = listing.image_url?.trim()
    if (url) return url
  }
  return null
}
