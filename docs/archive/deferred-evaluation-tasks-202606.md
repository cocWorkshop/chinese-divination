# Deferred Evaluation Tasks

> **STATUS UPDATE 2026-06-12 — both tasks decided and executed:**
> **Task A (school tables):** owner chose **mainstream defaults**; all items below
> were aligned (bazi 国印/德秀/天德合/红艳/八专; qimen 三奇得門 rename, 天遁/人遁/
> 玉女守门 classical conditions, 入墓 tables per 阴阳长生; ziwei 明珠出海/日月并明
> classical definitions). Value-level tests: `src/lib/__tests__/mainstreamAlignment.test.ts`.
> **Task B:** B1 (rate limiting) remains trigger-gated per the architecture plan;
> B2 decided — helpful auth messages KEPT (enumeration accepted as UX trade-off),
> the `authorize()` timing side-channel fixed with dummy-bcrypt equalizers.
> The body below is kept as the historical analysis.

Two areas were intentionally left out of the 2026-06-10 audit/fix pass because they
need a **decision** rather than an objective bug fix. This document captures the
full context so they can be evaluated later without re-deriving anything.

> Status as of 2026-06-10: **not started.** Everything else from the audit is fixed
> (see git log around this date and `MEMORY.md`).

---

## Task A — School-variant 神煞 / 格局 tables (needs a "which tradition?" decision)

These are **not** clear-cut bugs like the 灾煞 copy-paste (already fixed). Each one is
a divination table whose "correct" values differ between schools/lineages. Changing
them means committing the app to one tradition. We should:

1. Decide which reference(s) the app follows (e.g. 《三命通會》/《淵海子平》 for 子平 神煞,
   問真 for qimen, 中州派 vs 三合派 for 紫微). The owner uses **問真** for qimen day
   boundaries already (see `MEMORY.md` → ganzhi-day-boundary-convention) — extending a
   single declared reference per system would resolve all of these at once.
2. For each item below, either confirm the current value matches the chosen school, or
   correct it and add a value-level regression test.

> Reminder: these feed the **LLM prompt context**, not a deterministic user-facing
> verdict, so a wrong entry degrades interpretation quality rather than crashing. That
> is why they're lower priority than the structural bugs.

### A1. BaZi 神煞 (`src/lib/baziCalculator.ts`)

| 神煞 | Location | Current code | Standard (one common school) | Note |
|---|---|---|---|---|
| 国印贵人 | `:1022-1029` `guoyinMap` | keyed by **year branch** → branch (+8 pattern: 寅→戌, 卯→亥, …) | stem-based: 甲→戌, 乙→亥, 丙/戊→丑, 丁/己→寅, 庚→辰, 辛→巳, 壬→未, 癸→申 (from year/day **stem**) | The branch→branch table is not a recognized 国印 rule. |
| 德秀贵人 | `:1031-1040` `dexiuMap` | grouped by adjacent branches (寅卯→丙丁, 巳午→庚辛, …) | grouped by **三合局**: 寅午戌月→丙丁, 申子辰月→壬癸, 巳酉丑月→庚辛, 亥卯未月→甲乙 | 8 of 12 month entries differ (e.g. 卯月 should be 甲乙, coded 丙丁). |
| 天德合 | `:1042-1049` `tiandeheMap` | 四仲月 (卯午酉子) given stems 癸/甲/辛/庚 | For 四仲月 the 天德 is a branch/trigram (申/亥/寅/巳); 天德合 is then the 六合 branch (巳/寅/亥/申) **or absent**. The 8 stem-months are already correct. | Only the 4 四仲-month entries are questionable. |
| 红艳煞 | `:1190-1197` `hongyanMap` | `'乙': '午'`, `'癸': '申'` | Verse 「甲乙午申」 → 甲→午, **乙→申**. 癸→申 vs 癸→寅 is school-variant. | 乙 is the clear one; 癸 is a genuine school split. |
| 八专日 | `:1184-1188` `bazhuanDays` | includes 壬子, 癸亥 | classical 八专: 甲寅 乙卯 丁未 己未 庚申 辛酉 **癸丑 戊戌** | School-variant list; current set has 壬子/癸亥 instead of 癸丑/戊戌. |

### A2. QiMen 格局 (`src/lib/qimenCalculator.ts`, `detectPatterns`)

(The clear烟波钓叟歌 errors — 青龙逃走/白虎猖狂 stems, and 门迫 direction — were **already
fixed** in this pass. The following are the genuinely school-variant ones left.)

| 格局 | Location | Issue |
|---|---|---|
| 三奇得使 | `:201` | Code fires on 乙丙丁 + 开/休/生门, which is **三奇得門**. 「三奇得使」 is a distinct rule (奇 + the specific 值使/六甲 timing). Decide which one the app means and rename or re-condition. |
| 天遁 | `:204` | Coded 丙(天)+戊(地)+生门. Common definition: 生门 + 丙奇 临 **六丁**. |
| 人遁 | `:206` | Coded 丁(天)+己(地)+休门. Standard: 休门 + 丁奇 + **太阴** (uses the 八神/divinity field, currently unused). |
| 玉女守门 | `:209` | Coded 丁+己+开门. Standard: 丁奇 临 **值使门** 之宫. |
| 三奇入墓 | `:213` | Palace mapping is school-variant (code comment already flags it as unverified). 乙 tomb is at 乾6 here but 坤2 in the `stemTombs` table — pick one scheme. |
| 六仪/天干入墓 (`stemTombs`) | `:171-176` | `'丁': 2` (坤/未) matches neither the element scheme (火墓戌→乾6) nor the yin-stem 长生 scheme (丁墓丑→艮8) the comment describes. |

