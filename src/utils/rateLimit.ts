import { sleep } from './delay'

/**
 * Sliding-window limiter: at most `maxPerWindow` acquires inside any
 * rolling `windowMs` period. Callers block until a slot is free.
 */
export class SlidingWindowRateLimiter {
  private timestamps: number[] = []

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
  ) {
    if (maxPerWindow < 1) {
      throw new Error('SlidingWindowRateLimiter maxPerWindow must be >= 1')
    }
    if (windowMs < 1) {
      throw new Error('SlidingWindowRateLimiter windowMs must be >= 1')
    }
  }

  /** How many acquires remain in the current window (after pruning). */
  remaining(): number {
    this.prune(Date.now())
    return Math.max(0, this.maxPerWindow - this.timestamps.length)
  }

  async acquire(options?: {
    onWait?: (info: { waitMs: number; used: number; max: number }) => void
  }): Promise<{ waitedMs: number; remaining: number }> {
    let waitedMs = 0

    while (true) {
      const now = Date.now()
      this.prune(now)

      if (this.timestamps.length < this.maxPerWindow) {
        this.timestamps.push(now)
        return { waitedMs, remaining: this.maxPerWindow - this.timestamps.length }
      }

      const oldest = this.timestamps[0]!
      const waitMs = Math.max(1, oldest + this.windowMs - now)
      options?.onWait?.({
        waitMs,
        used: this.timestamps.length,
        max: this.maxPerWindow,
      })
      await sleep(waitMs)
      waitedMs += waitMs
    }
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs
    while (this.timestamps.length > 0 && this.timestamps[0]! <= cutoff) {
      this.timestamps.shift()
    }
  }
}
