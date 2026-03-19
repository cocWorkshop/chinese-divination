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
