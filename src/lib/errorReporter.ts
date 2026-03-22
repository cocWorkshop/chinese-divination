/**
 * Report a frontend-captured API error to the backend.
 * Fire-and-forget — never throws.
 */
export function reportError(params: {
  endpoint: string
  status?: number
  error: string
  context?: string
}) {
  try {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).catch(() => {}) // swallow network errors on the reporter itself
  } catch {
    // never throw
  }
}

/**
 * Create a .catch() handler that reports the error to admin error logs.
 * Usage: fetch(...).then(...).catch(catchAndReport('/api/profile'))
 */
export function catchAndReport(endpoint: string, context?: string) {
  return (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    reportError({ endpoint, error: message, context })
  }
}
