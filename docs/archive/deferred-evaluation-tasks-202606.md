# Deferred Evaluation Tasks

> **STATUS UPDATE 2026-06-12 — both tasks decided and executed:**  
> **Task A (school tables):** The owner chose **mainstream defaults**; all items below
> were aligned (BaZi Guo Yin / De Xiu / Tian De He / Hong Yan / Ba Zhuan; Qi Men San Qi De Men rename, Tian Dun / Ren Dun /
> Yu Nv Shou Men classical conditions, Ru Mu grave tables per Yin-Yang Chang Sheng; Zi Wei Pearl Emerging from the Sea / Sun and Moon in Mutual Radiance
> classical definitions). Value-level regression tests: `src/lib/__tests__/mainstreamAlignment.test.ts`.  
> **Task B:** B1 (rate limiting) remains trigger-gated per the architecture plan;
> B2 decided — helpful auth messages KEPT (enumeration accepted as UX trade-off),
> the `authorize()` timing side-channel fixed with dummy-bcrypt equalizers.  
> The body below is preserved as historical analysis.

Two areas were intentionally deferred from the 2026-06-10 audit pass because they
required a **strategic decision** rather than an objective bug fix. This document captures
the full context so they can be evaluated without re-deriving domain premises.

> Status as of 2026-06-10: **not started.** Everything else from the audit is fixed
> (see git log around this date and `MEMORY.md`).

---

## Task A — Lineage-Variant Shensha & Formation Tables (Tradition Selection Decision)

These are **not** straightforward copy-paste bugs like the Zai Sha issue (which was fixed). Each item represents
a divination table whose canonical values differ across metaphysical schools and lineages. Changing
them requires committing the application to specific traditional references:

1. Standardize which canonical references the application follows (e.g., *San Ming Tong Hui* / *Yuan Hai Zi Ping* for Zi Ping Shensha,
   Wen Zhen for Qi Men, Zhongzhou School vs. Sanhe School for Zi Wei Dou Shu). The owner already adheres to **Wen Zhen** for Qi Men day
   boundaries (see `MEMORY.md` -> ganzhi-day-boundary-convention)—extending a single declared authority per system resolves all of these consistently.
2. For each item below, either confirm the current code reflects the selected school, or
   align it and add value-level regression tests.

> Reminder: These values populate the **LLM prompt context** rather than deterministic user-facing
> verdicts, so an incorrect entry degrades interpretation depth rather than causing application crashes.

### A1. BaZi Shensha (`src/lib/baziCalculator.ts`)

| Shensha | Location | Current Code | Standard (Common Mainstream School) | Notes |
|---|---|---|---|---|
| Guo Yin Nobleman (State Seal) | `:1022-1029` `guoyinMap` | Keyed by **year branch** -> branch (+8 pattern: Yin->Xu, Mao->Hai, etc.) | Stem-based: Jia->Xu, Yi->Hai, Bing/Wu->Chou, Ding/Ji->Yin, Geng->Chen, Xin->Si, Ren->Wei, Gui->Shen (from year/day **stem**) | Branch-to-branch mappings do not match standard Guo Yin rules. |
| De Xiu Nobleman | `:1031-1040` `dexiuMap` | Grouped by adjacent branches (Yin-Mao->Bing-Ding, Si-Wu->Geng-Xin, etc.) | Grouped by **Three Combination Bureaus**: Yin-Wu-Xu months->Bing-Ding, Shen-Zi-Chen months->Ren-Gui, Si-You-Chou months->Geng-Xin, Hai-Mao-Wei months->Jia-Yi | 8 of 12 month entries differ. |
| Tian De He | `:1042-1049` `tiandeheMap` | Cardinal months (Mao, Wu, You, Zi) assigned stems Gui/Jia/Xin/Geng | In cardinal months, Tian De is a branch/trigram; Tian De He is the corresponding Liu He branch **or absent**. The 8 stem months are already correct. | Only the 4 cardinal month entries require verification. |
| Hong Yan Sha (Red Radiance) | `:1190-1197` `hongyanMap` | `'Yi': 'Wu'`, `'Gui': 'Shen'` | Verse dictates Jia-Yi Wu-Shen -> Jia->Wu, **Yi->Shen**. Gui->Shen vs. Gui->Yin reflects lineage variance. | Yi is clear-cut; Gui represents a genuine school split. |
| Ba Zhuan Days | `:1184-1188` `bazhuanDays` | Includes Ren-Zi, Gui-Hai | Classical Ba Zhuan: Jia-Yin, Yi-Mao, Ding-Wei, Ji-Wei, Geng-Shen, Xin-You, **Gui-Chou, Wu-Xu** | Lineage list; current set contains Ren-Zi/Gui-Hai instead of Gui-Chou/Wu-Xu. |

### A2. Qi Men Formations (`src/lib/qimenCalculator.ts`, `detectPatterns`)

(Direct textual errors in the Yan Bo Diao Sou Ge—stems for Green Dragon and White Tiger, and Men Po direction—were **already fixed** in this pass. The following represent lineage-specific variants.)

