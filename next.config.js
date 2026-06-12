/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Required on Next 14 for src/instrumentation.ts (Sentry init + the
    // in-process job scheduler). Stable (and default) in Next 15.
    instrumentationHook: true,
  },
  // Increase default server timeout for long LLM calls
  serverRuntimeConfig: {
    maxDuration: 600,
  },
}

// NOTE: deliberately NOT wrapped in @sentry/nextjs's withSentryConfig — on
// this app-router-only Next 14 project the wrapper breaks `next build` with
// `PageNotFoundError: Cannot find module for page: /_document`. Sentry works
// without it: server/edge init + error forwarding live in
// src/instrumentation.ts, and the browser init is imported explicitly by
// src/components/SentryClientInit.tsx in the root layout. The wrapper only
// adds sourcemap upload + auto client injection, neither of which we need.
module.exports = nextConfig