### A3. ZiWei 格局 (`src/lib/ziweiPatterns.ts`)

| 格局 | Location | Issue |
|---|---|---|
| 明珠出海 / 日月并明 | `:162-198` | Classical 明珠出海 requires 命宫在未 (借星) with 太阳在卯、太阴在亥. The coded 太阳辰/太阴戌 is actually a 日月并明 configuration; the coded 日月并明 (巳午/酉戌) is a looser brightness check. Neither checks 命宫, so the pattern can fire when 日/月 sit in irrelevant palaces. |

### Recommended approach for Task A
- One PR per system (bazi / qimen / ziwei), each gated on the owner naming the reference.
- For every changed table, add a **value-level regression test** asserting a known
  chart → known 神煞/格局 (the audit already showed shape-only tests let these drift).
- Where a value is a true 50/50 school split (e.g. 癸 红艳, 三奇得使 vs 得門), document the
  choice in a code comment so it isn't "fixed" back and forth later.

---

## Task B — Infrastructure / hardening (needs infra, not a one-line fix)

### B1. Distributed rate limiting (`src/lib/rateLimiter.ts`)

**Current:** `rateLimit()` keeps counters in a module-level `Map`. Used by register,
login, forgot-password, errors, start/init, start/complete.

**Problems:**
1. **Per-instance** — the app ships a standalone Docker build and can be scaled
   horizontally; each replica has its own Map, so the effective limit is `N × configured`.
2. **Volatile** — resets on every deploy/restart.
3. **Spoofable key** — keyed on the first hop of `x-forwarded-for`, which a client can set
   unless a trusted proxy overwrites it.

**Consequence:** brute-force / enumeration protection on the auth endpoints is weak in
production (multi-replica or serverless).

**Options to evaluate:**
- Shared store: Redis (`INCR` + `EXPIRE`) or a Postgres table with a TTL sweep. Redis is
  the conventional choice; the app doesn't currently run Redis, so this adds a dependency.
- Trust only the proxy-set client IP (e.g. the platform's `x-real-ip` / leftmost trusted
  hop), not raw `x-forwarded-for`.
- Decision needed: is a new Redis dependency acceptable, or should this ride on Postgres?

**Effort:** medium. Touches the rate-limiter module + every caller's key derivation +
infra (provision Redis or a table + cleanup job).

### B2. User enumeration on auth endpoints

**Current behavior (by file):**
- `register/route.ts` → `409 "Email already registered"` reveals existing accounts.
- `auth/login/route.ts` → distinct codes `TENTATIVE_USER` (403) and `EMAIL_NOT_VERIFIED`
  (403) fire **only for existing** accounts; non-existent emails get
  `INVALID_CREDENTIALS`. The difference enumerates registered emails + their state.
- `resend-verification/route.ts` `check` mode → returns `{unverified}` / `false`,
  directly distinguishing existent/verified/non-existent.
- `auth.ts` `authorize()` → returns early (no bcrypt compare) when the user/password is
  absent, so response **timing** also leaks existence (a timing side-channel).

**Tension:** `forgot-password` is already done right (always one generic response). But the
ad-funnel UX *intends* to tell a tentative user "finish signup" — so fully generic
messaging would hurt that flow. This is a **product decision**, not a pure bug:

**Options to evaluate:**
1. Accept enumeration on register/login as a UX tradeoff, and only harden the timing
   side-channel in `authorize()` (cheap: run a dummy bcrypt compare on the no-user path so
   all branches take comparable time). **Recommended minimum.**
2. Make register/login responses uniform and move the "finish signup / verify email"
   guidance behind an authenticated or post-generic-response step.
3. Pair whichever choice with B1 (real rate limiting), which is the more impactful
   mitigation regardless.

**Effort:** the timing fix (option 1) is ~5 lines and low-risk; full de-enumeration is a
UX change that needs sign-off.

---

## Also worth tracking (medium, mentioned in the audit, not in the two "left" buckets)

- **deductCredits-after-LLM / multi-`/init` race** (`api/divination/route.ts`): the
  worst path (arbitrary `readingId`) is now closed, but a user with a small balance can
  still call `/init` N times (each only *checks* credits) then run N divinations; the
  end-of-request `deductCredits` is atomic so ≤1 succeeds, yet N readings are delivered.
  Proper fix = reserve/deduct at `/init` (or a pre-LLM atomic hold) and refund on failure.
  Deferred because it's a billing-flow refactor with streaming implications.
- **LLM logs store PII** (`llmLogger`): `inputPreview` / `systemPrompt` persist birth and
  life-context data at rest. Privacy/retention review, not a correctness bug.
