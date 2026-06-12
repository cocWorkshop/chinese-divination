/**
 * Sentry — server runtime init. DSN-gated: when SENTRY_DSN is unset the SDK
 * initializes disabled and everything no-ops (zero overhead, no network).
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Errors only — no performance tracing (keeps the free tier quota for
  // what matters and adds no per-request overhead).
  tracesSampleRate: 0,
})
