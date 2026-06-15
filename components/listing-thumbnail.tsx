'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'

const THUMB_WIDTH = 28
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

const thumbWrapStyle: CSSProperties = {
  flexShrink: 0,
  width: THUMB_WIDTH,
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 4,
  minHeight: 28,
}

const thumbButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  minHeight: 28,
  padding: 0,
  border: '1px solid #e0e0e0',
  borderRadius: 3,
  background: '#fafafa',
  cursor: 'zoom-in',
  overflow: 'hidden',
}

const thumbImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  maxHeight: 48,
  objectFit: 'contain',
}

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

type ListingThumbnailProps = {
  imageUrl: string | null | undefined
  alt: string
}

export function ListingThumbnail({ imageUrl, alt }: ListingThumbnailProps) {
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
    if (!src || !loaded || failed) return
    setPreview(placePreview(event.clientX, event.clientY))
  }

  function hidePreview() {
    setPreview(null)
  }

  if (!src) {
    return null
  }

  return (
    <>
      <div ref={containerRef} style={thumbWrapStyle}>
        <button
          type="button"
          aria-label={`Preview image for ${alt}`}
          style={thumbButtonStyle}
          onClick={(event) => event.stopPropagation()}
          onMouseEnter={showPreview}
          onMouseMove={showPreview}
          onMouseLeave={hidePreview}
        >
          {shouldLoad ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                ...thumbImageStyle,
                visibility: loaded && !failed ? 'visible' : 'hidden',
              }}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          ) : null}
          {shouldLoad && !loaded && !failed ? (
            <span style={{ fontSize: 9, color: '#aaa' }}>…</span>
          ) : null}
          {failed ? <span style={{ fontSize: 9, color: '#c88' }}>!</span> : null}
        </button>
      </div>

      {mounted && preview && loaded && !failed
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

export function firstListingImageUrl(listings: Array<{ image_url?: string | null }>): string | null {
  for (const listing of listings) {
    const url = listing.image_url?.trim()
    if (url) return url
  }
  return null
}
