# ANTIGRAVITY.md

Orientation and architectural guide for Antigravity agents working in this repository.

## Project Overview

**玄機AI XuanJi** — Full-stack AI-powered Chinese divination platform. Supports 7 deterministic Chinese divination systems plus modular fallbacks:
- **BaZi (八字)** — Four Pillars of Destiny (V2 engine powered by `tyme4ts`)
- **Zi Wei Dou Shu (紫微斗數)** — Purple Star Astrology (powered by `iztro`)
- **I Ching (易經)** — Book of Changes (`taobi`)
- **Liu Yao (六爻)** — Six Lines Hexagram Divination
- **Qi Men Dun Jia (奇門遁甲)** — Mysterious Gates Escaping Technique
- **Feng Shui (風水)** — Nine Palaces Flying Stars (玄空九星)
- **Mei Hua (梅花易數)** — Plum Blossom Divination (Time-based & Birth-based)
- **Other / Fallback** — Generic birth profile & event inquiries

Key capabilities:
- **Deterministic Calculators**: Chart calculation and astronomical algorithms are deterministic TypeScript (`src/lib/*Calculator.ts`).
- **AI Interpretations**: Structured interpretations generated via OpenRouter (`openai` SDK) or local Claude proxy (`@anthropic-ai/sdk`), guided by prompt references in `divination-refs/*.md`.
- **Xuanji Master (玄機大師)**: Persistent, proactive chat assistant with long-term memory, incremental user portrait extraction, and session compression (`src/lib/master/`).
- **Credit & Payment System**: Unified credit economy (Karma points), Stripe checkout/subscriptions, daily bonus grants, and gift links.
- **Onboarding Ad Funnel**: 5-step interactive funnel (`/start`) converting tentative visitors into registered users with trial credits.
- **Bilingual**: English and Traditional Chinese (`zh-TW`) via `src/components/LanguageContext.tsx` and `src/lib/i18n/`.
- **Multi-Platform**: Responsive Web + Android mobile app via Capacitor 8.

---

## Tech Stack & Verified Versions

| Category | Technology | Verified Version | Notes |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `^14.2.35` | App Router only; standalone Docker output |
| **Runtime / Language** | Node.js / TypeScript | Node 20 LTS / TS `^5` | Strict mode enabled; ESNext target |
| **Database & ORM** | PostgreSQL + Prisma | Prisma `^6.0.0` | 25 models; binary targets: native, windows, debian-openssl-3.0.x |
| **Authentication** | NextAuth.js | `^5.0.0-beta.25` | Credentials provider, JWT sessions, bcryptjs `^2.4.3` |
| **AI Integration** | OpenRouter + Claude SDK | `openai` `^6.27.0`, `@anthropic-ai/sdk` `^0.37.0` | Unified via `src/lib/llm/` |
| **Styling & Animation** | Tailwind CSS + Framer Motion | Tailwind `^3.3.0`, Framer Motion `^11.0.0` | Custom colors: navy, gold, jade, vermillion |
| **UI Components** | React 18 | `^18` | react-hot-toast `^2.4.1`, react-markdown `^9.0.0`, remark-gfm `^4.0.0` |
| **Divination Engines** | tyme4ts, iztro, lunar-typescript, taobi | `tyme4ts` `^1.4.5`, `iztro` `^2.5.8`, `lunar-typescript` `^1.8.6`, `taobi` `^0.4.5` | `tyme4ts` is primary for BaZi V2 |
| **Payments & Emails** | Stripe + Resend | `stripe` `^20.4.1`, `@stripe/stripe-js` `^8.11.0`, `resend` `^6.9.4` | Webhooks handled via `/api/stripe/webhook` |
| **Monitoring & Logging**| Sentry + Pino | `@sentry/nextjs` `^10.57.0`, `pino` `^10.3.1` | Edge, server & client Sentry; structured pino logging |
| **Schema & Validation**| Zod + jsonrepair | `zod` `^4.3.6`, `jsonrepair` `^3.14.0` | Zod defines single source of truth for LLM prompts & schemas |
| **Mobile Wrapper** | Capacitor | `@capacitor/*` `^8.3.0` | Android platform, push notifications, native biometrics |
| **Testing** | Vitest | `^4.1.1` | 41 test suites, 1,074 automated tests |

---

## Development & Operational Commands

### Package Scripts (`package.json`)

```bash
# Dependency Management
npm install                  # Install dependencies

# Development Server
npm run dev                  # prisma generate && prisma migrate deploy && next dev on 0.0.0.0:8088

# Building & Production Run
npm run build                # Build Next.js standalone bundle
npm start                    # Start production server (standalone server via start.js in Docker)

# Quality Checks & Pre-deployment Gate
npm run type-check           # Typecheck codebase without emitting (tsc --noEmit)
npm run lint                 # Run Next.js ESLint (next lint)
npm run predeploy-check      # Full pre-deploy verification: type-check + lint + test:ci

# Testing Suites (Vitest)
npm test                     # Run Vitest in interactive watch mode
npm run test:ci              # Run all 41 test suites non-interactively (vitest run)
npm run test:unit            # Run fast unit tests only (excludes src/__tests__/integration/**)
npm run test:integration     # Run integration tests only (vitest run integration)

# Database Operations (Prisma)
npm run db:generate          # Regenerate Prisma Client (prisma generate)
npm run db:migrate           # Interactive migration development (prisma migrate dev)
npm run db:push              # ⚠️ WARNING: Local throwaway DBs ONLY; drifts migration history
npm run db:backup            # Execute DB snapshot backup (node db_backup/backup.mjs)
npm run db:restore           # Restore DB from snapshot (node db_backup/restore.mjs)
```

### Shell & Integration Scripts (`tests/` & `scripts/`)

```bash
# Automated Shell Integration Suites
./tests/run_tests.sh         # Comprehensive API & integration suite (defaults to BASE_URL=http://localhost:8094)
BASE_URL=http://localhost:8088 ./tests/run_tests.sh  # Run against local dev server
./tests/run_funnel_tests.sh  # End-to-end /start ad funnel test suite (cookie-jar session tests)

# Database & Administration Utilities
./scripts/setup-db.sh        # Initialize local PostgreSQL container/service
./scripts/make-admin.sh      # Promote a given user email to admin role
./scripts/smoke-test-api.mjs # Standalone smoke tests for API endpoints
./scripts/check-i18n.sh      # Validate i18n key consistency between zh and en
./scripts/verify-famous-bazi.ts # Validate historical charts against BaZi calculator
```

---

## Workspace Directory Structure

