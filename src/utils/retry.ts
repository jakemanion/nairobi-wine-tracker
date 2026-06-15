import { sleep } from './delay'

export type RetryOptions = {
  maxRetries: number
  baseDelayMs?: number
  label?: string
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs = 1000, label = 'request' } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= maxRetries) break

      const backoffMs = baseDelayMs * 2 ** attempt
      const jitter = Math.floor(Math.random() * 250)
      await sleep(backoffMs + jitter)
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`${label} failed after ${maxRetries + 1} attempts: ${lastError.message}`)
  }

  throw new Error(`${label} failed after ${maxRetries + 1} attempts`)
}
