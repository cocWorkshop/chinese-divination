/**
 * Next.js instrumentation hook — runs ONCE per server process at startup
 * (requires `experimental.instrumentationHook` in next.config.js on Next 14).
 *
 * Owns process-lifetime concerns:
 *   - Sentry runtime init (server / edge)
 *   - uncaught-request-error forwarding to Sentry
 *   - (I7) the in-process job scheduler is started here too — this is the
 *     single sanctioned "runs once per container" entry point.
 */
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
    // In-process job scheduler (log retention, future stale-reading cleanup).
    // Import lazily so the edge runtime never sees prisma.
    const { startJobs } = await import('./lib/jobs')
    startJobs()
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Forwards unhandled errors from App Router request handling to Sentry
// (no-ops while the DSN is unset).
export const onRequestError = Sentry.captureRequestError
