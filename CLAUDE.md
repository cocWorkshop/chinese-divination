# CLAUDE.md

Orientation for Claude Code working in this repo.

## Project Overview

**玄機AI XuanJi** — full-stack AI-powered Chinese divination platform. Supports BaZi (八字), I Ching (易經), Liu Yao (六爻), Zi Wei Dou Shu (紫微斗數), Qi Men Dun Jia (奇門遁甲), Feng Shui (風水), and Mei Hua (梅花易數). Bilingual (zh/en), credit-based with Stripe subscriptions, web + Android (Capacitor).

Divination calculators are deterministic TypeScript; user-facing interpretations come from Claude / OpenRouter using prompt context in `divination-refs/*.md`.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript 5 (strict)
- **Database:** PostgreSQL + Prisma 6
- **Auth:** NextAuth 5 beta (credentials) + bcryptjs
- **AI:** `@anthropic-ai/sdk` (Claude proxy), `openai` (OpenRouter) — unified via `src/lib/llm/`
- **UI:** Tailwind CSS 3, Framer Motion 11, react-hot-toast, react-markdown
- **Payments / Email:** Stripe 20, Resend 6
- **Divination libs:** iztro, lunar-typescript, taobi
- **Mobile:** Capacitor 8 (Android)
- **Tests:** Vitest 4
- **Package manager:** npm

## Commands

```bash
npm install                # install deps
npm run dev                # prisma generate + migrate deploy + next dev on 0.0.0.0:8088
npm run build              # next build (standalone output for Docker)
npm start                  # next start
npm run lint               # next lint (ESLint)
npm run db:generate        # prisma generate
npm run db:migrate         # prisma migrate dev (interactive) — the correct way to change schema
npm run db:push            # prisma db push — ⚠️ AVOID on dev/prod (drifts migration history); local-throwaway only
npx vitest                 # run unit tests
npx tsc --noEmit           # typecheck (no dedicated script)
./tests/run_tests.sh       # shell integration test suite
./scripts/setup-db.sh      # initialize PostgreSQL
./scripts/make-admin.sh    # promote user to admin
```

## Directory Structure

```
src/
  app/                     # Next.js App Router (pages + API)
    (divination)/          # divination route group
    (auth)/                # login/register
    (legal)/               # legal pages
    api/                   # divination, auth, admin (18+), chat, credits, profile
      divination/
        handlers/          # modular per-type divination handlers
          personal/        # birth-profile based: bazi.ts, ziwei.ts, other.ts (birth 梅花)
          event/           # event-time based: qimen.ts, liuyao.ts, meihua.ts, fengshui.ts, iching.ts
          index.ts         # handler registry + selectHandler() dispatcher
          _types.ts        # DivinationHandler interface contract
          _birthProfile.ts _systemPrompt.ts _jsonParse.ts _suggestedQuestions.ts _fallback.ts _meihuaShared.ts
          __tests__/
    admin/  dashboard/  profile/  divination/  wiki/
    layout.tsx  page.tsx  globals.css
  components/              # React components
    results/               # per-system result views
    master/                # global Xuanji Master chat widget
      MasterChatContext.tsx  # React Context + SSE streaming + reading-complete event listener
      MasterChatWidget.tsx   # two-shape (collapsed bar / expanded fullscreen) chat UI
    Navbar.tsx  Footer.tsx  ThemeProvider.tsx  LanguageContext.tsx
  lib/                     # core logic
    llm/                   # unified LLM abstraction layer
      types.ts  settings.ts  prompts.ts  complete.ts  stream.ts  reasoning.ts  index.ts
      providers/           # claudeProxy.ts (blocking), openrouter.ts (OpenAI SDK)
      __tests__/
    master/                # Xuanji Master agent module (tool registry + slicers + prompt)
      index.ts             # public API surface
      slicers/             # progressive-disclosure: bazi.ts, ziwei.ts, _identity.ts, index.ts
      tools/               # six tools: getUserProfile, listFamilyMembers, listReadings,
                           #   getReading, getReadingDetail, prefillDivinationForm
                           #   + _types.ts _errors.ts _registry.ts _zodToToolSchema.ts
      systemPrompt/        # persona.ts (loads master.md) + capabilityCatalog.ts (from registry)
                           #   + buildSystemPrompt.ts (persona + catalog + skills + context)
      skills/              # composite workflow definitions: baziHepan, guaMingHuCan
                           #   + _types.ts + buildSkillsCatalog() for prompt injection
      __tests__/
    baziCalculator.ts  ziweiCalculator.ts  ziweiPatterns.ts
    fengshuiCalculator.ts  liuyaoCalculator.ts  qimenCalculator.ts  meihuaCalculator.ts
    auth.ts  prisma.ts  cities.ts  trueSolarTime.ts  dstDetection.ts
    creditLogger.ts  stripe.ts  email.ts
    __tests__/             # Vitest unit tests
  types/                   # divination.ts, master.ts, next-auth.d.ts
  hooks/
prisma/
  schema.prisma            # 30+ tables (User, Reading, Notification, credits, Stripe)
  migrations/
divination-refs/           # LLM prompt reference docs (bazi, iching, ziwei, qimen, fengshui, others, master)
android/                   # Capacitor Android project
public/  docs/  scripts/  tests/
next.config.js  tsconfig.json  tailwind.config.js  vitest.config.ts
capacitor.config.ts  Dockerfile  docker-compose.yml  start.js  .env.example
```

