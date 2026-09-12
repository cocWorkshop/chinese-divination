import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit } from '../rateLimiter'

describe('rateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows up to maxAttempts within the window', () => {
    expect(rateLimit('k', 3, 60_000)).toBe(true)
    expect(rateLimit('k', 3, 60_000)).toBe(true)
    expect(rateLimit('k', 3, 60_000)).toBe(true)
    expect(rateLimit('k', 3, 60_000)).toBe(false)
  })

  it('tracks keys independently', () => {
    expect(rateLimit('a', 1, 60_000)).toBe(true)
    expect(rateLimit('b', 1, 60_000)).toBe(true)
    expect(rateLimit('a', 1, 60_000)).toBe(false)
    expect(rateLimit('b', 1, 60_000)).toBe(false)
  })

  it('resets the counter after the window expires', () => {
    // Vitest 4 fake timers no longer mock Date by default — opt in explicitly.
    // Note: keys must be unique per test — the store is module-level and
    // shared across tests within this file.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    expect(rateLimit('reset-k', 1, 1_000)).toBe(true)
    expect(rateLimit('reset-k', 1, 1_000)).toBe(false)
    vi.setSystemTime(new Date('2026-01-01T00:00:02Z')) // past window
    expect(rateLimit('reset-k', 1, 1_000)).toBe(true)
  })

  it('evicts oldest keys once the store exceeds capacity (bounded memory)', () => {
    const MAX_KEYS = 10_000
    const WINDOW = 60_000 // long enough that nothing expires on its own

    // First key fills its quota (1 attempt).
    expect(rateLimit('k0', 1, WINDOW)).toBe(true)
    expect(rateLimit('k0', 1, WINDOW)).toBe(false)

    // Flood the store past capacity with distinct forged keys.
    for (let i = 1; i <= MAX_KEYS; i++) {
      rateLimit(`forged-${i}`, 1, WINDOW)
    }

    // k0 was the oldest entry and must have been evicted — its window
    // restarts instead of the store growing without bound.
    expect(rateLimit('k0', 1, WINDOW)).toBe(true)
  })
})


