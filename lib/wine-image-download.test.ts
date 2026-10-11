import { describe, expect, it } from 'vitest'
import {
  detectImageFormat,
  validateDownloadedImage,
  validateLocalImageBytes,
} from '@/lib/wine-image-download'

function jpegBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size)
  bytes[0] = 0xff
  bytes[1] = 0xd8
  bytes[2] = 0xff
  bytes[3] = 0xe0
  return bytes
}

function pngBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size)
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < sig.length; i += 1) bytes[i] = sig[i]!
  return bytes
}

function avifBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size)
  // Minimal ftypavif header (size=32)
  bytes[0] = 0x00
  bytes[1] = 0x00
  bytes[2] = 0x00
  bytes[3] = 0x20
  const ftyp = 'ftypavif'
  for (let i = 0; i < ftyp.length; i += 1) bytes[4 + i] = ftyp.charCodeAt(i)
  return bytes
}

describe('detectImageFormat', () => {
  it('detects jpeg, png, and avif signatures', () => {
    expect(detectImageFormat(jpegBytes())?.mime).toBe('image/jpeg')
    expect(detectImageFormat(pngBytes())?.mime).toBe('image/png')
    expect(detectImageFormat(avifBytes())?.mime).toBe('image/avif')
  })

  it('rejects unknown bytes', () => {
    expect(detectImageFormat(new Uint8Array(64).fill(0))).toBeNull()
  })
})

describe('validateDownloadedImage', () => {
  it('accepts a valid jpeg', () => {
    const result = validateDownloadedImage({
      bytes: jpegBytes(),
      contentType: 'image/jpeg',
      status: 200,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.format.extension).toBe('jpg')
  })

  it('rejects HTML error pages', () => {
    const html = new TextEncoder().encode(
      '<!DOCTYPE html><html><body>Blocked</body></html>',
    )
    const padded = new Uint8Array(64)
    padded.set(html)
    const result = validateDownloadedImage({
      bytes: padded,
      contentType: 'text/html',
      status: 200,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.toLowerCase()).toMatch(/html/)
  })

  it('rejects zero-byte and http errors', () => {
    expect(
      validateDownloadedImage({ bytes: new Uint8Array(0), contentType: null, status: 200 }).ok,
    ).toBe(false)
    expect(
      validateDownloadedImage({ bytes: jpegBytes(), contentType: 'image/jpeg', status: 403 }).ok,
    ).toBe(false)
  })

  it('rejects content-type / signature mismatch', () => {
    const result = validateDownloadedImage({
      bytes: jpegBytes(),
      contentType: 'image/png',
      status: 200,
    })
    expect(result.ok).toBe(false)
  })

  it('accepts generic octet-stream when signature is valid', () => {
    const result = validateDownloadedImage({
      bytes: jpegBytes(),
      contentType: 'application/octet-stream',
      status: 200,
    })
    expect(result.ok).toBe(true)
  })
})

describe('validateLocalImageBytes', () => {
  it('accepts jpeg without content-type', () => {
    const result = validateLocalImageBytes(jpegBytes())
    expect(result.ok).toBe(true)
  })

  it('rejects unrecognized bytes', () => {
    const result = validateLocalImageBytes(new Uint8Array(64).fill(0))
    expect(result.ok).toBe(false)
  })
})
