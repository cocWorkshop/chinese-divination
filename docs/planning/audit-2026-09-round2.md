# Technical Audit Round 2 — Execution Report & Deferred Items (2026-09-12)

> Branch `refactor/audit-optimization`. Round 1 (rateLimiter memory leak, admin guards, CI gates, ziweiCalculator 70x acceleration, coverage harness, legacy cleanup) was documented in the prior commit. This round reflects deep audits across three parallel tracks: Database Layer, Security, and LLM / Streaming Infrastructure.

---

## 1. Executed Optimizations (Zero Behavioral Regressions)

### A. Billing Correctness — Concurrency Race Fixes (Money Path)

| # | Issue | Fix | Impacted File |
|---|---|---|---|
| A1 | `/api/start/complete` executed unconditional `user.update`, allowing concurrent duplicate welcome bonuses | `updateMany({ where: { tentative: true } })` single-winner transition | `start/complete/route.ts` |
| A2 | Gift link claims: `claimCount >= maxClaims` check outside transaction allowed concurrent over-claiming on the last slot | Guarded `updateMany` (increments only when `claimCount < maxClaims`); duplicate claims by the same user rollback via unique P2002 constraint | `gift/[code]/route.ts` |
| A3 | Registration referral rewards double-crediting (`shareLink.update` lacked `used: false` guard) | Conditional `updateMany`; race loser receives no grant | `register/route.ts` |
| A4 | `markFailed` status update and credit refund were disconnected; process crash between steps caused permanent loss of refunds | Atomic single-transaction status update + `refundHold` (passing tx) | `lib/readings/lifecycle.ts` |
| A5 | `divination/init`: held credits before creating pending row; crash between steps meant deduction without a row to refund | `holdCreditsAndCreateReading()`: atomic guard deduction + row creation + ledger audit in a single transaction | `lib/creditService.ts` + `init/route.ts` |
| A6 | Master first-turn concurrent requests threw `MasterSession.create` P2002 -> 500 error | `upsert` | `master/route.ts` |

### B. Security Hardening

| # | Issue | Fix |
|---|---|---|
| B1 | `/api/resend-verification`: Unauthenticated enumeration oracle (check mode + 3 divergent responses) + unmetered rate -> email bombing | Removed check mode; unified generic response; added 3/hour/IP rate limit |
| B2 | `/api/auth/login` precheck `!user` branch lacked bcrypt constant-time comparison (diverging from NextAuth authorize) | Added `dummyBcryptCompare()` from `lib/auth.ts` |
| B3 | Feedback route returned raw Prisma internal `err.message` to clients | Generic client error + server-side logging; capped feedback body at 2000 chars |
| B4 | `divination/init` + main route: Unvalidated `inputData` directly persisted and injected into LLM prompt | Shared `_inputValidation.ts`: 20KB cap, object validation, language whitelist, question type check |
| B5 | Chat `history` array unvalidated: single message could reach multiple MBs; potential `system` role injection | Per-message role and length validation (user/assistant only, 4000 chars/item cap) |
| B6 | `newFamilyMember` fields unvalidated (diverging from family-members Zod schema) | Uniform 100/50/100 length caps for name/relation/relationDetail |
| B7 | Public share route returned raw `inputData` containing coordinates and exact timestamps exceeding presentation needs | Stripped `inputData` from response (retained server-derived `birthInfo`) |
| B8 | `notifications/[id]/read`: arbitrary ID triggered unhandled foreign key 500 | `try/catch` -> 404 |
| B9 | `_birthProfile` logged birth PII to stdout | Removed stdout logging |
| B10 | `credits/history` pagination parameters unbounded (`limit=1e6`, negative page -> 500) | Clamped to 1–100 / $\ge 1$ |

### C. Database Optimizations (Migration `20260912132044_add_missing_indexes`, #34)

| Index | Rationale |
|---|---|
| `Reading(familyMemberId)` | Filtered by member in chat/divination-check + `ON DELETE SET NULL` cascade (PG does not index FKs automatically) |
| `Reading(status, createdAt)` | Stale sweeper scans `status='pending'` every 10 min; previously executed full table sequential scans |
| `CreditLog(userId, createdAt)` | Filter + sort + deep pagination in `credits/history` and admin credit logs |

Redundant indexes recorded for future cleanup: `GiftLink(code)`, `Compensation(token)`, `MasterSession(userId)` (duplicate unique constraints); `RateLimit(userId, windowStart)` (prefix of unique composite).

