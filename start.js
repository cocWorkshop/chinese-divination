// Wrapper around Next.js standalone server.js to extend HTTP timeouts
// Default Node.js headersTimeout (60s) kills long-running LLM requests

const http = require('http')
const originalCreateServer = http.createServer

http.createServer = function(...args) {
  const server = originalCreateServer.apply(this, args)
  server.keepAliveTimeout = 620000    // 620s
  server.headersTimeout = 630000      // 630s (must be > keepAliveTimeout)
  server.requestTimeout = 660000      // 660s
  server.timeout = 660000             // 660s overall socket timeout
  console.log(`> Timeouts extended: keepAlive=620s, headers=630s, request=660s, socket=660s`)
  return server
}

// Run pending database migrations before starting.
//
// FAIL FAST (architecture plan I2): a failed `migrate deploy` used to be
// swallowed ("app can still run") — which is exactly how the 2026 drift
// incident festered: a failed migration leaves a poisoned row in
// _prisma_migrations that blocks every future deploy, while the app silently
// serves a schema/code mismatch to paying users. Exiting non-zero instead
// makes docker's `restart: unless-stopped` + the compose healthcheck surface
// the failure immediately (container restart-loops → `docker ps` shows it),
// and the logs name the cause. Prod was reconciled 2026-06-12
// ("Database schema is up to date!") — this must not ship before that gate,
// and it did not.
const { execSync } = require('child_process')
try {
  console.log('> Running database migrations...')
  // Invoke the prisma CLI entry directly (NOT `npx prisma`): the CLI lives in
  // its own image-baked tree (prisma-cli/, see Dockerfile) so its transitive
  // deps are complete and isolated; npx would try to DOWNLOAD prisma at boot,
  // and a copied .bin shim breaks (docker COPY dereferences the symlink away
  // from its WASM sibling — the 2026-06-12 crash-loop).
  execSync(`node prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma`, {
    stdio: 'inherit',
    env: { ...process.env },
    timeout: 300_000, // 5 min — a hung migration must not hang the boot forever
  })
  console.log('> Migrations complete')
} catch (e) {
  console.error('> FATAL: migration failed — refusing to start with a schema/code mismatch.')
  console.error(`> Cause: ${e.message}`)
  console.error('> Inspect with: DATABASE_URL=<prod> npx prisma migrate status')
  console.error('> Runbook: docs/archive/prisma-migrations-recovery-202606.md (failed-row recovery: migrate resolve --rolled-back <name>)')
  process.exit(1)
}

// Now load the original Next.js standalone server
require('./server.js')