```
├── .claude/                 # Claude settings & worktrees
├── .env.example             # Comprehensive environment variable template
├── Dockerfile               # Multi-stage Docker build (deps -> builder -> prisma-cli -> runner)
├── android/                 # Capacitor Android native project
├── capacitor.config.ts      # Capacitor configuration (appId: com.chinese.divination, remote server URL)
├── db_backup/               # Backup and restore utilities (backup.mjs, restore.mjs)
├── divination-refs/         # Markdown prompt references loaded dynamically by LLM layer
│   ├── bazi.md  ziwei.md  iching.md  qimen.md  liuyao.md  fengshui.md  others.md  master.md
│   └── master-appendices/   # activation.md, reflection.md, templates.md
├── docs/                    # Architecture notes, migration recovery runbooks, design proposals
├── next.config.js           # Next.js config (standalone output, serverRuntimeConfig: 600s maxDuration)
├── package.json             # Pinned dependencies and scripts
├── prisma/
│   ├── schema.prisma        # 25 models (User, Reading, MasterChatMessage, UserPortrait, etc.)
│   └── migrations/          # 33 migration steps (strict migration history)
├── public/                  # Static assets, fonts, icons, banners
├── scripts/                 # Maintenance, smoke testing, admin, and migration helper scripts
├── sentry.edge.config.ts    # Edge runtime Sentry initialization
├── sentry.server.config.ts  # Node.js server runtime Sentry initialization
├── start.js                 # Production bootstrapper: extends HTTP timeouts (660s) & runs migrations
├── tailwind.config.js       # Custom design tokens (navy, gold, jade, vermillion)
├── tests/                   # Shell integration test suites (run_tests.sh, run_funnel_tests.sh)
├── tsconfig.json            # Path alias: @/* -> ./src/*
├── vitest.config.ts         # Vitest configuration (testTimeout: 30000ms, alias: @/*)
└── src/
    ├── __tests__/           # Top-level integration tests (creditReservation.test.ts, masterChat.test.ts)
    ├── instrumentation.ts   # Next.js startup hook: Sentry init & starts in-process job scheduler
    ├── middleware.ts        # Next.js edge middleware
    ├── types/               # TypeScript declarations (divination.ts, master.ts, next-auth.d.ts)
    ├── hooks/               # Custom React hooks (useMasterChat.ts, useDragScroll.ts)
    ├── components/          # Reusable UI components
    │   ├── master/          # Master chat widget (CollapsedBar, ExpandedView, MasterFab, Context)
    │   ├── results/         # Divination result views (BaziResultV2, ZiweiResultV2, SectionDrawer, etc.)
    │   ├── start/           # 5-step onboarding ad funnel components
    │   └── Navbar.tsx, Footer.tsx, LanguageContext.tsx, SentryClientInit.tsx, etc.
    ├── app/                 # Next.js App Router (pages and API endpoints)
    │   ├── (auth)/          # Authentication routes (login, register, forgot-password)
    │   ├── (divination)/    # Divination entry pages
    │   ├── (legal)/         # Privacy policy, terms of service
    │   ├── admin/           # Admin dashboard (logs, users, settings, master-debug, wiki, funnel)
    │   ├── dashboard/       # User profile and reading history
    │   ├── start/           # Interactive onboarding funnel
    │   ├── r/ & reading/    # Reading viewer and short-link share redirection
    │   └── api/             # 29 API route groups:
    │       ├── admin/       # 19 admin endpoints (logs, stats, users, master-debug, etc.)
    │       ├── divination/  # Core divination generation endpoint & streaming handlers
    │       │   ├── handlers/ # Modular handlers (personal/ & event/) + _streamingJsonParser.ts
    │       │   └── schemas/  # Zod schemas for divination types + _toLLMTemplate.ts
    │       ├── master/      # Xuanji Master chat SSE streaming endpoint & tool runner
    │       ├── start/       # Funnel init, unlock, and conversion endpoints
    │       └── auth, chat, claim, credits, gift, notifications, profile, share, stripe, etc.
    └── lib/                 # Core domain logic
        ├── baziCalculator.ts    # Deterministic BaZi calculator V2 (tyme4ts)
        ├── ziweiCalculator.ts   # Deterministic ZiWei calculator (iztro)
        ├── ichingCalculator.ts  # Deterministic I Ching calculator (taobi)
        ├── qimenCalculator.ts   # Qi Men Dun Jia deterministic calculator
        ├── liuyaoCalculator.ts  # Liu Yao deterministic calculator
        ├── meihuaCalculator.ts  # Mei Hua deterministic calculator
        ├── fengshuiCalculator.ts# Feng Shui 9-palace flying star calculator
        ├── env.ts               # Startup environment variable validation with Zod
        ├── logger.ts            # Structured Pino logger
        ├── prisma.ts            # Global Prisma Client singleton
        ├── readings/            # Reading lifecycle service & atomic credit hold/refund machine
        ├── jobs/                # In-process scheduled jobs (log retention, stale cleaner)
        ├── llm/                 # Unified LLM provider abstraction (OpenRouter, Claude proxy)
        └── master/              # Xuanji Master agent engine (tools, memory, portrait, compression)
```

---

## Architecture & Domain Subsystems

### 1. Unified LLM Abstraction Layer (`src/lib/llm/`)

All AI calls route through `completeLLM()` (blocking) or `streamLLM()` (SSE streaming with function calling):
- **Provider Routing**:
  - `openrouter.ts`: Primary provider using the `openai` SDK with `https://openrouter.ai/api/v1`.
  - `claudeProxy.ts`: Local CLI proxy for blocking Anthropic calls.
- **Config Resolution Fallback Chain** (`settings.ts`):
  1. Explicit caller override (`CompletionRequest.model` / `reasoningEffort`)
  2. `AdminSetting` database row (60s TTL cache; clear via `clearLLMSettingsCache()`)
  3. Environment variables (`OPENROUTER_MODEL`, `MASTER_MODEL`, `DIVINATION_REASONING_EFFORT`, etc.)
  4. Hardcoded defaults:
     - Divination: `anthropic/claude-3-5-haiku` (Reasoning: `medium`, Max tokens: 8,192, Timeout: 240s)
     - Master Chat: `openai/gpt-4o` (Reasoning: `low`, Max tokens: 8,192, Timeout: 240s)
     - Master Background: `openai/gpt-4o-mini` (Reasoning: `off`, Max tokens: 1,500)
- **JSON Enforcement**: Divination calls pass `responseFormat: { type: 'json_object' }`. If a model rejects this parameter, one automatic retry without it is executed. Escape hatch: `DIVINATION_JSON_MODE=off`.
- **Streaming Parser**: Real-time chunk repair and progressive section emitting via `_streamingJsonParser.ts` and `jsonrepair`.

### 2. Xuanji Master Agent Engine (`src/lib/master/`)

Xuanji Master is a persistent assistant operating via SSE streaming (`/api/master`):
- **Safety Boundary**: The Master is strictly read-only. It **never** computes readings directly, **never** deducts credits, and **never** mutates profile/family state. Writes are delegated to UI forms via prefilled URLs or reading cards.
- **Seven Registered Tools** (`src/lib/master/tools/`):
  1. `get_user_profile`: Returns user's birth data and completion status.
  2. `list_family_members`: Returns stored family members with relations and completeness.
  3. `list_readings`: Fetches metadata-only list of past readings.
  4. `get_reading`: Returns compact header + list of fetchable section keys (via slicers).
  5. `get_reading_detail`: Retrieves specific section content on demand (progressive disclosure).
  6. `prefill_divination_form`: Constructs a URL navigation CTA card with prefilled query parameters.
  7. `show_reading_card`: Renders a validated, interactive card linking to an existing reading.
