/**
 * Simple in-memory rate limiter.
 *
 * Bounded: expired entries are swept lazily once the store reaches MAX_KEYS,
 * and if it is still over capacity afterwards, oldest-inserted keys are
 * evicted. Without this, forged random keys (fake IPs / credentials) on
 * public endpoints grow the store without limit and eventually OOM the
 * Node process. Eviction trade-off: an attacker burning >MAX_KEYS distinct
 * live keys within one window resets the limit of the evicted keys —
 * acceptable next to OOM; honest per-key limiting is unaffected.
 */
const MAX_KEYS = 10_000
const store = new Map<string, { count: number; resetAt: number }>()

function sweep(now: number): void {
  // forEach instead of for...of — tsconfig target is es5 (no downlevelIteration).
  store.forEach((record, key) => {
    if (now > record.resetAt) store.delete(key)
  })
}

function evictOldest(): void {
  while (store.size >= MAX_KEYS) {
    const oldest = store.keys().next()
    if (oldest.done) break
    store.delete(oldest.value)
  }
}

export function rateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  if (store.size >= MAX_KEYS) {
    sweep(now)
    if (store.size >= MAX_KEYS) evictOldest()
  }
  const record = store.get(key)
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }
  if (record.count >= maxAttempts) return false // blocked
  record.count++
  return true // allowed
}
