# AGENTS.md — AI Agent Engineering Standards & Architecture Reference

This document establishes the Standard Operating Procedures (SOP), architectural orientation, and verification gates for all AI coding agents (**Google Antigravity**, **OpenCode**, **Claude Code**) and engineers contributing to this repository.

> **Companion Reference**: For the full 25-model Prisma database catalog, 5 domain-specific TDD matrices, dual-theme CSS design tokens, and Karma economy configuration tables, see [`ANTIGRAVITY.md`](ANTIGRAVITY.md).

---

## 1. Core Rule: Issue-to-Test Imperative & Quality Gates

> **"Every bug fix, feature addition, or interaction refactor must be accompanied by corresponding automated test cases. Never modify production code without automated regression tests."**

1. **Red-Green-Refactor & Regression Locking**:
   - When encountering logic flaws, dialogue anomalies, state loss, or crashes, first locate or write an automated test reproducing the failure (`RED`).
   - Implement the minimal fix required to turn the test green (`GREEN`), then refactor cleanly while keeping the entire test suite passing.
2. **Prevent Silent Regressions**:
   - Any defect that has occurred once (e.g., abrupt farewells from the Xuanji Master, duplicate Q&A cards on the Reading page, dev server 500s due to `.next` build cache collisions) must be locked down by a permanent automated regression test (watchdog).
3. **Four Mandatory Delivery Quality Gates**:
   Before reporting completion or committing changes, all four gates must pass sequentially:
   - `npx tsc --noEmit` → **0 errors**
   - `npx eslint src` → **0 warnings, 0 errors**
   - `npx vitest run` → **100% passing** across all 80+ test suites (1,368+ unit and integration tests)
   - **Smoke & Runtime Integrity Check** → Core routes respond normally (no 500s, no missing module resolutions)

---

## 2. Operational SOP: Dev Server vs. Next.js `.next` Build Cache Isolation

### Incident Symptom
Running `npm run build` while `npm run dev` is active in the same directory causes the dev server to crash with `500 Internal Server Error`:
```text
Error: Cannot find module './vendor-chunks/framer-motion.js'
Require stack:
- .next/server/webpack-runtime.js
- .next/server/app/reading/[id]/page.js
```

### Root Cause
- When `npm run dev` is running locally (listening on port `8088`), the Next.js development Webpack compiler maintains an in-memory dependency graph pointing to `.next/server/vendor-chunks/`.
- Running `npm run build` (`next build`) in the same directory cleans and overwrites `.next` with production artifacts, wiping out development vendor chunks.
- The long-running `next dev` process attempts to load deleted chunks on subsequent requests, triggering 500 errors.

### Prevention & Auto-Healing Procedure
- **Avoid Concurrent Builds**: When `next dev` is running on port `8088`, rely on `npx tsc --noEmit`, `npx eslint src`, and `npx vitest run` for fast verification.
- **Three-Step Auto-Healing Recovery** (if `next build` was executed against a live dev directory):
  ```powershell
  # 1. Terminate stale Node.js dev processes
  Stop-Process -Name node -Force -ErrorAction SilentlyContinue
  # 2. Clean the polluted .next build cache
  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
  # 3. Relaunch a clean dev server
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WindowStyle Hidden
  ```
- **Automated Watchdog**: [`src/__tests__/smoke/buildIntegrityAndRuntimeGuard.test.ts`](src/__tests__/smoke/buildIntegrityAndRuntimeGuard.test.ts) verifies critical dependency imports, component export signatures, and documentation guards.

---

## 3. Essential Developer Commands

```bash
npm install                  # Install dependencies
npm run dev                  # prisma generate + migrate deploy + next dev on 0.0.0.0:8088
npm run build                # Production standalone Next.js build (for Docker)
npm run predeploy-check      # Full gate: type-check + lint + test:ci
npm run type-check           # npx tsc --noEmit
npm run lint                 # next lint (ESLint)
npm run test:ci              # Run full Vitest suite (unit + integration)
npm run test:unit            # Run deterministic unit test suite
npm run test:integration     # Run PostgreSQL-backed integration tests
npm run db:generate          # npx prisma generate
npm run db:migrate           # npx prisma migrate dev (interactive; commit generated SQL!)
```

> **Database Migration Discipline**: Always use `npx prisma migrate dev --name <desc>` for schema changes and commit the migration file under `prisma/migrations/`. **Never** run `prisma db push` against shared development or production databases, as it mutates schema state without recording migration history.

---

## 4. Codebase Architecture & Module Map

