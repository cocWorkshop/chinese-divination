# Phase 1 — Observability + input validation (I6, Sentry, I7, I11)

**Date:** 2026-06-12 · **Plan items:** I6, Sentry, I7, I11 (CI/I4 remains ON HOLD per owner)

## I6 — Structured logging + request correlation
- **New `src/lib/logger.ts`** — pino JSON to stdout; `createRequestLogger(endpoint)` issues a short `requestId` carried on every log line.
- Instrumented routes: **divination** (blocking + streaming, 13 lines converted), **master** (POST/GET/DELETE), **chat**. Admin routes left as-is by design.
- `requestId` flows: route → `completeLLM`/`streamLLM` → `logLlmCall` → **new nullable `LlmLog.requestId` column** (⚠ SCHEMA, owner-approved; dev migration `20260612160611_add_llmlog_requestid`; prod gets it at the pre-deploy gate).
- Side fix during migration: three `_prisma_migrations` rows on dev had stale/placeholder checksums (`manual`) from past recovery work — updated to the real file checksums (bookkeeping only). Without this, `prisma migrate dev` demanded a DB reset.

### How to debug a request now
```bash
docker logs chinese-divination | grep '"requestId":"a1b2c3d4"'   # whole request flow
# and the matching LlmLog row:
SELECT * FROM "LlmLog" WHERE "requestId" = 'a1b2c3d4';
```
Optional: `LOG_LEVEL=debug|warn|…` (default info). Pretty-print locally: pipe through `npx pino-pretty`.

## Sentry — error tracking (DSN-gated, currently INERT)
- `@sentry/nextjs` wired the **manual** way: server/edge init via `src/instrumentation.ts` (with `onRequestError` forwarding) + browser init via `src/components/SentryClientInit.tsx` in the root layout. `captureException` with `requestId` tags in the divination/master/chat catch paths.
- **Deliberately NOT using `withSentryConfig`:** on this app-router-only Next 14 project the build wrapper breaks `next build` with `PageNotFoundError: /_document` (verified by isolation build). The wrapper only adds sourcemap upload + auto client injection — not needed.
- `next.config.js` gained `experimental.instrumentationHook: true` (required on Next 14 for instrumentation.ts).

### ⚠ Operator action required to activate
1. Create a (free) Sentry account + Next.js project.
2. Set in `.env.production` (and `.env.local` if wanted in dev): `SENTRY_DSN=…` and `NEXT_PUBLIC_SENTRY_DSN=…` (same DSN). **Until set, everything no-ops.**
3. `NEXT_PUBLIC_SENTRY_DSN` is baked at build time — set it before building the image.

## I7 — In-process jobs + log retention/PII purge
- **New `src/lib/jobs/`** — tiny scheduler (unref'd timers) started once per process from `instrumentation.ts`; first run 5 min after boot, then daily. This module is the extensibility seam Phase 2's stale-reading cleanup reuses.
- **`logRetention` job:** `LlmLog` rows >90 days → `inputPreview`/`outputPreview`/`systemPrompt` set NULL (PII purge; token/latency/status/errorMessage metrics kept). `AuthLog` rows >365 days deleted. `CreditLog` never touched (billing audit).
- **`LOG_PURGE_DRY_RUN=1`** makes the job report counts without writing. Dev dry-run executed: 0 eligible rows (dev data is young). **Recommended:** run prod with dry-run for the first day after the next deploy, check the `log retention dry run` log line, then remove the flag.

## I11 — Zod boundary validation
- `/api/profile` PUT — full field schema (e.g. `birthLat` must now be a number in [-90,90]; previously any string was stored). Malformed JSON → 400 with named issues.
- `/api/family-members` POST/PUT — same field schema + `id` on PUT; the `relation==='other'` cross-field rule unchanged.
- `/api/readings/[id]/chat` POST — envelope validation (malformed body → 400 instead of 500, array capped at 200); per-message filter semantics deliberately unchanged.

## Verification done
`type-check` 0 · `lint` 0 · `test:unit` 983/983 · **full `next build` green** (and isolation-tested the Sentry wrapper failure) · retention dry-run executed against dev · env fail-fast unchanged.
