# Xuanji — 2026-06 Comprehensive Architecture & UIX Changelog

> This document consolidates 11 itemized changelogs produced during the 2026-06-12 refactoring sprint (Phase 0 ~ Phase 2 and UIX W0 ~ W5), serving as a long-term historical archive and tracking index.

---

## Table of Contents

1. [Phase 0 — Code Quality & Container Baseline (I3, I10a, I12, I13, I16)](#1-phase-0--code-quality--container-baseline)
2. [Phase 1 — Observability & Boundary Validation (I6, I7, I11, Sentry)](#2-phase-1--observability--boundary-validation)
3. [Phase 2 — Core Architecture & Credit Race Condition Refactoring (I5, I8, I9, I14)](#3-phase-2--core-architecture--credit-race-condition-refactoring)
4. [UIX Sprint — Accessibility, Internationalization & Long-Running Call Experience (W0 ~ W5)](#4-uix-sprint--accessibility-internationalization--long-running-call-experience)

---

## 1. Phase 0 — Code Quality & Container Baseline

### 1. Code Style & Test Gates (I3)
- **ESLint & TS Configuration**: Added `.eslintrc.json` (inheriting `next/core-web-vitals`, enabling `@typescript-eslint`, installing `eslint@^8.57.0` and `eslint-config-next@^14.2.35`).
- **package.json Scripts Expansion**:
  - `npm run type-check` (`tsc --noEmit`)
  - `npm run test` (`vitest`) / `npm run test:unit` (excludes DB integration tests) / `npm run test:ci` (full test suite)
  - `npm run predeploy-check` (triple gate: `type-check + lint + test:ci`)
  - `db:push` adds schema drift warning.
- **Typography Fixes**: Replaced ASCII quotes in CJK content with standard typographic quotes.

### 2. Admin Auth Consolidation (I10a)
- Replaced inline permission checks in `api/admin/feedback` and `api/admin/site-feedback` with unified `requireAdmin()` (`src/lib/adminAuth.ts`), consolidating all ~34 admin routes under a single authentication boundary.

### 3. Strict Environment Variable Validation (I12)
- Added `src/lib/env.ts` (Zod-based schema validation for 23 environment variables, loaded as side-effect in `src/lib/prisma.ts`):
  - Fails fast on startup if required variables are missing in production, outputting missing variable names.
  - Core required variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`.
- Rewrote `.env.example`, documenting Stripe keys and model configurations.

### 4. Container Operations & Memory Safeguards (I13)
- **Dockerfile**: Removed online runtime `npm install`; builder stage copies lockfile-pinned `prisma` and `effect` binaries and dependencies.
- **docker-compose.yml**: Added `mem_limit: 2g` (prevents memory leaks from exhausting host memory), added `/api/config/nav` healthcheck (`start_period: 90s` accommodating boot-time migrations).

---

## 2. Phase 1 — Observability & Boundary Validation

### 1. Structured Logging & Request Tracing (I6)
- Added `src/lib/logger.ts` (Pino-based stdout JSON logging).
- Introduced global correlation ID `requestId`: traces across Next.js API Routes → LLM calls → `LlmLog` database entries (with indexed database column `LlmLog.requestId`).
- Log tracking: `docker logs chinese-divination | grep '"requestId":"<ID>"'`.

### 2. Sentry Exception Monitoring Integration
- Implemented manual integration: `src/instrumentation.ts` (Server/Edge) + `src/components/SentryClientInit.tsx` (Client), avoiding Next.js 14 App Router build failures associated with `withSentryConfig`.
- Gated by `SENTRY_DSN`; runs silently when unconfigured.

### 3. In-Process Scheduled Jobs & Privacy Retention (I7)
- Added `src/lib/jobs/`: Lightweight in-process timers triggered by `instrumentation.ts` 5 minutes after server start, executing daily thereafter.
- **Log Retention Job (`logRetention`)**: Automatically blanks PII fields (`inputPreview`, `outputPreview`, `systemPrompt`) on `LlmLog` entries older than 90 days, retaining token counts and latency metrics; purges `AuthLog` entries older than 365 days.

### 4. Input Boundary Validation (I11)
- Introduced Zod schemas for `/api/profile`, `/api/family-members`, and `/api/readings/[id]/chat` to enforce strict type checking and range limits (latitude/longitude boundaries, string length caps, malformed JSON defense).

---

## 3. Phase 2 — Core Architecture & Credit Race Condition Refactoring

### 1. Divination Pipeline Convergence (I8)
- Added `src/app/api/divination/_finalize.ts`: Consolidated duplicate pipeline logic between blocking and streaming routes (parsing → gate filtering → calculator data merge → Zod validation → database persistence → credit settlement) into a single unified pipeline.
- Added `src/lib/sse.ts`: Abstracted standardized SSE wrapper (heartbeats, safe transmission, graceful shutdown).

### 2. Reading Lifecycle & Automated Compensation Service (I9)
- Added `src/lib/readings/lifecycle.ts`: Unified wrappers for `markCompleted`, `markFailed`, `refundHold`, and `cleanupStaleReadings`.
- Single-winner SQL CTE guarantees concurrent refunds execute exactly once; migrated stale pending scans from user `/init` request path to a background job (runs every 10 minutes), proactively refunding timed-out runs.

### 3. Karma Credit Reservation Mechanism (I5 — Fixed TOCTOU Billing Race)
- **Database Migration**: Added `creditsHeld INT NOT NULL DEFAULT 0` to `Reading` model.
- **Atomic Reservation**: `/api/divination/init` atomically reserves credits upon creating pending readings, binding the hold to the reading record.
- **Safety Guarantee**: Successful runs convert reservations into consumed credits; failures at any stage (LLM timeout, parse error, crash, client abort) trigger automated full refunds via the lifecycle service.
- Verified by `creditReservation.test.ts` concurrency tests: balance never drops below zero, duplicate refunds are strictly prevented.

### 4. Typed Event Bus & Hooks Cleanup (I14)
- Added `src/lib/events.ts`: Strongly typed `xuanji:*` global publish/subscribe bus (dashboard, portrait, streaming status).
- Cleared all `react-hooks/exhaustive-deps` warnings across codebase, achieving 0 errors and 0 warnings on `npm run lint`.

---

## 4. UIX Sprint — Accessibility, Internationalization & Long-Running Call Experience

### W0 — Rapid Fixes & Baseline Safeguards
- **Multilingual Error Page**: Localized `src/app/divination/error.tsx` for bilingual support.
- **Stripe Error Handling**: Resolved frontend unresponsiveness during checkout failures, adding error toasts.
- **Master Modal Interaction**: Added `Escape` key handling to close expanded modal, safely restoring focus to the floating action button (FAB).
- **Interruption Cooldown Bar**: Displays real-time countdown banner above input box when user interruption exceeds 6 times per 60 seconds.

### W1 — Accessibility Infrastructure
- **Reduced Motion Support**: Added `MotionProvider.tsx` to suppress CSS animations and Framer Motion transitions globally when system prefers reduced motion.
- **Keyboard Navigation**: Refactored `BirthplaceInput` into a standard WAI-ARIA Combobox (Arrow keys navigation, Enter selection, Esc dismissal); implemented focus trapping in `MemoryGateModal`.
- **Semantic Enhancement**: Divination selection cards converted to standard `<Link>` elements; five-element bars supplemented with textual and badge labels, avoiding color-only data communication.

### W2 — Lightweight i18n Architecture Integration
- Added `src/lib/i18n/index.ts`: Consolidated 34 fragmented local `T()` implementations into unified architecture; added standardized `formatDate`, `formatDateTime`, and `formatNumber` Intl utilities.
- Added `scripts/check-i18n.sh` script to prevent duplicate translation definitions.

### W3 — Long LLM Call Experience Safeguards
- **Honest Progress Bar**: When calls exceed 180 seconds, progress bar no longer stalls at 95%, advancing progressively from 95% to 99% with label "Deep reasoning in progress (N minutes elapsed)".
- **Proactive Cancellation**: Exceeding 300 seconds presents "Cancel and return to form (preserves entered data)".
- **Form Draft Persistence**: `useDivinationForm` persists form input locally with 800ms debounce, allowing complete restoration after accidental tab closures.
- **Precise Failure Explanations**: Surfaces actionable explanations categorizing failures by timeout, rate limiting, format anomalies, or network fluctuations.

### W4 — Mobile & Capacitor Adaptation
- Added `env(safe-area-inset-top)` padding to expanded master window header for notched screens.
- Compact navigation bar for tablet viewport widths (768–1023px), keeping primary entry points accessible outside hamburger menu.
- Global touch target areas expanded to minimum 44×44px.

### W5 — Output Quality & Experience Polish
- **Professional Print Stylesheet**: Added `@media print` styling, hiding navigation and starfield backgrounds and converting dark themes into crisp black-and-white layouts for saving and printing charts.
- **Empty State Guidance**: Dashboard displays clear next-step guidance and divination entry points when history is empty.