| Formation | Location | Issue |
|---|---|---|
| Three Nobles Obtaining Messenger (San Qi De Shi) | `:201` | Triggers on Yi/Bing/Ding + Open/Rest/Life gates, which defines **San Qi De Men**. San Qi De Shi is a distinct configuration (Nobles meeting Zhi Shi / Liu Jia timing). Decide which rule applies and rename or adjust conditions. |
| Heaven Shield (Tian Dun) | `:204` | Coded as Bing (Heaven) + Wu (Earth) + Life Gate. Common definition: Life Gate + Bing Noble meeting **Liu Ding**. |
| Human Shield (Ren Dun) | `:206` | Coded as Ding (Heaven) + Ji (Earth) + Rest Gate. Standard: Rest Gate + Ding Noble + **Tai Yin** (requires Spirit Plate, currently unused). |
| Jade Maiden Guarding Door (Yu Nv Shou Men) | `:209` | Coded as Ding + Ji + Open Gate. Standard: Ding Noble positioned at the palace of the **Zhi Shi Gate**. |
| Three Nobles Entering Grave (San Qi Ru Mu) | `:213` | Palace mapping varies across lineages (code comment flags as unverified). Yi grave sits at Qian 6 here but Kun 2 in `stemTombs`—requires a single scheme. |
| Six Instruments / Stems Entering Grave (`stemTombs`) | `:171-176` | `'Ding': 2` (Kun/Wei) matches neither the elemental scheme (Fire grave Xu -> Qian 6) nor the yin-stem Chang Sheng scheme (Ding grave Chou -> Gen 8). |

### A3. Zi Wei Formations (`src/lib/ziweiPatterns.ts`)

| Formation | Location | Issue |
|---|---|---|
| Pearl Emerging from the Sea / Sun and Moon in Mutual Radiance | `:162-198` | Classical Pearl Emerging from the Sea requires Life Palace in Wei (borrowing stars) with Taiyang in Mao and Taiyin in Hai. Current code checking Taiyang in Chen / Taiyin in Xu reflects Sun and Moon in Mutual Radiance. Neither currently verifies Life Palace placement. |

### Recommended Approach for Task A
- Execute one PR per system (BaZi / Qi Men / Zi Wei), specifying canonical references.
- For each updated table, add **value-level regression tests** asserting known natal chart inputs yield exact expected Shensha and formations.
- Where a 50/50 lineage split exists (e.g., Gui Hong Yan, San Qi De Shi vs De Men), document the architectural choice in code comments to avoid churn.

---

## Task B — Infrastructure & Security Hardening

### B1. Distributed Rate Limiting (`src/lib/rateLimiter.ts`)

**Current State**: `rateLimit()` tracks request counters in a module-level in-memory `Map`. Applied across registration,
login, forgot-password, error logging, and onboarding endpoints.

**Architecture Constraints**:
1. **Per-instance isolation**: In horizontally scaled multi-container deployments, each replica maintains its own isolated Map, scaling effective limits to `N * configured`.
2. **Volatile state**: Counters reset on every container deployment or restart.
3. **Client IP derivation**: Relies on `x-forwarded-for`, which can be spoofed unless strictly overwritten by an upstream reverse proxy.

**Consequences**: Brute-force and account enumeration defenses are degraded in multi-replica production environments.

**Evaluation Options**:
- Distributed store: Redis (`INCR` + `EXPIRE`) or a PostgreSQL table with automated sweep jobs.
- Validate only trusted reverse-proxy client IPs (`x-real-ip` or leftmost trusted proxy hop).

### B2. Account Enumeration on Authentication Endpoints

**Current Endpoint Behaviors**:
- `register/route.ts` -> Returning `409 "Email already registered"` reveals existing accounts.
- `auth/login/route.ts` -> Distinct status codes `TENTATIVE_USER` (403) and `EMAIL_NOT_VERIFIED` (403) fire **only for existing** accounts; unregistered emails receive `INVALID_CREDENTIALS`.
- `resend-verification/route.ts` `check` mode -> Returns `{unverified}` / `false`, enumerating registered vs verified state.
- `auth.ts` `authorize()` -> Exits early without bcrypt comparison when user/password is missing, introducing response timing side-channels.

**UX & Security Trade-offs**: While `forgot-password` returns generic responses, the advertising funnel UX explicitly guides tentative users to complete registration. Fully generic messaging creates onboarding friction.

**Evaluation Options**:
1. Accept account status enumeration on register/login as a conscious UX trade-off, hardening only the timing side-channel in `authorize()` via dummy bcrypt comparisons on invalid user paths (**Recommended minimum**).
2. Standardize register/login responses to uniform messaging, moving account completion guidance behind verified steps.
3. Combine either option with distributed rate limiting (B1).

---

## Additional Operational Trackers

- **Credit Deductions & Concurrency in `/init`** (`api/divination/route.ts`): Re-engineered to reserve credits atomically during `/init` and refund on failure.
- **LLM Log PII Minimization** (`llmLogger`): Audit `inputPreview` and `systemPrompt` logging to avoid storing unnecessary personal information in plain text.