### D. Performance & Resource Management

| # | Issue | Fix |
|---|---|---|
| D1 | `/api/readings` lacked pagination and selected all columns (`calculationData`/`llmPrompt`/`llmRawOutput` multi-KB rows) -> multi-MB payloads | Selected metadata columns only + `take: 500` |
| D2 | Chat family members queried via individual `findFirst` (N+1 query) | Single `distinct(['familyMemberId'])` query |
| D3 | `/api/init` loaded ~11 `AdminSetting` rows via individual `findUnique` | Batched `getCosts()` + single `findMany` -> 3 queries total |
| D4 | Admin divination logs: Unbounded time window + **matching bug (never checked userId, attributing logs to incorrect users)** | Constrained to current page's user IDs + `take: 1000` + nearest neighbor matching |
| D5 | Streaming divination emitted an SSE frame per character (~30K frames / ~3MB framing overhead per reading) | Parser buffers per push (= one frame per LLM delta chunk), preserving fluid typing UX |
| D6 | Master SSE lacked heartbeat—first LLM call delayed 30–90s with zero bytes, triggering 60s reverse proxy timeouts | 15s keep-alive heartbeat (aligned with divination route) |
| D7 | Client disconnects never aborted upstream LLM calls -> abandoned turns burned 12 tool loops | Propagated `req.signal` across divination (blocking + stream) and Master `turnEngine` |

### E. Reliability & Operations

| # | Issue | Fix |
|---|---|---|
| E1 | Job scheduler `void tick()` lacked `.catch()`—any rejected job crashed the process via unhandled rejection | Added structured `.catch()` logging + per-job re-entrancy protection |
| E2 | Changes to `AdminSetting` via PUT took up to 60s to take effect (cache clearance hook was never invoked) | Call `clearLLMSettingsCache()` immediately on write |
| E3 | `claudeProxy` errors stripped HTTP status codes (always 502) | Error object retains upstream `status` property |
| E4 | OpenRouter SDK implicit retries (default 2) were unconfigured and unlogged | Configured explicit `maxRetries: 2` with clear budget comments |

---

## 2. Behavioral Change Notice

**Divination Abort Behavior in D7**: Previously, when clients disconnected (network drop / closed tab), the server continued executing the LLM and saved the reading (`_finalize.ts` intended to persist the paid reading). Now, disconnecting **aborts the LLM and triggers the existing failure path = `markFailed` + full refund of held Karma credits**. This improves the experience for intentional cancellations (refund issued with no wasted credits).

---

## 3. Test Coverage Baseline

- 42 suites / **1,078 tests / ~7s** (reduced from 91.6s prior to audit; ZiWei suite accelerated from 140s to 2s in Round 1).
- Coverage instrumentation configured (`npm run test:coverage`, v8, covering `src/lib` and `src/app/api`): ~40% overall baseline.
- Historical blind spots addressed with dedicated test suites.

---

## 4. Deferred Items (Requiring Architectural / Strategic Decision)

| # | Item | Reason for Deferral | Proposed Architecture |
|---|---|---|---|
| P1 | **MasterChatMessage Retention Policy** | Data deletion intersects with GDPR exports; retention window is a policy decision | Register retention cron: purge archived rows where `archivedAt > N` days (default 180d) |
| P2 | **turnIndex Unique Constraint** | Existing records may contain duplicates; direct migration would fail | Run deduplication query before applying `@@unique([userId, sessionId, turnIndex])` |
| P3 | **Summary Persistence** | Re-summarizing sessions > 60K tokens incurs repeated LLM costs | Persist summary as synthetic row, summarizing only new deltas |
| P4 | **Master Failure Refunds** | Master deducts before streaming without a refund path on LLM failure | Implement atomic Master refund or migrate to Hold-then-Settle model |
| P5 | **Revoke Share Links** | New endpoint needed (`DELETE /api/readings/[id]/share` clearing `shareToken`) | Dedicated route + UI revoke button |
| P6 | **Mask Emails in `claim/[token]`** | Compensation page reveals full recipient email | Mask to `u***@domain` |
| P7 | **Stripe Subscription Webhooks** | Currently selling one-off packages only; subscription handlers are dead code | Implement on subscription launch: `customer.subscription.*`, idempotency table |
| P8 | **Zero-Downtime Deployment** | Infrastructure overhaul requiring dual-port instances or reverse proxy probing | Update `deploy-local.yml` for dual-container rolling restarts |
| P9 | **Distributed Rate Limiting (Redis)** | Single-instance in-memory limiter currently sufficient | Migrate to Upstash/Redis sliding window when scaling horizontally |
| P10 | **UI Component Testing** | New test harness required for UI components | Prioritize BaZi form, payment modal, and Master widget |
| P11 | **Coverage Threshold Ratchet** | Immediate 40% gate would fail builds | Gradually increase ratchet as coverage expands |
| P12 | **LlmLog Row Pruning** | Logs grow without bound | Add hard deletion step to `logRetention` job (180d) |
| P13 | **Redundant Index Removal** | Cosmetic cleanup touching production DDL | Drop 4 redundant indexes in subsequent migration |
| P14 | **Concurrency Integration Tests** | High-value race condition validation | Add `Promise.all` integration tests matching `creditReservation.test.ts` |