### 4.1 Directory Structure
```text
src/
  app/
    api/
      divination/            # Deterministic calculation + LLM interpretation pipeline
        _finalize.ts         # Unified post-LLM validation, merge & credit settlement funnel
        _streamingJsonParser.ts # Fault-tolerant incremental JSON section extractor
        handlers/            # Modular per-system handlers (personal/ & event/)
        schemas/             # Zod output contracts & schemaToLLMTemplate() AST walker
      master/                # Xuanji Master SSE orchestrator route (/api/master)
      credits/               # Karma balance & decadal unlock APIs
  components/
    master/                  # Persistent Master chat context & dual-mode desktop/overlay UI
    reading/                 # In-context reading prompts & progressive chart viewers
    results/                 # System-specific interactive visualizers (BaZi, ZiWei, etc.)
  lib/
    *Calculator.ts           # 100% deterministic pure TypeScript symbolic engines
    trueSolarTime.ts         # Astronomical Equation-of-Time & longitude solar correction
    dstDetection.ts          # Historical Daylight Saving Time shift detector
    sse.ts                   # SSE stream encoder with 15s keep-alive heartbeat timer
    llm/                     # Unified LLM abstraction (completeLLM, streamLLM, settings)
    master/                  # Multi-agent Turn Engine FSM, tools, slicers & memory compaction
    readings/
      lifecycle.ts           # Atomic Hold-then-Settle credit ledger & FOR UPDATE refund CTE
divination-refs/             # Static markdown persona & domain reference prompts
prisma/
  schema.prisma              # 25 PostgreSQL models (User, Reading, MasterSession, CreditLog, etc.)
```

### 4.2 Unified LLM Layer (`src/lib/llm/`)
All server routes invoke the LLM through `src/lib/llm/` rather than instantiating provider SDKs directly:
- `completeLLM()`: Blocking completion (used for non-streaming divination fallback and background summarization/portrait extraction).
- `streamLLM()`: Async generator yielding `{ type: 'content' | 'tool_call_delta' | 'done' }`. Propagates caller `AbortSignal` (`req.signal`) directly to the upstream OpenRouter `fetch` request to halt token generation immediately upon client disconnect.
- `resolveLLMConfig()`: Per-endpoint configuration resolver (`divination`, `chat`, `master`, `masterBackground`) with a 60s in-memory cache (`caller override -> AdminSetting -> env -> default`).
- **Reasoning Separation**: Reasoning tokens (`delta.reasoning`) are captured for `LlmLog` observability and never mixed into user-visible `content`.

### 4.3 Xuanji Master Orchestrator (`src/lib/master/`)
The Master is a **strictly read-only** supervisor agent: it never executes calculations in prompt weights, never deducts credits directly, and never mutates profile/family tables.
- **Turn Engine FSM (`turnEngine.ts`)**: `runMasterTurn()` is a transport-agnostic async generator managing the tool-calling loop (`MAX_TOOL_LOOPS = 12`), per-turn hash deduplication (`turnToolCache` keyed by `${name}::${args}`), `[NEXT]` multi-bubble splitting (`bubbleStream.ts`), forced final prose synthesis, and silent `[PASS]` discarding on idle reflection turns.
- **Seven Read-Only Tools (`tools/`)**:
  1. `get_user_profile` — Birth profile + completeness status.
  2. `list_family_members` — Stored family profiles and relationship metadata.
  3. `list_readings` — Metadata-only index of historical readings.
  4. `get_reading` — Compact chart header + Table of Contents of sliceable keys.
  5. `get_reading_detail` — On-demand progressive retrieval of a specific chart section.
  6. `prefill_divination_form` — Emits a `cta_card` SSE event linking to a pre-populated calculation form.
  7. `show_reading_card` — Emits a `reading_card` SSE event referencing an existing reading.
- **5-Minute KV Cache Prefix Composer (`systemPrompt/buildSystemPrompt.ts`)**:
  - **Static Prefix (Cached)**: `[persona, capabilityCatalog, skillsCatalog]` (~85% of system prompt tokens) placed strictly at token index 0.
  - **Dynamic Suffix**: Per-user `UserPortrait`, turn-type appendices (`reflection.md`, `activation.md`, `templates.md`), 14-day pre-computed solar/lunar reference table, and session budget wrap-up notes.
- **Two-Stage Working-Memory Compaction (`compression.ts`)**:
  - Triggered when estimated prompt tokens exceed `COMPRESSION_TOKEN_BUDGET` (`60,000` tokens).
  - **Stage 1 (Zero-Cost Stubbing)**: Drops bulky historical `tool_calls` JSON payloads when converting `MasterChatMessage` rows to LLM messages.
  - **Stage 2 (Narrative Summary)**: Summarizes prose older than `KEEP_RECENT_TURNS` (`10`) into a `<800`-token system summary block via the `masterBackground` endpoint.

