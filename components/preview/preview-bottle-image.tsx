'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import { placeImagePreviewLeftOfCursor } from '@/lib/preview/image-preview-position'

const previewImageStyle: CSSProperties = {
  display: 'block',
  width: 'auto',
  height: 'auto',
  objectFit: 'contain',
}

type PreviewBottleImageProps = {
  src: string | null | undefined
  alt: string
  priority?: boolean
}

export function PreviewBottleImage({ src, alt, priority = false }: PreviewBottleImageProps) {
  const { colors } = usePreviewTheme()
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [preview, setPreview] = useState<ReturnType<typeof placeImagePreviewLeftOfCursor> | null>(
    null,
  )
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

  useEffect(() => {
    const img = imgRef.current
    if (!img || !imageSrc) return
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true)
      setFailed(false)
    }
  }, [imageSrc])

  function showPreview(event: ReactMouseEvent) {
    if (!imageSrc || !loaded || failed) return
    setPreview(placeImagePreviewLeftOfCursor(event.clientX, event.clientY))
  }

  function hidePreview() {
    setPreview(null)
  }

  const previewShellStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 10000,
    pointerEvents: 'none',
    padding: 10,
    background: colors.previewShellBg,
    border: `1px solid ${colors.previewShellBorder}`,
    borderRadius: 10,
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
  }

  if (!imageSrc) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: colors.imageColumnBg, color: colors.muted, fontSize: 10 }}
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
        style={{ background: colors.imageColumnBg }}
        onMouseEnter={showPreview}
        onMouseMove={showPreview}
        onMouseLeave={hidePreview}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className="w-full h-full object-cover object-center"
          style={{ opacity: loaded && !failed ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
        {!loaded && !failed ? (
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: colors.muted, fontSize: 10 }}
          >
            …
          </span>
        ) : null}
        {failed ? (
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: '#c05050', fontSize: 10 }}
          >
            !
          </span>
        ) : null}
      </button>

      {mounted && preview && loaded && !failed
        ? createPortal(
            <div style={{ ...previewShellStyle, left: preview.left, top: preview.top }}>
              <img
                src={imageSrc}
                alt={alt}
                style={{
                  ...previewImageStyle,
                  maxWidth: preview.maxWidth,
                  maxHeight: preview.maxHeight,
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