## Architecture Notes

- Bilingual (zh-TW/en) via `src/components/LanguageContext.tsx`.
- Credit-based rate limiting; Stripe top-ups + daily bonuses; logs via `src/lib/creditLogger.ts`.
- LLM requests are long-running — server configured for 600s+ timeouts (`start.js`, `next.config.js`).
- `src/lib/prisma.ts` exports a Prisma singleton — import from there, do not `new PrismaClient()`.
- Path alias `@/*` → `./src/*`.
- Dev server runs migrations automatically on `npm run dev`.

### LLM Module (`src/lib/llm/`)

Unified abstraction over LLM providers. All API routes use this instead of raw SDK calls.

- `completeLLM()` — blocking completion (supports both OpenRouter and Claude proxy).
- `streamLLM()` — streaming completion with tool-calling support (OpenRouter only).
- `resolveLLMConfig()` — resolves model/tokens/timeout/reasoningEffort per endpoint (`divination`/`chat`/`master`) via fallback chain: caller override → AdminSetting → env var → default. Served through a 60s process-wide cache (`clearLLMSettingsCache()` for tests).
- **Reasoning / extended thinking**: every call carries a `reasoningEffort` (`'low'|'medium'|'high'|'off'`). Per-endpoint defaults: **divination = medium, chat/master = low**. Per-endpoint AdminSetting keys: `divinationReasoningEffort`, `chatReasoningEffort`; global fallback `llmReasoningEffort`. Env equivalents: `DIVINATION_REASONING_EFFORT`, `CHAT_REASONING_EFFORT`, `LLM_REASONING_EFFORT`. Reasoning text is captured in `CompletionResult.reasoning` and logged, never mixed into user-visible `content`.
- **JSON mode**: callers may pass `responseFormat: { type: 'json_object' }` (OpenAI-style `response_format`, forwarded by OpenRouter). The divination route enables it by default, preventing malformed-JSON output at the source; the parse/repair ladder in `handlers/_jsonParse.ts` stays as defense-in-depth. Providers that reject the param trigger one automatic retry without it. Escape hatch: `DIVINATION_JSON_MODE=off`. `CompletionResult.finishReason` is captured; `finish_reason=length` (truncation by `max_tokens`) logs a loud warning — fix the token budget, not the parser.
- `loadDivinationPrompt()` — lazy-loads divination reference markdown from `divination-refs/` with in-memory cache.
- Providers: `providers/openrouter.ts` (OpenAI SDK wrapper), `providers/claudeProxy.ts` (local Claude CLI, blocking only; reasoning param silently skipped on this branch).

