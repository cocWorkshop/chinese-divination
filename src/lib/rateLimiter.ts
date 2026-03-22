// Simple in-memory rate limiter
const store = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  const record = store.get(key)
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }
  if (record.count >= maxAttempts) return false // blocked
  record.count++
  return true // allowed
}
