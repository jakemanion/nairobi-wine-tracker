export function formatStoreUrlDirectory(url: string | null | undefined): string {
  if (!url?.trim()) return '—'

  try {
    const { pathname } = new URL(url)
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length === 0) return '/'
    if (parts.length === 1) return `/${parts[0]}/`
    return `/${parts.slice(0, -1).join('/')}/`
  } catch {
    return url
  }
}

export function formatVivinoProductName(url: string | null | undefined): string {
  if (!url?.trim()) return '—'

  try {
    const { pathname } = new URL(url)
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length === 0) return '—'

    const slug = parts[parts.length - 1]
    if (!slug || slug === 'wines') {
      const fallback = parts[parts.length - 2]
      return fallback ? decodeSlug(fallback) : '—'
    }

    return decodeSlug(slug)
  } catch {
    return url
  }
}

function decodeSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ').trim()
}