- **Progressive Slicers** (`slicers/`): Slices stored reading JSON into small headers and on-demand sections to prevent context explosion (`bazi.ts`, `ziwei.ts`, `_identity.ts`).
- **Composite Skills** (`skills/`): 7 multi-step workflows injected into the prompt (`bazi_hepan`, `gua_ming_hu_can`, `xing_ming_he_can`, `ze_ri`, `ying_qi`, `kai_yun`, `feng_shui_tiao_li`).
- **Memory & Portrait System**:
  - `MasterChatMessage`: Relational message storage with session IDs, turns, and soft archiving.
  - `UserPortrait`: Incremental profile extractor extracting user tone, preferences, and life context.
  - `compression.ts`: Replaces older conversational turns with synthetic summary stubs when token counts swell.
  - `AdminAccessLog`: Audit logging for admin debug access into user chat and portrait state.

### 3. Divination Handlers & Validation (`src/app/api/divination/`)

- **Handler Registry**: Dispatches requests via `selectHandler(ctx)`. Handlers are split into `personal/` (birth-profile based: BaZi, ZiWei, Other) and `event/` (time/inquiry based: QiMen, LiuYao, MeiHua, FengShui, I Ching).
- **Zod Schema System** (`schemas/`):
  - Single source of truth: `schemaToLLMTemplate()` walks Zod schemas to generate structured JSON prompt templates.
  - Permissive validation: Uses `schema.passthrough().safeParse()`. Partial outputs with valid `sections` or `interpretation` are preserved rather than discarding valuable readings.
  - Hard rejects occur only if both `sections` and `interpretation` are missing; held credits are refunded on hard reject.

### 4. Reading Lifecycle & Credit Reservation (`src/lib/readings/lifecycle.ts`)

- **Atomic Reservation**: When `/api/init` begins a reading, credits are reserved (`Reading.creditsHeld`).
- **State Transitions**:
  - `pending` ──`markCompleted()`──▶ `completed` (hold finalized as consumed payment).
  - `pending` ──`markFailed()`─────▶ `failed` (hold refunded exactly once).
  - `pending` ──`cleanupStale()`───▶ `failed` (automatic refund for pending readings older than 15 minutes).
- **Concurrency Safety**: Atomic `UPDATE ... RETURNING creditsHeld` guarantees that race conditions between client aborts, error handlers, and stale cleaners never refund credits twice.

### 5. In-Process Background Job Scheduler (`src/instrumentation.ts` & `src/lib/jobs/`)

- Enabled in Next.js 14 via `experimental.instrumentationHook = true` in `next.config.js`.
- Bootstraps once per server process in the Node.js runtime (`src/lib/jobs/index.ts`).
- Runs periodic maintenance (`logRetention.ts`):
  - Scrubs PII from `LlmLog` rows older than 90 days.
  - Purges `AuthLog` rows older than 365 days.
  - Supports dry-run inspection via `LOG_PURGE_DRY_RUN=1`.

---

## Database Schema & Prisma Conventions

There are **25 models** in `prisma/schema.prisma`:
1. `User` — Main user account, auth credentials, tentative funnel state, credits, and Stripe subscription status.
2. `Reading` — Divination records, calculation payload, LLM prompt/output, and held credits.
3. `ReadingFeedback` — User ratings (1-5) and text feedback per reading.
4. `FamilyMember` — Additional birth profiles for synastry or family readings.
5. `RateLimit` — Sliding window request tracking per user/tier.
6. `ShareLink` — Shareable invite tokens granting bonus credits.
7. `LlmLog` — Token counts, latencies, system/user prompts, and request IDs.
8. `AdminSetting` — Dynamic runtime key-value configuration overrides.
9. `SiteFeedback` — General platform feedback and bug reports.
10. `Compensation` — Credit grant tokens for system error apologies.
11. `AuthLog` — Login, registration, and logout security audits.
12. `FrontendError` — Client-side error telemetry reported back to server.
13. `Notification` — System-wide or targeted multi-language announcements.
14. `NotificationRead` — Per-user notification read markers.
15. `DeviceToken` — Push notification tokens for Capacitor mobile clients.
16. `CreditLog` — Immutable audit trail of all credit grants, holds, and deductions.
17. `WikiArticle` — Divination encyclopedic articles and guides.
18. `GiftLink` — Campaign/admin links granting claimable credits.
19. `GiftClaim` — Claim history for gift links.
20. `WelcomeRule` — Dynamic welcome banner messages based on user experience stage.
21. `MasterSession` — Master assistant session counters (credits used, timezone offset).
22. `MasterChatMessage` — Individual message rows for the Master assistant.
23. `UserPortrait` — Long-term user preferences and synthesized traits.
24. `UserPortraitHistory` — Versioned audit log of portrait modifications.
25. `AdminAccessLog` — Audit trail for administrative inspection of user master data.

### Critical Database Migration Rules

- **Always use Prisma Migrate**: `npx prisma migrate dev --name <migration_name>`.
- **Commit all migration files**: Every change to `prisma/schema.prisma` must be accompanied by its generated migration SQL in `prisma/migrations/`.
- **NEVER run `prisma db push` on dev or prod**: `db push` mutates schemas without recording migration history, causing schema drift. (The `npm run db:push` command is wrapped with a loud warning).
- **Production Migrations**: Handled automatically in `start.js` before server startup via `node prisma-cli/node_modules/prisma/build/index.js migrate deploy`. If a migration fails, the container fails fast and halts boot.
- **Reference**: Review `docs/prisma-migrations-recovery.md` if schema drift or migration table poisoning occurs.

---

## Environment Configuration (`.env.example` / `src/lib/env.ts`)

Validated at boot by `src/lib/env.ts` (fails fast in production, warns in development, skipped during test/build):

### Required in Production
- `DATABASE_URL`: PostgreSQL connection string.
- `NEXTAUTH_SECRET`: Secret for signing session JWTs (`openssl rand -base64 32`).
- `NEXTAUTH_URL`: Canonical site origin (e.g. `https://chinese-divination.com`). All email links are constructed strictly from this value to prevent host header poisoning.
- `OPENROUTER_API_KEY`: OpenRouter API key for LLM queries.
- `STRIPE_SECRET_KEY`: Stripe secret API key.
- `STRIPE_WEBHOOK_SECRET`: Secret for verifying Stripe webhook events.
- `RESEND_API_KEY`: API key for transactional emails via Resend.

