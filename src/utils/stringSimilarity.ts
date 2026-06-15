function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bigrams(value: string): string[] {
  if (value.length < 2) return value ? [value] : []
  const grams: string[] = []
  for (let i = 0; i < value.length - 1; i += 1) {
    grams.push(value.slice(i, i + 2))
  }
  return grams
}

export function diceSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const left = normalizeText(a)
  const right = normalizeText(b)

  if (!left && !right) return 1
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length)
    const longer = Math.max(left.length, right.length)
    return shorter / longer
  }

  const leftBigrams = bigrams(left)
  const rightBigrams = bigrams(right)
  if (!leftBigrams.length || !rightBigrams.length) return 0

  const rightCounts = new Map<string, number>()
  for (const gram of rightBigrams) {
    rightCounts.set(gram, (rightCounts.get(gram) ?? 0) + 1)
  }

  let overlap = 0
  for (const gram of leftBigrams) {
    const count = rightCounts.get(gram) ?? 0
    if (count > 0) {
      overlap += 1
      rightCounts.set(gram, count - 1)
    }
  }

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length)
}

export function similarityPercent(a: string | null | undefined, b: string | null | undefined): number {
  return Math.round(diceSimilarity(a, b) * 100)
}

export function producerMatches(
  canonicalProducer: string | null | undefined,
  scrapedProducer: string | null | undefined,
): boolean {
  const left = normalizeText(canonicalProducer)
  const right = normalizeText(scrapedProducer)
  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

export function buildSearchQuery(parts: {
  producer?: string | null
  wineName?: string | null
  vintage?: string | number | null
}): string {
  const tokens = [parts.producer, parts.wineName, parts.vintage]
    .map((part) => (part == null ? '' : String(part).trim()))
    .filter(Boolean)

  return tokens.join(' ')
}