---

## 5. Execution Summary of Deferred Items

Following team alignment, prioritized deferred items were implemented:

### 1. Delivered Items
| # | Item | Solution & Outcome | Verification |
|---|---|---|---|
| **P1+P12** | Automatic Retention for MasterChatMessage & LlmLog | Created `masterChatRetention.ts` (>180d batch purge) and updated `logRetention.ts` (>180d hard purge) with dry-run support | `src/lib/jobs/__tests__/retention.test.ts` (9 tests, 100% coverage) |
| **P2+P13** | turnIndex Unique Constraint + Redundant Index Cleanup | Verified 0 duplicate rows; generated migration `20260912172000_turn_index_unique_and_drop_redundant_indexes`; dropped 4 redundant indexes; added P2002 backoff retry in `appendMasterChatMessage` | Diagnostic script + migration verified |
| **P3** | Compressed Summary Review | Production metrics confirmed summarize was invoked in only 0.9% of turns (7 vs 806 master turns); maintained existing design without additional schema complexity | Verified via query audit |
| **P4** | Master Failure Refund Pipeline | Added `refundMasterCredits()` in `src/lib/creditService.ts`; wired into error and abort callbacks in `src/app/api/master/chat/route.ts` | `src/lib/__tests__/creditService.test.ts` (9 tests) |
| **P5** | Share Revocation DELETE Route & UI | Added `DELETE` route in `src/app/api/readings/[id]/share/route.ts` (clears `shareToken`); added revoke button in `ShareResultButton.tsx` | `src/app/api/readings/__tests__/shareRoute.test.ts` (7 tests) |
| **P14** | Concurrency Integration Tests for Billing Races | Simulated concurrent requests against A1 (welcome grant), A2 (gift claims), and A3 (referral rewards) | `src/__tests__/integration/billingRaces.test.ts` (3 concurrent suites passing) |

### 2. Test Coverage Expansion
Delivered dedicated test suites covering critical paths:
- `src/app/api/divination/__tests__/_inputValidation.test.ts` (16 tests) — Byte caps, type guards, and language whitelists.
- `src/app/api/divination/__tests__/_finalize.test.ts` (7 tests) — Result persistence, credit settlement, and hard rejection gates.
- `src/lib/__tests__/email.test.ts` (12 tests, 88.6% coverage) — Token generation, safeBaseUrl validation, and templates.
- `src/lib/llm/__tests__/complete.test.ts` (5 tests, 88.1% coverage) — OpenRouter dispatch, ClaudeProxy, 400/404/422 response_format fallback, abort signals.
- `src/lib/llm/__tests__/stream.test.ts` (5 tests, 81.9% coverage) — Chunks, tool call deltas, done events, and error handling.
- `src/lib/master/__tests__/turnEngine.test.ts` (4 tests, 87.3% coverage) — Interaction loop, `[NEXT]` splitting, tool dispatch, persistence.
- `src/app/api/__tests__/routeHardening.test.ts` (11 tests) — Resend verification anti-enumeration, pagination clamping, and authorization checks.

### 3. Final Verification Metrics
- **Typecheck**: `npm run type-check` (`tsc --noEmit`) — **0 errors**
- **Lint**: `npm run lint` (`next lint`) — **0 warnings / 0 errors**
- **Test Suite**: `npm run test:ci` (Vitest) — **1,201 passing tests across 59 files (~7.22s)**
- **Coverage**: Global statement coverage increased from ~40% to **52.79%** (`src/lib/llm` at **90.17%**, `src/lib/jobs` at **61.84%**, `src/lib/master` at **65.02%**).