### Optional Overrides
- `EMAIL_FROM`: Sender address (default: `noreply@chinese-divination.com`).
- `CLAUDE_PROXY_URL`: Local Claude CLI proxy endpoint.
- `OPENROUTER_MODEL`, `MASTER_MODEL`, `PORTRAIT_MODEL`: Model name overrides.
- `DIVINATION_REASONING_EFFORT`, `CHAT_REASONING_EFFORT`, `MASTER_REASONING_EFFORT`, `MASTER_BACKGROUND_REASONING_EFFORT`: Reasoning levels (`low`, `medium`, `high`, `off`).
- `DIVINATION_JSON_MODE`: Set to `off` to disable provider-level JSON enforcement.
- `MASTER_SESSION_STALE_HOURS`: Inactivity hours before a master chat session auto-resets.
- `LOG_LEVEL`: Pino logger severity (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).
- `LOG_PURGE_DRY_RUN`: Set to `1` to test log retention row counts without deleting.
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`: Sentry project DSNs.

---

## Testing & Verification Guidelines

- **Vitest Suite**: 41 test files covering 1,074 tests.
  - Run all tests: `npm run test:ci`
  - Run unit tests: `npm run test:unit`
  - Run integration tests: `npm run test:integration`
- **Pre-Deploy Check**: Run `npm run predeploy-check` to verify TypeScript (`type-check`), ESLint (`lint`), and test suites (`test:ci`) before pushing code.
- **Test Locations**:
  - Core Calculators & Algorithms: `src/lib/__tests__/`
  - LLM Module: `src/lib/llm/__tests__/`
  - Master Agent & Slicers: `src/lib/master/__tests__/`, `src/lib/master/slicers/__tests__/`, `src/lib/master/tools/__tests__/`, `src/lib/master/systemPrompt/__tests__/`
  - Divination Handlers & Streaming Parser: `src/app/api/divination/handlers/__tests__/`
  - Output Schemas & Templates: `src/app/api/divination/schemas/__tests__/`
  - UI Rehydration: `src/app/divination/[type]/__tests__/`
  - Integration Tests: `src/__tests__/integration/` (Credit reservations and multi-turn chat)
- **New Divination Types**:
  1. Define Zod output schema in `src/app/api/divination/schemas/{type}.schema.ts`.
  2. Implement `DivinationHandler` in `src/app/api/divination/handlers/personal/` or `event/`.
  3. Register handler in `src/app/api/divination/handlers/index.ts`.
  4. Add snapshot/schema tests verifying `schemaToLLMTemplate()` output.
  5. Colocate unit tests under `__tests__/`.

---

## Test-Driven Development (TDD) Engineering Standard

All bug fixes, feature extensions, and algorithm updates must strictly adhere to the project's **Test-Driven Development (TDD)** lifecycle.

### Core Lifecycle: Red-Green-Refactor

```mermaid
graph LR
    Red["🔴 RED<br/>Write Failing Test<br/>Define Expected Contract"] --> Green["🟢 GREEN<br/>Write Minimal Code<br/>Make Tests Pass"]
    Green --> Refactor["🔵 REFACTOR<br/>Clean Code & Types<br/>Maintain Green Tests"]
    Refactor --> Gate["🛡️ GATE CHECK<br/>type-check + lint<br/>npm run test:ci"]
