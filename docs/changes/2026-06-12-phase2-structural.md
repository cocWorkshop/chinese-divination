# Phase 2 — Structural refactors (I8, I9, I5, I14)

**Date:** 2026-06-12 · **Plan items:** I8, I9, I5, I14 (+ deployment docs)

## I8 — One divination pipeline (`finalizeDivination`)
- **New `src/app/api/divination/_finalize.ts`** — the parse → hard-reject gates →
  merge → validate → save → credit-settle pipeline, previously duplicated (~140
  lines) between the blocking and streaming paths of `route.ts`. Both now call it;
  billing/save behavior can no longer drift between transports.
- **New `src/lib/sse.ts`** — shared SSE response helper (guarded send/heartbeat/
  close); used by the divination streaming path and the master route.
- `route.ts` shrank by ~190 lines net.

## I9 — Reading lifecycle service + scheduled cleanup
- **New `src/lib/readings/lifecycle.ts`**: `markCompleted` / `markFailed` /
  `refundHold` / `cleanupStaleReadings`. `markFailed` never clobbers a completed
  reading and refunds held credits **exactly once** (single-winner SQL CTE — safe
  under concurrent calls).
- The stale-pending sweep moved off `/init`'s request path onto the jobs scheduler
  (`staleReadings`, every 10 min) — and now also refunds holds (it previously just
  marked rows failed, eating any payment).

## I5 — Credit reservation (closes the TOCTOU billing race) ⚠ SCHEMA
- **Migration `20260612*_add_reading_creditsheld`**: `Reading.creditsHeld INT NOT
  NULL DEFAULT 0` (owner-approved; rollback = drop column).
- **`/api/divination/init` now atomically DEDUCTS the cost** (new `holdCredits()` in
  `rateLimit.ts` — same guarded-UPDATE atomicity as `deductCredits`, but returns the
  amount) and records it on the reading. A cheap non-mutating pre-check still rejects
  insufficient balances before any family-member creation.
- On success the hold IS the payment (no second deduction). Every failure path —
  LLM error, unparseable output, empty output, stream crash, stale timeout — refunds
  via the lifecycle service.
- Legacy compatibility: `saveHistory=false` (no reading row) and direct calls without
  `/init` keep the old check-then-deduct-on-success behavior.
- **Proven by `src/__tests__/integration/creditReservation.test.ts`** (5 tests, run
  against the dev DB): 10 parallel holds on a 1-reading balance → exactly 1 success,
  balance never negative; double/concurrent refunds pay once; stale cleanup refunds;
  completed readings never refund.

## I14 — Typed event bus + master-widget hygiene
- **New `src/lib/events.ts`** — typed `publish`/`subscribe` for the three `xuanji:*`
  window events (payloads typed per event; subscriber exceptions isolated so a
  throwing listener can't break the dispatching save path). All 9 call sites
  converted (dashboard, portrait page, divination stream hook, MasterChatContext).
- All 5 deferred `react-hooks/exhaustive-deps` warnings properly fixed (thresholds
  moved to module scope; `lang` added to `loadHistory` — completion notes now
  re-render on language switch; admin-feedback fetchers wrapped in `useCallback`;
  `MysticalLoader` timer now re-anchors when `startTime` changes; stable refs/setters
  listed in `useDivinationInit`). **`npm run lint` is now fully clean — zero
  warnings.**
- Remaining (deliberately deferred as opportunistic, with I15): splitting
  MasterChatContext's SSE parsing/state into separate modules — behavior-preserving
  churn best bundled with the next master-widget feature.

## Operator notes
- See **`docs/DEPLOYMENT.md`** (new) for: the deploy quality gate, the one-time
  pre-deploy prod reconciliation, log reading, Sentry activation steps, the
  ready-to-paste CI workflow (still on hold), and the Phase-3 explainer.
- The prod delta for the pre-deploy gate now includes BOTH new columns
  (`LlmLog.requestId`, `Reading.creditsHeld`) — regenerate it at gate time.
- Behavior change to know: **credits are now deducted at `/init`** (when a reading
  row is created) instead of after the LLM call. Users see the same net outcome —
  failures refund automatically (look for `hold refunded` log lines).
