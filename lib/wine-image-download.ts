/**
 * Pure validation helpers for retailer image downloads.
 * Used by the migration script; safe to unit-test without network I/O.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MIN_IMAGE_BYTES = 32

export type DetectedImageFormat = {
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/avif'
  extension: 'jpg' | 'png' | 'webp' | 'gif' | 'avif'
}

export type ImageValidationResult =
  | { ok: true; format: DetectedImageFormat }
  | { ok: false; error: string }

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

function bytesEqual(bytes: Uint8Array, offset: number, ascii: string): boolean {
  if (offset + ascii.length > bytes.length) return false
  for (let i = 0; i < ascii.length; i += 1) {
    if (bytes[offset + i] !== ascii.charCodeAt(i)) return false
  }
  return true
}

function looksLikeHtml(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 256))
  const text = new TextDecoder('utf-8', { fatal: false }).decode(sample).toLowerCase()
  return (
    text.includes('<!doctype html') ||
    text.includes('<html') ||
    text.includes('<head') ||
    text.includes('<body')
  )
}

export function detectImageFormat(bytes: Uint8Array): DetectedImageFormat | null {
  if (bytes.length < 12) return null

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' }
  }

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: 'image/png', extension: 'png' }
  }

  // GIF
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { mime: 'image/gif', extension: 'gif' }
  }

  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', extension: 'webp' }
  }

  // AVIF (ISO BMFF): ....ftypavif / ....ftypavis, or compatible brand in ftyp box
  if (bytesEqual(bytes, 4, 'ftyp')) {
    const major = bytes.subarray(8, 12)
    const majorBrand = String.fromCharCode(...major)
    if (majorBrand === 'avif' || majorBrand === 'avis') {
      return { mime: 'image/avif', extension: 'avif' }
    }
    // Scan compatible brands in the ftyp box (box size at bytes 0-3, big-endian)
    const boxSize =
      ((bytes[0] ?? 0) << 24) |
      ((bytes[1] ?? 0) << 16) |
      ((bytes[2] ?? 0) << 8) |
      (bytes[3] ?? 0)
    const end = Math.min(bytes.length, boxSize > 0 ? boxSize : bytes.length)
    for (let i = 16; i + 4 <= end; i += 4) {
      const brand = String.fromCharCode(
        bytes[i]!,
        bytes[i + 1]!,
        bytes[i + 2]!,
        bytes[i + 3]!,
      )
      if (brand === 'avif' || brand === 'avis') {
        return { mime: 'image/avif', extension: 'avif' }
      }
    }
  }

  return null
}

export function normalizeContentType(contentType: string | null | undefined): string | null {
  if (!contentType) return null
  const mime = contentType.split(';')[0]?.trim().toLowerCase()
  if (!mime) return null
  if (mime === 'image/jpg') return 'image/jpeg'
  return mime
}

/** Allowed extensions for local bulk upload (case-insensitive). */
export const LOCAL_UPLOAD_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'avif',
])

export function extensionFromFilename(fileName: string): string | null {
  const base = fileName.split(/[/\\]/).pop() ?? fileName
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return null
  return base.slice(dot + 1).toLowerCase()
}

/**
 * Validate bytes already on disk (no HTTP Content-Type).
 * Rejects GIF for local upload even though download migration accepts it.
 */
export function validateLocalImageBytes(bytes: Uint8Array): ImageValidationResult {
  const validated = validateDownloadedImage({
    bytes,
    contentType: null,
    status: 200,
  })
  if (!validated.ok) return validated
  if (validated.format.extension === 'gif') {
    return { ok: false, error: 'GIF is not supported for local upload' }
  }
  return validated
}