### Xuanji Master Module (`src/lib/master/`)

Global chat agent that reads the user's divination state and redirects to the UI form when a new reading is needed. **Never computes readings itself; never deducts credits via calculators; never writes profile/family state** — all writes flow through the validated divination + family-member UI pipeline.

**Six tools** (read-only, registered via `masterToolRegistry`):
- `get_user_profile` — user's birth profile + `isComplete` flag.
- `list_family_members` — all FamilyMember rows with `isComplete` and `relationDetail`.
- `list_readings` — metadata-only reading listing filtered by type/target.
- `get_reading` — slim header + overview + fetchable-sections TOC (per slicer).
- `get_reading_detail` — one named section by key (progressive disclosure).
- `prefill_divination_form` — pure URL builder returning a CTA card payload that navigates the user to a pre-filled `/divination/[type]` page.

**Slicers** (`slicers/`): pure functions that split a stored `Reading.result` into a compact header + enumerable section keys. `bazi.ts` keeps pillars/dayMaster/fiveElements/formation in header; bulky fields (daYun, liuNian, branchRelationships, shenSha) become fetchable sections. `ziwei.ts` keeps chart metadata + formation + 12-palace preview + 命宫 in header; full palaces + daYunAnalysis + keyPredictions are sections. Smaller types (iching/qimen/meihua/fengshui/liuyao) use an identity slicer (whole result in header).