```

1. **🔴 RED**: Write a focused, deterministic unit/integration test *before* altering any source code. Run the test and verify it fails for the expected reason (e.g., function not found, assertion mismatch, edge case failure).
2. **🟢 GREEN**: Implement the minimum production code necessary to turn the test green. Do not over-engineer at this step.
3. **🔵 REFACTOR**: Clean up implementation, deduplicate logic, enforce TypeScript types and code style without altering functional behavior. Ensure all tests stay green.
4. **🛡️ GATE**: Run `npm run predeploy-check` (`type-check` + `lint` + `test:ci`) before committing.

---

### 五大核心领域专项测试准则 (Domain-Specific Testing Standards)

为避免 TDD 流于教条主义，针对《玄机AI》的中国古典算历、LLM 容错流式解析、金融级积分状态机及 Next.js 全栈架构特性，制定以下 **5 大核心系统领域的强制性测试与防御规范**：

#### 1. 确定性命理排盘算法测试标准 (Deterministic Algorithm Engine)
- **挑战与背景**：八字、紫微斗数、梅花易数等推算依赖中国古天文干支纪年法与易经六十四卦数理变换，规则繁复，极其忌讳经验主义编码。
- **最佳实践落地**：
  1. **基准测试盘（Ground-Truth Fixtures）**：每一个算法必须建立标准黄金测试集（如：1988-09-17 子时男命、1990-05-15 巳时女命、2000-01-01 Y2K纪元、2020-02-29 闰年闰月日、1988 夏季夏令时、乌鲁木齐与上海经纬度真太阳时时差）。
  2. **边缘情况全覆盖（Boundary Matrix）**：
     - 早晚子时分界点：`23:00`（夜子时）与 `00:00`（早子时）日柱与时柱分界校验；
     - 节气交节瞬间：交节日前后 1 分钟大运与月柱归属；
     - 起卦取模边界：如梅花易数被 8 整除（余0）时取坤8卦、动爻被 6 整除（余0）时取上爻（第6爻）。
  3. **纯函数无副作用断言**：所有 `*Calculator.ts` 必须保证是纯函数（Pure Function），禁止在排盘层引入任何网络 I/O、数据库访问或未初始化的外部系统时间依赖。

#### 2. LLM 结构化契约与容错流式解析标准 (LLM Contract & Streaming Parser)
- **挑战与背景**：LLM 具有随机性且耗时昂贵，单元测试若直连真实公网 API 会导致测试缓慢、不稳定且消耗 token 成本。
- **最佳实践落地**：
  1. **零外部网络依赖（Zero-Network Unit Tests）**：单元测试严禁直连 OpenRouter 或 Claude。
  2. **Schema 与 Prompt 单一可信源校验**：所有生成模板测试必须调用 `schemaToLLMTemplate(schema)`，验证其生成的 JSON 骨架包含必要的 `sections` 与 `interpretation` 字段。
  3. **宽松解析防御性测试（Permissive Fallback Tests）**：为 Zod safeParse 编写容错用例，断言当 LLM 返回包含轻微非标键值（如 markdown 代码块包裹、缺少次要字段）时，系统绝不抛出 500 丢弃结果，而是回退保留核心内容。
  4. **流式增量修复测试**：针对 `_streamingJsonParser.ts` 编写分段 chunk 注入测试（模拟在引号中截断、括号未闭合、大段 markdown 插入），断言流式解析器能在各个截断点正确修复并逐节发出渲染事件。

#### 3. 金融级积分与状态机并发安全标准 (Credit Machine & Concurrency)
- **挑战与背景**：积分（Karma）涉及用户真实支付（Stripe），网络异常、客户端中途断开或恶意并发点击若处理不当，易导致积分多扣或超额白嫖。
- **最佳实践落地**：
  1. **并发防超扣压测（Parallel Race-Condition Testing）**：
     - 测试用例必须使用 `Promise.all` 模拟 $N=10$ 个并发请求对仅剩 1 次额度的账户发起 `holdCredits()`；
     - 断言：**严格仅有 1 个成功**，其余 9 个干净拒绝；
     - 断言：数据库中的 `credits` 余额在任何时刻均 $\ge 0$。
  2. **幂等退款生命周期测试（Idempotency & Lifecycle）**：
     - 测试 `markFailed()` 与 `refundHold()` 在同一 reading 上连续调用多次，断言退款仅执行且只记账一次；
     - 处于 `completed` 状态的 reading 绝不允许被退款。
  3. **测试数据隔离与自愈（Test Fixture Isolation）**：
     - 集成测试生成以 `process.pid` 和随机数命名的临时用户与账单，`afterAll` 中必须完整回滚删除，避免测试脏数据污染测试库。

#### 4. Next.js 全栈路由与双语组件交互标准 (Fullstack App Router & i18n)
- **挑战与背景**：Next.js 14 App Router 具有 Server Actions、Route Handlers、动态路由与 Client Component 混合的复杂性。
- **最佳实践落地**：
  1. **API Handlers 请求上下文 Mock**：
     - 测试 Route Handlers 时，构造标准 `NextRequest`，包含 query params、json body 和 header；
     - Mock `auth()` 会话上下文，针对未登录（401）、非管理员访问（403）及合法调用（200）分别编写三类独立断言。
  2. **双语对齐测试（Bilingual Parity）**：
     - 每次新增或修改前端文案与选项，必须在 `src/lib/i18n/` 或翻译字典中检查并测试 `zh-TW` 与 `en` 双语键存在性，严禁出现英文化界面显示生硬拼音（如修正 `"Paipan only"` 为 `"Chart Only"`）。
  3. **交互 Hook 状态机测试**：
     - 对 `useMasterChat` 等异步流式 hook，通过模拟 SSE event stream（`text/event-stream`）测试 `idle -> streaming -> done -> error` 状态流转。

#### 5. 性能预算、CI 自动化门禁与 GitHub Issue 闭环标准 (Performance & Delivery Loop)
- **挑战与背景**：测试集膨胀容易拖慢开发反馈循环；代码修改与 Issue 追踪脱节容易产生信息孤岛。
- **最佳实践落地**：
  1. **单测耗时性能预算（Performance Budget）**：
     - 单个基础算法单元测试执行耗时必须 $< 50\text{ms}$；
     - 全套 1,000+ 单元测试总执行时间控制在 $30\text{s}$ 预算内，严禁在常规单测中引入耗时几十秒的多重遍历大循环；大样本全量 cross-validation 抽离至专项回归套件。
  2. **本地预提交门禁（Pre-deploy Gate）**：
     - 代码合并前必须本地执行 `npm run predeploy-check`（`type-check` + `lint` + `test:ci`），全部通过方可提交。
  3. **GitHub Issue 交付闭环标准**：
     - 开发分支命名规范：`fix/issue-{number}-{description}` 或 `feat/issue-{number}-{description}`；
     - 完成代码与测试并通过回归后，使用 GitHub CLI 规范回帖：
       ```bash
       gh issue comment {number} --body "【修复/实现说明】... 【测试覆盖情况】..."
       gh issue close {number} --reason "completed"
       ```

---

## UI/UX Engineering & Aesthetic Standard: 簡約 · 直覺 · 現代神秘 (MANDATORY)

> [!IMPORTANT]
> **全站强制执行规范 (STRICTLY ENFORCED)**  
> 所有 Antigravity Agent 在编写、修改或重构前端 UI（React / Next.js / Tailwind CSS / Framer Motion / CSS）时，**必须无条件遵循本标准**。  
> 本规范旨在彻底清除“劣质AI味”与“浮夸电竞感”，确立**「簡約 · 直覺 · 現代神秘 (Modern Oriental Mysticism)」**的高级工业级设计标杆。任何包含违规反面特征（如紫色发光球、客服在线闪烁点、廉价 Emoji 堆叠、百分比进度条）的代码均不得合并。

### 1. 核心美学三大支柱 (Core Aesthetic Pillars)

#### 1.1 簡約 (Minimalism & Breathing Space)
- **留白与克制**：大面积留白不是空洞，而是让核心卦辞与命盘自由呼吸。拒绝无意义的多重嵌套边框与装饰性图标堆叠。
- **色彩配比律 (85 / 12 / 3) 与日月双模意象 (Dual-Theme Yin & Yang)**：
  全站支持「太极墨夜」与「宣纸暖白」双模式（默认深色，支持一键切换与持久化），统一遵循东方文人墨客与天象观演的色彩比例：
  - **太极墨夜（Dark Mode / 默认深色）**：
    - **85% 墨夜玄黑底色**（`#080C17` 太极虚空底层，`#0D1526` 主卡片表面色，`#111D35` 浮动层与弹窗），深邃沉静，严禁使用纯黑 `#000000` 或泛紫/泛蓝的浮躁暗色。
    - **12% 晨曦雅金与暖白**（`#D4A853` 赤金，`rgba(255, 255, 255, 0.88)` 暖白高可读文本，`#9A722E` 古刹沉金次级文本与弱边界）。
    - **3% 灵气点睛色**（硃砂御印 `#C0392B`、灵泉青玉 `#2D8A6E`，极度克制点缀变爻与吉凶）。
  - **宣纸暖白（Light Mode / 雅致文人书卷）**：
    - **85% 宣纸素绢底色**（`#FAF8F0` 宣纸暖白底色，`#FFFFFF` 案台卡片表面色，`rgba(255, 255, 255, 0.85)` 卡片背景），温润如古籍善本，严禁使用刺眼冷光死白 `#FFFFFF` 作为全屏背景。
    - **12% 浓墨古褐与深金**（`#2D1F0E` 浓墨主文本，`rgba(45, 31, 14, 0.72)` 次级墨色，`#B8860B` 古金沉韵，`#E8DCC8` 卷轴边框；正文对比度必须符合 WCAG AA $\ge 4.5:1$）。
    - **3% 灵气点睛色**（硃砂御印 `#C0392B` 印章朱批、灵泉青玉 `#2D8A6E` 平安指示）。
- **材质替代光效**：严禁粗暴高饱和的径向大光晕（Radial Gradients）。
  - 深色模式：使用 `0.02~0.03` 不透明度的微噪点/暗水墨质感（Micro-grain），搭配 `0.5px~1px` 的烫金发丝线（`rgba(212, 168, 83, 0.16)`）。
  - 浅色模式：使用宣纸纹理微噪，搭配淡金卷轴发丝线（`rgba(184, 134, 11, 0.2)`）。
  - 赋予界面古墨石砚与宣纸典籍般的实体触感。

#### 1.2 直覺 (Intuition & Interaction Ergonomics)
- **三层渐进式认知漏斗（Progressive Disclosure）**：
  命理系统具有极高的专业门槛（天干地支、藏干、十神、十二宫、神煞）。页面严禁一股脑倾倒专业术语，必须建立三层直觉动线：
  1. **第一层（3 秒直觉断语）**：以极具文采与洞察的大白话给出核心定性（例如：“2026 岁次丙午：金水相激，宜守不宜急，立秋后财源渐明”）。
  2. **第二层（30 秒现代图解）**：通过现代数据可视化（五行能量分布条、运势走势折线图、吉凶倾向雷达图）将抽象术数直观具象化。
  3. **第三层（传统专业原盘）**：四柱八字原盘、紫微十二宫盘、六爻爻象等完整专业盘面，**默认优雅折叠**，保留“查看传统盘面”入口，供资深爱好者按需展开深研。

