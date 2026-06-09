export function formatGrapeVarieties(value: unknown): string {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(', ')
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown[]
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).map(String).join(', ')
        }
      } catch {
        return trimmed
      }
    }
    return trimmed
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function normalizeGrapeVarieties(value: unknown): string | null {
  const formatted = formatGrapeVarieties(value)
  return formatted || null
}

export function parseGrapeVarietiesInput(raw: string | null): string | null {
  if (!raw?.trim()) return null
  return normalizeGrapeVarieties(raw.trim())
}
