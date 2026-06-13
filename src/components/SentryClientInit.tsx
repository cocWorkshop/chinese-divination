'use client'

/**
 * Browser-side Sentry init. Explicitly imported in the root layout instead of
 * relying on @sentry/nextjs's withSentryConfig build wrapper (which breaks
 * `next build` on this app-router-only Next 14 project — see next.config.js).
 *
 * DSN-gated: NEXT_PUBLIC_SENTRY_DSN is baked in at build time; while unset
 * the module initializes nothing and the component renders nothing.
 */
import * as Sentry from '@sentry/nextjs'

let initialized = false
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (typeof window !== 'undefined' && dsn && !initialized) {
  initialized = true
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    // No session replay — privacy (birth data on screen) + bundle weight.
  })
}

export default function SentryClientInit() {
  return null
}
