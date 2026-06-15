export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
}

export function sanitizeWineNameForSearch(name: string | null | undefined): string {
  if (!name) return ''

  return decodeHtmlEntities(name)
    .replace(/\b(red|white|ros[eé]|sweet|dry|natural|sparkling|still)\s+wine\b/gi, '')
    .replace(/\bwine\b/gi, '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSearchQueries(parts: {
  producer?: string | null
  wineName?: string | null
  vintage?: string | number | null
}): string[] {
  const producer = decodeHtmlEntities((parts.producer ?? '').trim())
  const wineName = sanitizeWineNameForSearch(parts.wineName)
  const vintage =
    parts.vintage == null || parts.vintage === '' ? '' : String(parts.vintage).trim()

  const queries: string[] = []

  if (producer && wineName) {
    queries.push(`site:vivino.com ${producer} ${wineName}`)
    queries.push(`site:vivino.com "${producer} ${wineName}"`)
    if (vintage) {
      queries.push(`site:vivino.com ${producer} ${wineName} ${vintage}`)
    }
  }

  if (wineName) {
    queries.push(`site:vivino.com ${wineName}`)
    if (producer) {
      queries.push(`site:vivino.com ${wineName} ${producer}`)
    }
  }

  if (producer && !wineName) {
    queries.push(`site:vivino.com ${producer}`)
  }

  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))]
}