export function validateDownloadedImage(args: {
  bytes: Uint8Array
  contentType: string | null
  status: number
}): ImageValidationResult {
  if (args.status < 200 || args.status >= 300) {
    return { ok: false, error: `HTTP ${args.status}` }
  }

  if (args.bytes.length === 0) {
    return { ok: false, error: 'Empty response body (0 bytes)' }
  }

  if (args.bytes.length < MIN_IMAGE_BYTES) {
    return { ok: false, error: `File too small (${args.bytes.length} bytes)` }
  }

  if (args.bytes.length > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `File too large (${args.bytes.length} bytes; max ${MAX_IMAGE_BYTES})`,
    }
  }

  if (looksLikeHtml(args.bytes)) {
    return { ok: false, error: 'Response looks like HTML, not an image' }
  }

  const format = detectImageFormat(args.bytes)
  if (!format) {
    return { ok: false, error: 'Unsupported or unrecognized image file signature' }
  }

  const declared = normalizeContentType(args.contentType)
  if (declared) {
    if (declared.startsWith('text/html') || declared === 'application/xhtml+xml') {
      return { ok: false, error: `Content-Type is HTML (${declared})` }
    }
    // Trust magic bytes when Content-Type is missing/generic (common on CDNs).
    const genericOk =
      declared === 'application/octet-stream' ||
      declared === 'binary/octet-stream' ||
      declared === 'application/binary'
    if (ALLOWED_MIME.has(declared) && declared !== format.mime) {
      return {
        ok: false,
        error: `Content-Type ${declared} does not match file signature ${format.mime}`,
      }
    }
    if (!ALLOWED_MIME.has(declared) && !declared.startsWith('image/') && !genericOk) {
      return { ok: false, error: `Unsupported Content-Type: ${declared}` }
    }
  }

  return { ok: true, format }
}

export type DownloadImageResult =
  | { ok: true; bytes: Uint8Array; format: DetectedImageFormat; finalUrl: string }
  | { ok: false; error: string; httpStatus?: number; manualReview?: boolean }

export type DownloadImageOptions = {
  timeoutMs?: number
  userAgent?: string
  referer?: string | null
  accept?: string
  /** Retry once after a short pause when the first attempt times out. */
  retryOnTimeout?: boolean
}

/** Best-effort Referer for retailer CDNs that soft-block anonymous image fetches. */
export function refererForImageUrl(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('mafrservices.com') || host.includes('carrefour')) {
      return 'https://www.carrefour.ke/'
    }
    if (host.includes('thewinebox')) {
      return 'https://thewinebox.biz/'
    }
  } catch {
    // ignore invalid URLs
  }
  return undefined
}

/**
 * Download and validate an image URL. Follows redirects (fetch default).
 * Does not attempt auth bypass or anti-bot circumvention.
 */
export async function downloadAndValidateImage(
  url: string,
  options: DownloadImageOptions = {},
): Promise<DownloadImageResult> {
  const timeoutMs = options.timeoutMs ?? 45_000
  const retryOnTimeout = options.retryOnTimeout ?? false

  const first = await downloadAndValidateImageOnce(url, { ...options, timeoutMs })
  if (first.ok || !retryOnTimeout || !first.error.includes('timed out')) {
    return first
  }

  await new Promise((resolve) => setTimeout(resolve, 750))
  return downloadAndValidateImageOnce(url, { ...options, timeoutMs })
}

async function downloadAndValidateImageOnce(
  url: string,
  options: DownloadImageOptions & { timeoutMs: number },
): Promise<DownloadImageResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Prefer widely cached formats first; AVIF still accepted.
        Accept:
          options.accept ??
          'image/jpeg,image/png,image/webp,image/avif,image/*,*/*;q=0.8',
        ...(options.userAgent ? { 'User-Agent': options.userAgent } : {}),
        ...(options.referer ? { Referer: options.referer } : {}),
      },
    })

    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const len = Number.parseInt(contentLength, 10)
      if (Number.isFinite(len) && len > MAX_IMAGE_BYTES) {
        return {
          ok: false,
          error: `Content-Length too large (${len} bytes)`,
          httpStatus: response.status,
        }
      }
    }

    if (!response.ok) {
      const manualReview = response.status === 401 || response.status === 403 || response.status === 429
      return {
        ok: false,
        error: `HTTP ${response.status}${manualReview ? ' (blocked or restricted — needs manual review)' : ''}`,
        httpStatus: response.status,
        manualReview,
      }
    }

    const buffer = new Uint8Array(await response.arrayBuffer())
    const validated = validateDownloadedImage({
      bytes: buffer,
      contentType,
      status: response.status,
    })

    if (!validated.ok) {
      return { ok: false, error: validated.error, httpStatus: response.status }
    }

    return {
      ok: true,
      bytes: buffer,
      format: validated.format,
      finalUrl: response.url || url,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: `Download timed out after ${options.timeoutMs}ms` }
    }
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: `Download failed: ${message}` }
  } finally {
    clearTimeout(timer)
  }
}