- **极简直觉交互规范（Human-Centered Interaction Ergonomics / 交互四律）**：
  UI 操作必须天然契合用户的心理模型与物理直觉，**降低思考成本，杜绝反直觉操作**：
  1. **自然映射与可感知性（Affordance & Natural Mapping）**：
     - **可点即所见**：所有可点击或展开的元素（命盘宫位、变爻、签卡、折叠面板）必须有直观的视觉线索（鼠标悬停发丝金光、`cursor-pointer`、明确的旋转箭头/展开标记），绝不让用户猜测“这里能不能点”。
     - **物理动作自然映射**：仪式性交互（摇卦、铜钱翻转、解签、翻牌）的动效方向与节奏必须符合现实物理直觉，声画合拍，严禁突兀弹窗或瞬间跳变破坏心流。
  2. **即时明确的反馈闭环（Instant & Unambiguous Feedback）**：
     - **按压态与微动效**：按钮与卡片交互必须配备自然的微缩压感（`active:scale-[0.98]`）与水墨涟漪；
     - **拒绝假死与沉默**：任何异步推演、生辰排盘或流式请求，必须在点击后 **100ms 内**给出状态响应（如金纹呼吸转动、朱批水墨渐显），禁用态按钮必须清晰说明不可用原因（如“请先选择出生时辰”），禁止无提示置灰。
  3. **路径清晰与安全可逆（Wayfinding & Forgiving Interactions）**：
     - **安全退出与防迷失**：深层排盘面板、抽屉（Drawer）与模态弹窗，必须支持“点击遮罩背景（Click-outside）”、“ESC 键”或“右滑手势”安全退出，严禁制造交互死胡同；
     - **防误触与草稿自愈**：涉及消耗积分（Karma）或不可逆定盘操作前，必须具备清晰的消耗告知；表单录入支持本地草稿自动暂存，网络异常或中断时提供一键“原地重试（Retry）”，避免用户重复填写生辰。
  4. **拇指黄金区与单线程聚焦（Thumb-Zone & Single-Thread Focus）**：
     - **移动端拇指友好**：起卦、掷爻、核心 CTA（“推演命盘”、“叩问玄机”）等高频操作按钮，必须置于屏幕下半部拇指黄金可触达区域，避免孤悬于手机顶部角落；
     - **起卦全屏沉浸**：在起卦推演核心流程中，自动隐退全局次要导航与干扰性 Banner，确保用户在单线程注意力下顺畅完成操作。
  5. **智能预设与零摩擦录入（Zero-Friction Inputs）**：
     - 生辰录入支持公历/农历平滑互转并自动联动润月与时辰干支；
     - 自动检测时区与经纬度推导真太阳时，并支持记住“历史盘主档案”，一键切换，绝不让普通用户在繁琐历法参数前产生阻抗。

#### 1.3 現代神秘 (Modern Oriental Mysticism)
- **西文精密 + 中文古雅的排印碰撞**：
  - **西文/数值/标签**：采用现代、精密、高清晰度的无衬线体（`Inter` / `Geist` / `-apple-system`），展现严密客观的算法推演。
  - **卦辞/断语/天机箴言**：采用骨力遒劲的古典宋体（`Noto Serif SC` / `Songti SC`），并施加 `tracking-widest`（`letter-spacing: 0.15em ~ 0.25em`），呈现金石拓印与古籍善本的庄严肃穆。
- **禅意律动（Zen Motion & Haptics）**：
  - 界面转场与抽屉展开使用沉稳内敛的缓动曲线：`cubic-bezier(0.16, 1, 0.3, 1)`，时长控制在 `400ms ~ 600ms`，杜绝轻浮突兀的机械弹性动画。
  - 背景呼吸光效周期设定为 **4 ~ 6 秒一次循环**（契合人类静心冥想的呼吸频率）。
  - 移动端（Capacitor/Android）起卦或定盘时，调用原生轻微触觉震动（Haptics），强化“落子定乾坤”的仪式感。
- **隐形 AI，尊崇宗师**：
  - 严禁出现“AI 正在利用大模型生成分析...”等廉价技术自嗨文案；
  - 替代为“天地推演 · 岁时同频”、“宗师叩问 · 经卷朱批”，将最先进的大模型智能包裹在最庄严的东方意境之中。

---

### 2. 零容忍反面特征清单 (Zero-Tolerance Checklist / 严禁触碰)

在编写任何组件时，**以下 7 种反面设计绝对禁止出现**：

| ❌ 严禁出现的“廉价AI/粗制味” | ✅ 必须替换的标准规范（简约·直觉·现代神秘） |
| :--- | :--- |
| **1. 杂色/紫黄模糊大光球** (`#9370db` 等 Radial Gradient 乱闪) | **墨夜玄黑 + 0.02 微噪点**，仅保留局部极微弱的暖金色月晕（不透明度 $\le 0.06$） |
| **2. 客服式闪烁圆点** (`animate-ping bg-amber-400 / bg-green-400`) | **撤销闪烁点**；改用静穆庄严的古典篆印或微光金石符文 |
| **3. 烂俗 AI / 奇幻符号** (🤖, 🔮, ✨, 🧙‍♂️, 💬 等 Emoji 堆砌) | **东方几何古朴符文**（`✧`、`☯`、`「」`、`·`）或极简古典线条矢量图标 |
| **4. 生硬的 AI 广告标语** (“AI 命理总顾问”、“全网最强 AI 算命”) | **典雅中堂式意境文案**（“天机玄览 · 岁时气象”、“登堂请益 · 叩问玄机”） |
| **5. 客服工具式对话气泡** (类似 Intercom/微信的左右左右气泡弹窗) | **对弈案台 / 经卷对读展开**，如同宗师在命盘旁手书批注答疑 |
| **6. 冰冷进度条算命** (“正在计算 65%”、“大模型推理中...”) | **天象交汇 / 水墨聚散动效**，配以时节卦辞微转，营造沉静等待感 |
| **7. 刺眼的高饱和对比色** (大红大绿、荧光亮蓝、高饱和纯金渐变) | **雅致东方矿物色彩**：玄墨、晨曦金、硃砂暗红、翡冷翠青，全部降低饱和度 |

---

### 3. 工程落地规范 (CSS Tokens, Themes & Tailwind Patterns)