**System prompt composer** (`systemPrompt/`): `buildMasterSystemPrompt()` assembles persona (loaded once from `divination-refs/master.md`) + capability catalog (generated from the tool registry, so it can't drift) + skills catalog (language-aware) + dynamic context (lang, current datetime, optional legacy portrait). The stable prefix benefits from Anthropic's 5-min prompt cache across turns.

**Skills** (`skills/`): composite workflows the master follows as recipes. Each skill is a typed `SkillDef` with id, zh/en names, description, prerequisites, trigger cues, and a prose recipe that explicitly lists the tool calls in order; `buildSkillsCatalog()` injects them into the system prompt. Two shapes — **synthesis** (`bazi_hepan` 八字合盤, `xing_ming_he_can` 星命合參, `gua_ming_hu_can` 卦命互參) and **applied technique** (`ze_ri` 擇日, `ying_qi` 應期推算, `kai_yun` 開運調理, `feng_shui_tiao_li` 風水調理建議). **Adding a skill is one new file + one registry entry** in `skills/index.ts`, zero changes to tools or routes. The §Skills section of `divination-refs/master.md` frames when/how the master reaches for them.

**Master UI** (`src/components/master/`): global persistent chat widget mounted at the root layout. Two shapes:
- **Collapsed** — bottom input bar on every page; shows a "waiting for your reading..." status when `pendingReading` is set.
- **Expanded** — fullscreen overlay with transcript, markdown rendering, CTA cards, and tool-status animation.

CTA card rendering: when the master calls `prefill_divination_form`, the route emits an SSE `cta_card` event whose payload the widget renders as a clickable card. Clicking navigates to the divination page with form fields hydrated from query params. On save, the divination page dispatches `window.dispatchEvent('xuanji:readingComplete', { detail: { readingId, type } })` which the provider catches, auto-expands the widget, and injects a synthetic user turn so the master pulls the new reading into context.

### Divination Handler System (`src/app/api/divination/handlers/`)

Each divination type implements the `DivinationHandler` interface (`_types.ts`):
- `schema` (required) — Zod schema defining expected LLM output structure.
- `canHandle(ctx)` — checks if required inputs are present.
- `calculate(ctx)` — runs the programmatic calculator, builds the LLM user message.
- `buildSchema(ctx)` (optional) — override to customize the JSON template sent to the LLM. Default: `schemaToLLMTemplate(handler.schema) + suggestedQuestions`.
- `merge(llmResult, chart, ctx)` (optional) — merges programmatic chart data into parsed LLM output.

Handlers are split into two groups:
- **Personal** (birth-profile based): `bazi`, `ziwei`, `other` (birth 梅花) — share `_birthProfile.ts` preprocessing.
- **Event** (event-time based): `qimen`, `liuyao`, `meihua`, `fengshui`, `iching`.

`selectHandler(ctx)` dispatches to the correct handler or falls back to `fallbackHandler` for generic analysis.

Route orchestration flow: auth → credits → `selectHandler()` → `calculate()` → LLM call → parse → `merge()` → Zod validate → save.

### BaZi Calculator (`src/lib/baziCalculator.ts`)

Core deterministic calculator for BaZi (八字 / Four Pillars of Destiny). V2 uses `tyme4ts` (successor to `lunar-typescript`). V1 preserved as `baziCalculator.v1.ts` (deprecated).

**`calculateBazi(birthDate, birthTime, birthPlace, gender, exactTime?, birthLng?, birthLat?, options?): BaziChart`**

Input:
```typescript
birthDate: string              // "YYYY-MM-DD"
birthTime: string              // shichen name ("zi_early"|"zi_late"|"chou"|...) for fuzzy mode
birthPlace: string             // city name for longitude lookup
gender: 'male' | 'female'
exactTime?: string             // "HH:MM" for precise mode (enables true solar time correction)
birthLng?: number | null       // explicit longitude from geocoder (overrides city lookup)
birthLat?: number | null       // explicit latitude for DST detection
options?: BaziOptions          // optional advanced configuration
```

`BaziOptions`:
```typescript
{
  eightCharProvider?: 'default' | 'lunarSect2'       // 子时 convention (default: 'default')
  childLimitProvider?: 'default' | 'china95' | 'lunarSect1' | 'lunarSect2'  // 起运 algorithm (default: 'default')
  liuNianCount?: number                               // number of 流年 to compute (default: 80)
}
```

Output (`BaziChart`):
```typescript
{
  yearPillar: PillarData       // 年柱
  monthPillar: PillarData      // 月柱
  dayPillar: PillarData        // 日柱
  hourPillar: PillarData       // 时柱
  dayMaster: { stem, element, yinYang }  // 日主
  fiveElements: { metal, wood, water, fire, earth }  // 五行 weighted counts
  strength: 'strong'|'weak'|'neutral'    // 身强/身弱/中和
  strengthLabel: string                   // "身强"|"身弱"|"中和"
  luckyElements: string[]                 // 喜用神
  avoidElements: string[]                 // 忌神
  trueSolarTime?: { ... }                 // only in precise mode
  daYun: DaYunPillar[]         // 大运 (8 ten-year periods)
  xiaoYun: XiaoYunPillar[]     // 小运 (annual, before qi yun starts)
  qiYun: QiYunInfo             // 起运 (when luck cycles begin)
  liuNian?: LiuNianPillar[]    // 流年 (annual fortune with ten god + lucky flag)
  branchRelationships?: BranchRelationships  // 六冲/六合/六害/三刑
  hideHeavenStemDay?: { stem, type }    // 人元司令分野
  fetalOrigin?: string         // 胎元
  ownSign?: string             // 命宫
  bodySign?: string            // 身宫
}

// LiuNianPillar — annual fortune
{ stem, branch, nayin, age, year, tenGod: string, isLucky: boolean|null }

// BranchRelationships — natal chart branch interactions
{ clashes: [...], combines: [...], harms: [...], punishments: [...] }
```

#### LLM Output Schema V2 (`baziSchemaV2`)

The handler uses `baziSchemaV2` (V1 `baziSchema` kept for old readings). Key V2 additions:
- `version: 2` — enables UI version dispatch (`BaziResultV2` vs `BaziResult`)
- `formation: { name, analysis }` — 格局 name and 50+ char analysis
- `seasonalNote` — 调候 analysis (optional)
- `daYunAnalysis: [{ stem, branch, startAge, endAge, startYear, endYear, theme, interactions, keyYears: [{ year, ganZhi, event }], advice }]` — structured per-decade analysis (replaces V1's monolithic `daYunDetail` string)
- `branchAnalysis` — LLM interpretation of pre-computed 冲/合/害/刑
- `sections` no longer includes `daYunDetail` (moved to `daYunAnalysis`)
- `luckyInfo` no longer includes `numbers` (low value)

### Zod Schema System (`src/app/api/divination/schemas/`)

Each handler's LLM output schema is defined once in Zod, serving as single source of truth for:
1. **LLM prompt template** — `schemaToLLMTemplate()` walks the Zod schema and produces the plain JSON template embedded in the system prompt. Uses `.describe()` for instruction strings (e.g. `z.string().describe('事业分析(150+字)')` → `"事业分析(150+字)"`), `.default()` for example values, `z.enum()` for option hints (e.g. `z.enum(['吉','凶','中'])` → `"吉/凶/中"`).
2. **Runtime validation** — `validateHandlerOutput()` uses `schema.passthrough().safeParse()` to validate LLM output.
3. **TypeScript types** — `z.infer<typeof schema>` derives result types.

#### LLM Output Validation Policy

Validation is **permissive** — LLM output is inherently imperfect:
- `schema.passthrough().safeParse()` validates structure while preserving merge-injected extra fields (`trueSolarTime`, `ziweiChart`, `qimenChart`, etc.).
- On validation failure: Zod issues are **logged** for debugging. The result is only **hard-rejected** if both `sections` and `interpretation` are missing — otherwise the partial result is accepted and saved. This avoids discarding useful readings over minor schema mismatches.
- Credits are **not deducted** on hard-reject; the user sees an error message prompting retry.

Key files:
- `schemas/_toLLMTemplate.ts` — Zod→JSON template walker (Zod v4 compatible).
- `schemas/_validate.ts` — `validateLLMOutput()` permissive validation helper.
- `schemas/{type}.schema.ts` — per-type Zod schemas.
- `handlers/index.ts` — `buildHandlerSchema()` and `validateHandlerOutput()` entry points.

## Conventions

- **Database changes — always use Prisma Migrate; never `db push` on dev/prod.** Edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <desc>` (creates a migration file — **commit it with the code**). Prod applies pending migrations automatically via `migrate deploy` in `start.js`. **Do not run `prisma db push`** against the dev or prod DB: it mutates the schema without recording a migration, silently drifting the history (this already happened once — see the recovery + **one-time prod reconciliation runbook** in `docs/prisma-migrations-recovery.md`, required reading before the next prod deploy). Sanity check anytime with `npx prisma migrate status` (should say "up to date"); if `migrate dev` ever wants to **reset the DB**, stop — you've drifted, don't confirm.
- TypeScript strict mode is on.
- No Prettier config — rely on ESLint via `next lint`.
- Vitest tests colocated under `src/lib/__tests__/`, `src/lib/llm/__tests__/`, `src/app/api/divination/handlers/__tests__/`, and `src/app/api/divination/schemas/__tests__/`.
- New divination types: define a Zod schema in `schemas/{type}.schema.ts`, implement `DivinationHandler` in `handlers/personal/` or `handlers/event/`, register in `handlers/index.ts`. Add a snapshot test verifying `schemaToLLMTemplate()` output matches the intended LLM prompt.
- LLM calls: use `completeLLM()` / `streamLLM()` from `@/lib/llm` — do not instantiate OpenAI or Anthropic SDK directly in routes.
- Env template in `.env.example`.
