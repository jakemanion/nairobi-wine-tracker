'use client'

import {
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { placeImagePreviewNearCursor } from '@/components/listing-thumbnail'

const PREVIEW_MAX_WIDTH = 320
const PREVIEW_MAX_HEIGHT = 480

const previewShellStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 10000,
  pointerEvents: 'none',
  padding: 10,
  background: '#1A1A22',
  border: '1px solid #3A3848',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.65)',
}

const previewImageStyle: CSSProperties = {
  display: 'block',
  maxWidth: PREVIEW_MAX_WIDTH,
  maxHeight: PREVIEW_MAX_HEIGHT,
  width: 'auto',
  height: 'auto',
  objectFit: 'contain',
}

type PreviewBottleImageProps = {
  src: string | null | undefined
  alt: string
}

export function PreviewBottleImage({ src, alt }: PreviewBottleImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [preview, setPreview] = useState<{ left: number; top: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  const imageSrc = src?.trim() || null

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
    setPreview(null)
  }, [imageSrc])

  function showPreview(event: ReactMouseEvent) {
    if (!imageSrc || !loaded || failed) return
    setPreview(placeImagePreviewNearCursor(event.clientX, event.clientY))
  }

  function hidePreview() {
    setPreview(null)
  }

  if (!imageSrc) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: '#1A1A20', color: '#484858', fontSize: 10 }}
      >
        No image
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Preview bottle image for ${alt}`}
        className="absolute inset-0 w-full h-full p-0 border-0 cursor-zoom-in overflow-hidden"
        style={{ background: '#1A1A20' }}
        onMouseEnter={showPreview}
        onMouseMove={showPreview}
        onMouseLeave={hidePreview}
      >
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-center"
          style={{ visibility: loaded && !failed ? 'visible' : 'hidden' }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
        {!loaded && !failed ? (
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: '#484858', fontSize: 10 }}
          >
            …
          </span>
        ) : null}
        {failed ? (
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: '#6A4040', fontSize: 10 }}
          >
            !
          </span>
        ) : null}
      </button>

      {mounted && preview && loaded && !failed
        ? createPortal(
            <div style={{ ...previewShellStyle, left: preview.left, top: preview.top }}>
              <img src={imageSrc} alt={alt} style={previewImageStyle} />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