#### 3.1 核心色彩与样式 Token (`globals.css`)
```css
/* ==========================================================================
   1. 浅色模式 (Light Theme / 宣纸暖白) - 默认根变量
   ========================================================================== */
:root {
  --bg-primary: #faf8f0;          /* 宣纸暖白底层 */
  --bg-surface: #ffffff;          /* 案台卡片表面色 */
  --bg-card: rgba(255, 255, 255, 0.85); /* 质感卡片底 */
  --text-primary: #2d1f0e;        /* 浓墨主文本 (高对比度 WCAG AA >= 4.5:1) */
  --text-secondary: rgba(45, 31, 14, 0.72); /* 墨褐次级文本 */
  --text-muted: rgba(45, 31, 14, 0.55);     /* 淡墨弱提示文本 */
  --gold: #b8860b;                /* 雅致古金 */
  --gold-light: #d4a853;          /* 浅金高光 */
  --gold-dark: #8b6508;           /* 沉香暗金 */
  --border-color: #e8dcc8;        /* 宣纸古籍边框线 */
  --border-gold: rgba(184, 134, 11, 0.3); /* 金丝微边框 */

  /* 字体族定义 */
  --font-serif-classical: 'Noto Serif SC', 'Noto Serif TC', 'Songti SC', SimSun, serif;
  --font-sans-modern: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* ==========================================================================
   2. 深色模式 (Dark Theme / 太极墨夜) - html.dark 激活
   ========================================================================== */
.dark {
  --bg-primary: #0a0f1e;          /* 太极虚空底色 (#080c17 ~ #0a0f1e) */
  --bg-surface: #111d35;          /* 悬浮面板与主卡片背景 */
  --bg-card: rgba(17, 29, 53, 0.6);/* 半透玻璃卡片 */
  --text-primary: #ffffff;        /* 纯白高可读正文 */
  --text-secondary: rgba(255, 255, 255, 0.7); /* 次级文本 */
  --text-muted: rgba(255, 255, 255, 0.4);     /* 弱提示文本 */
  --gold: #d4a853;                /* 晨曦纯金 */
  --gold-light: #e8c278;          /* 悬停流金 */
  --gold-dark: #b8893a;           /* 古刹沉金 */
  --border-color: rgba(212, 168, 83, 0.2);    /* 烫金发丝线 */
  --border-gold: rgba(212, 168, 83, 0.3);

  /* 神妙点睛色（双模式通用） */
  --vermillion-seal: #c0392b;     /* 硃砂御印：印章、关键变爻、犯太岁提示 */
  --jade-tranquil: #2d8a6e;       /* 灵泉青玉：平安、吉利、守正状态 */
}

/* ==========================================================================
   3. 打印模式 (@media print / Keepsake Document)
   ========================================================================== */
@media print {
  /* 卦单打印作为藏品留存：强制脱去暗色与浮夸装饰，展平为白底宣纸书卷 */
  nav, footer, [role='dialog'], .no-print, canvas { display: none !important; }
  body, .dark, :root {
    --bg-primary: #ffffff;
    --bg-surface: #ffffff;
    --text-primary: #1a1a1a;
  }
}
```

#### 3.2 ThemeProvider 与日月双模架构 (Theme Switching Architecture)
全站统一通过 Client Component 进行日/月主题管理，严禁在组件中脱钩：
- **状态源**：`src/components/ThemeProvider.tsx` 通过 Context 暴露 `useTheme() => { theme: 'dark' | 'light', toggleTheme }`；
- **DOM 挂载**：初始化及切换时，在 `document.documentElement`（`<html>`）上精准切换 `.dark` / `.light` class，并同步持久化至 `localStorage.getItem('theme')`；
- **交互入口**：导航栏（`Navbar.tsx`）与公共分享卦单（`PublicReadingClient.tsx`）均集成 `SunMoonIcon` 日月交替按钮；
- **兜底保障**：`globals.css` 中设有 `:root:not(.dark)` 属性层，防止未加 `dark:` 的历史硬编码类在浅色模式下爆白。

#### 3.3 双模式组件编码铁律 (Dual-Theme Anti-Patterns & Best Practices)
编写任何 UI 组件时，必须严格遵守以下 4 条铁律，杜绝浅色模式“翻车”：
1. **严禁硬编码纯白文本**：
   - ❌ 错误：`className="text-white"`、`className="text-white/80"`（在浅色模式下会导致白底白字，完全不可读）；
   - ✅ 正确：使用自适应类 `text-[#2d1f0e] dark:text-white` 或直接使用 CSS 变量 `color: var(--text-primary)`。
2. **严禁硬编码深黑背景**：
   - ❌ 错误：`className="bg-[#0d1526]"`、`className="bg-[#0a0f1e]"`；
   - ✅ 正确：`bg-white dark:bg-[#0d1526]` 或 `bg-[var(--bg-surface)]`。
3. **边框与阴影自适应**：
   - ❌ 错误：硬编码 `border-white/10` 或 `border-[#d4a853]/20`；
   - ✅ 正确：`border-[#e8dcc8] dark:border-[#d4a853]/15 shadow-[0_4px_24px_rgba(45,31,14,0.08)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]`。
4. **语义化 CSS 变量优先**：
   - 优先使用已在 `:root` / `.dark` 定义的标准语义变量（`var(--bg-primary)`、`var(--text-primary)`、`var(--gold)`）。

#### 3.4 经典卡片与容器 Tailwind 组合范式
```tsx
// 标准东方双模玄机卡片（深浅模式完美自适应）
className="relative rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
           bg-white/85 dark:bg-gradient-to-b dark:from-[#0d1526]/80 dark:to-[#080c17]/95
           text-[#2d1f0e] dark:text-white
           border border-[#e8dcc8] dark:border-[#d4a853]/15
           shadow-[0_4px_24px_rgba(45,31,14,0.08)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]
           hover:border-[#b8860b]/40 dark:hover:border-[#d4a853]/35"
```

#### 3.5 经典文案排版范式 (Typography Pairing)
```tsx
// 卦辞 / 批注箴言（古雅宋体 + 呼吸字距 + 双模自适应金色）
<h3 className="font-serif text-[#b8860b] dark:text-[#d4a853] tracking-widest text-lg leading-relaxed">
  「 觀 天 之 道 ， 執 天 之 行 ， 盡 矣 。 」
</h3>

// 数据 / 时辰标签（精密西文无衬线 + 沉金细字）
<span className="font-sans text-xs uppercase tracking-wider text-[#8b6508] dark:text-[#9a722e]">
  2026.09.12 · SOLAR TIME 14:32 · JIANGNAN
</span>
```

---

### 4. 交付自检四问 (The Design Litmus Test)

在提交任何 UI 代码或 PR 前，工程师与 Agent 必须进行如下 4 项自检：
1. **看 1 秒钟（直觉与交互检验）**：用户能否在 1 秒内抓住最核心的一句大白话断语，而不是被满屏专业卦盘吓退？操作意图是否一眼即明（哪里可点、下一步做什么），完全无需学习或猜测？
2. **看 3 秒钟（简约检验）**：界面是否存在多余的客服组件、杂色光晕、廉价 Emoji 或刺眼高斯模糊？
3. **看 10 秒钟（现代神秘检验）**：界面的整体色调、字距节奏与动效，是否让用户内心宁静、感到专业权威并心生敬畏？
4. **看双模式（双模与打印检验）**：在 Light 模式（宣纸暖白）、Dark 模式（太极墨夜）以及 `Ctrl+P` 打印预览下，界面文字是否清晰可辨（无白底白字、对比度达标），色彩与卡片质感是否和谐典雅？

---

### 5. 机缘规则与商业化命名体系规范 (Karma Economy & Monetization Specification)

全站商业化与点数流转体系必须严格遵循统一的东方命理学命名体系与设计规范，严禁任何现代化游戏币、代币、电商积分或廉价口语污染产品体验。

#### 5.1 统一命名体系与词汇表 (Unified Taxonomy & Nomenclature)