### 4.4 Deterministic Calculators & Zod Schema Contracts (`src/app/api/divination/`)
- **Single Source of Truth (`schemas/_toLLMTemplate.ts`)**: `schemaToLLMTemplate()` walks each handler's Zod schema AST to generate the exact JSON skeleton embedded in the LLM prompt.
- **Dual-Channel Convergence (`_finalize.ts`)**: Both SSE streaming and blocking REST paths converge on `finalizeDivination()`, running the JSON repair ladder (`_jsonParse.ts`), `handler.merge()`, and permissive `schema.passthrough().safeParse()` validation.
- **Hold-then-Settle Atomic Ledger (`src/lib/readings/lifecycle.ts`)**: Credits reserved at `/api/divination/init` (`Reading.creditsHeld`) are settled via `markCompleted()` or refunded exactly once via `markFailed()` / `refundHold()` using a PostgreSQL `WITH claimed AS (SELECT ... FOR UPDATE), zeroed AS (UPDATE ... FROM claimed c RETURNING c."creditsHeld")` CTE.

---

## 5. Module Guard Test Catalog

| Business Scenario | Core Implementation | Mandatory Guard Test Suite |
| :--- | :--- | :--- |
| **Master: Natural Closing & Silent Idle Reflection** | `divination-refs/master.md`<br>`src/lib/master/turnEngine.ts` | `src/lib/master/__tests__/turnEngine.test.ts`<br>Verifies `isPassReply('[PASS]')` recognition and silent discard of idle reflections without robotic farewells. |
| **Master: Session Budget & Limit Notice** | `src/lib/master/systemPrompt/buildSystemPrompt.ts`<br>`src/components/master/widget/MessageBubble.tsx` | `src/lib/master/systemPrompt/__tests__/buildSystemPrompt.test.ts`<br>Verifies wrap-up prompt injection when remaining turns ≤ threshold and `limit_notice` card rendering. |
| **Reading Page: Master Takeover & Context Injection** | `src/components/results/XuanjiChatCard.tsx`<br>`src/components/master/MasterChatContext.tsx`<br>`src/app/api/master/route.ts` | `src/components/results/__tests__/xuanjiChatCardLogic.test.ts`<br>Hides legacy Q&A cards for authenticated users, registers `viewingReadingId`, and injects active chart context. |
| **In-Context Inquiries & Desktop Split-Screen Workspace** | `src/components/reading/InContextMasterPrompt.tsx`<br>`src/components/MainContent.tsx`<br>`src/components/master/widget/ExpandedView.tsx` | `src/components/reading/__tests__/InContextMasterPrompt.test.ts`<br>`src/components/master/__tests__/desktopWorkspacePanel.test.ts`<br>Validates dynamic `suggestedQuestions` priority and desktop co-pilot split-screen layout. |
| **Activation & Reflection: Anti-Nagging & Silent Fallback** | `src/lib/master/activationDetect.ts`<br>`src/lib/master/turnEngine.ts` | `src/lib/master/__tests__/activationDetect.test.ts`<br>`src/lib/master/__tests__/turnEngine.test.ts`<br>Ensures followed-up CTAs are never repeated and `ambiguous_resume` falls back to `[PASS]`. |
| **Runtime Integrity & Module Resolution** | Global UI dependencies & component exports | `src/__tests__/smoke/buildIntegrityAndRuntimeGuard.test.ts`<br>Guards against missing exports or broken compilation graphs. |

---

## 6. Internationalization & Styling Conventions

1. **i18n Circuit Breaker**:
   - Never write inline ternary language branches (`lang === 'en' ? en : zh` or `isEn ? en : zh`).
   - Always use `T(lang, zhTW, en)` or `TEN(isEn, zhTW, en)`.
   - **Strict Parameter Order**: 2nd argument is Traditional Chinese (`zhTW`); 3rd argument is English (`en`).
2. **Design Tokens & Modern Oriental Sanctuary Aesthetic**:
   - Never introduce generic SaaS/AI clichés (purple-blue neon gradients, floating blur orbs, customer-service ping dots, or arbitrary emojis like 🔮✨⭐🤖).
   - Use semantic CSS variables (`var(--gold)`, `var(--bg-primary)`, `var(--bg-surface)`, `var(--text-primary)`) supporting both Dark Mode (Tai Chi Void) and Light Mode (Dunhuang Warm Parchment).