| 概念分类 | 统一标准中文名 | 统一标准英文名 | 严禁使用之非标用词 (Forbidden Anti-Patterns) |
| :--- | :--- | :--- | :--- |
| **点数单位** | **机缘** / **机缘点** | **Karma** / **Karma Credits** | 代币, 积分, 金币, 点数, Token, Coins, Credits (泛指) |
| **大运流年分阶规则**| **大运阶梯法则** / **大运之限** | **Decadal Gating Rule** | 解锁规则, 收费门槛, 阶梯付费, Gating, Paywall |
| **整体体系** | **机缘体系** / **天机因果法则**| **Karma Economy & Rules** | 收费系统, 支付系统, 商业化规则, 经济模型 |
| **术数排盘消耗** | **天机启盘** / **启盘机缘** | **Divination Gating Cost** | 算命扣费, 下单支付, 消费, 购买 |
| **深度请益消耗** | **请益机缘** / **解惑求教** | **Consultation Cost** | 提问收费, 客服点数, 对话扣币 |
| **初始/日常赠予** | **善缘赠予** / **晨夕感应** | **Karma Inflow & Rewards** | 新人礼包, 签到金币, 薅羊毛, 赠币 |
| **分享引荐** | **广结善缘** | **Referral Karma** | 邀请返佣, 拉新奖励, 裂变代币 |
| **扣减动作动词** | **结付** / **借由机缘** | **Honor with Karma** | 购买, 扣款, 消费, 扣除, 付钱 |

#### 5.2 易学哲学根基与设计原理 (Philosophical Foundations)

1. **阴阳太极与因果守恒**：
   - 易道推演乃探问天道幽微之理，古法筮爻讲求“心诚则灵，卦不走空”。用户在窥探天命因果时，以「机缘」为引借力启盘，契合因果守恒定律，化俗气之金钱交易为文雅之因果结缘。
2. **“三十年世，立命后运”之大运阶梯法则**：
   - 古制三十年为一世，亦即人生三大步大运（每步大运管十年）。
   - **前三步大运（约 0 ~ 30 岁）完全免费**：涵盖求学、立命、初涉俗世之初生阶段，天地有好生之德，玄机平台怀慈悲结缘之心，对这三十年之大运及逐年流年精批完全无门槛开放；
   - **第四步大运及之后（30 岁+）每步结付 1 机缘点**：三十而立，立业涉世之后，步入后运，每解锁窥探一步大运（含十年流年星度、岁运刑冲克害与行事宜忌），需结付 1 点机缘，即为「大运阶梯法则」。

#### 5.3 综合机缘配置与 Admin 键值矩阵 (Karma Economy Configuration Matrix)

所有数值均在数据库 `AdminSetting` 表中持久化，并由后台管理页面（`/admin/settings`）的「**機緣體系與收費規則 / Karma Economy & Gating Rules**」面板直接动态调整，无需重启服务：

| 维度 | 配置项 Key | 默认值 | 语义名称 (中/英) | 业务说明 |
| :--- | :--- | :--- | :--- | :--- |
| **善缘赠予** | `registerBonus` | `6` | 註冊善緣 / Register Karma | 新用户注册成功时自动结缘赠送的点数 |
| **善缘赠予** | `dailyBonusCredits` | `2` | 晨夕感應 / Daily Login Karma | 每日首次登录平台结缘赠送的点数 |
| **善缘赠予** | `shareBonus` | `20` | 廣結善緣 / Referral Karma | 邀请好友注册成功后，双方各得之机缘点 |
| **善缘赠予** | `shareBonusChat` | `5` | 舊版分享兼容 / Legacy Chat Bonus | 兼容早期版本聊天次数的配置项 |
| **天机启盘** | `cost_bazi` | `5` | 八字命理啟盤 / BaZi Cost | 四柱八字排盘与终生大运精批启盘消耗 |
| **天机启盘** | `cost_ziwei` | `5` | 紫微斗數排盤 / Zi Wei Cost | 紫微十二宫排盘与格局详批启盘消耗 |
| **天机启盘** | `cost_qimen` | `5` | 奇門遁甲起局 / Qi Men Cost | 奇门九宫飞布与时空局象启盘消耗 |
| **天机启盘** | `cost_meihua` | `3` | 梅花易數起卦 / Mei Hua Cost | 先天后天梅花卦象推演启盘消耗 |
| **天机启盘** | `cost_iching` | `3` | 周易筮爻求筮 / I Ching Cost | 六十四卦文王卦象推演启盘消耗 |
| **天机启盘** | `cost_liuyao` | `3` | 六爻納甲立卦 / Liu Yao Cost | 纳甲装卦与世应生克推演启盘消耗 |
| **天机启盘** | `cost_fengshui`| `3` | 堪輿風水定穴 / Feng Shui Cost | 九宫飞星与宅运勘舆排盘消耗 |
| **深入请益** | `cost_chat` | `2` | 卦盤深入解惑 / In-depth Chat Cost| 命盘/卦象专属深入问答每次消耗 |
| **深入请益** | `cost_master` | `1` | 請益玄機大師 / Ask Master Cost | 跨时空命理大师长上下文对话每问消耗 |
| **大运阶梯** | `free_dayun_limit`| `3` | 免費大運步數 / Free DaYun Limit | 前 $N$ 步大运（每步十年）完全免费开放 |
| **大运阶梯** | `cost_dayun_unlock`| `1` | 大運解鎖機緣 / Decadal Unlock Karma | 超过免费限额后，每解锁一步大运所需机缘 |

#### 5.4 技术实现与调用规范 (Technical Architecture & APIs)

1. **服务单例（Single Source of Truth）**：
   - `src/lib/creditService.ts`：
     - `getCost(type: string): Promise<number>`：动态获取当前后台配置的启盘/请益消耗；
     - `getKarmaRules(): Promise<{ freeDaYunLimit: number; costDayunUnlock: number }>`：获取当前大运阶梯规则；
     - `deductCredits(userId, type, note): Promise<boolean>`：原子扣减，若余额不足安全拦截，成功后写入 `CreditLog` 审计流。
2. **纯粹算法与判别核心**：
   - `src/lib/baziCalculator.ts`：
     - `isDaYunUnlocked(decadeIndex: number, unlockedDecades: number[], freeLimit: number = 3): boolean`
     - 判定算法：`decadeIndex < freeLimit || unlockedDecades.includes(decadeIndex)`
3. **接口契约**：
   - `GET /api/credits`：客户端拉取当前可用余额、各功能配置成本矩阵与 `rules`（大运阶梯规则参数）；
   - `POST /api/credits/consume`：原子扣除机缘接口，传入 `{ type: 'dayun_unlock', decadeIndex: number, readingId?: string }`。

#### 5.5 文案与交互礼仪 (Etiquette & Copywriting Standards)

- 严禁出现“余额不足，请充值”、“付费解锁”等生硬电商文案；
- 余额不足时统一提示：“**機緣點暫缺，可由每日晨夕感應或引薦同道結緣獲取。**”（“Insufficient Karma credits. Please acquire through daily reflection or referrals.”）；
- 加锁提示卡片必须展现古铜锁印微动效，并辅以《易经》古雅箴言，庄严昭示三十年立命与人生阶段演进意义。

