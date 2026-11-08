# XuanJi UI Restyle — Design Execution Prompt & Architectural Specification (2026-10-17)

> **Decisions Locked** (Confirmed 2026-10-17): (1) Complete architectural tokenization (migrating 3,369 raw class instances to semantic tokens, deprecating 187 `!important` cascade overrides); (2) Complete migration across all 13 Admin views; (3) Heading typography transition from Noto Serif SC to Noto Serif TC.  
> **Basis**: `docs/planning/audit-2026-10.md` §4 (HMI/GUI Audit) + full dual-agent repository audit.  
> **Design Language Lineage**: Continues the v2.0 aesthetic guidelines from `docs/260912/2026-09-12-ui-ux-aesthetic-audit-and-redesign.md`, standardizing light mode specifications and engineering rules.

---

## 1. Diagnostics & Audit Findings

### 1.1 AI Tropes & Generic Styling Inventory (Mandatory Elimination)

**Decorative Purple/Cyan Hues (42 occurrences)**:

| Location | Content | Assessment |
|---|---|---|
| `src/lib/growth/growthSystem.ts:37,75,113,132` | Realm tier palette: `#38bdf8` sky / `#818cf8` indigo / `#c084fc` purple / `#f472b6` pink | **Highest Severity**: Generic SaaS gamification palette driving GrowthTab glow blobs (`_tabs/GrowthTab.tsx:71-72`) |
| `src/app/start/page.tsx:454` | `bg-purple-500/10 rounded-full blur-3xl` purple glow blob paired with gold blob | Prohibited by 2026-09 design audit |
| `src/app/dashboard/page.tsx:400`, `src/app/reading/[id]/page.tsx:239` | Family member badge: `bg-purple-500/20 text-purple-300` | Migrate to Jade / Vermillion |
| `src/app/gift/[code]/page.tsx:74,96,109` | `text-cyan-400` status indicator | Migrate to Jade |
| `src/components/results/ZiweiResult.tsx:196,198,221,333,388,391` | V1 Zi Wei results purple panels (renders legacy readings) | Migrate to Oriental Sanctuary aesthetic |
| `src/components/results/QimenResult.tsx:42,85,87,93,153,189-212` | Qi Men cyan glass panels | Panels migrate to Sanctuary style; star hues retained as metaphysical semantic tokens |
| `src/app/admin/page.tsx:38`, `src/app/admin/logs/page.tsx:558,667` | Admin purple status badge | Migrate to Gold / Jade |
| `src/app/globals.css:199,203,214-215,292-298,304-315` | 15 cascade rules maintaining legacy purple/cyan in light mode | Eliminated naturally with cascade removal |

**Decorative Glassmorphism**: `.glass-card` (`globals.css:354-360`) appears across **44 files and 130+ locations**. Primary occurrences: `admin/logs` (17), `ZiweiResult` (10), `BaziResult` (8), `QimenResult` (7), `BaziResultV2` (6), `admin/compensation` (6), 7 divination landing pages (3-5 each), and admin views (30+). Objective: Replace with `oriental-sanctuary-card`, `card-mystic-l1`, and semantic `bg-card`. Functional backdrop blurs on modals and navigation bars remain preserved.

**Decorative Emoji (User-Facing)**:

| Location | Emoji |
|---|---|
| `(divination)/ziwei/page.tsx:108` | ⭐ |
| `components/results/BaziResult.tsx:41`, `ZiweiResult.tsx:179,521` | 🔮 ⭐ |
| `divination/error.tsx:24` | Giant 🔮 |
| `lib/creditPacks.ts:26,36` | ⭐ 🌟 (Pricing icons) |
| `lib/growth/growthSystem.ts:74,112,131,169,195,251` | 🔮🌌⚡🌟 (Badge icons) |
| `lib/onboardingSpark.ts` | 9 occurrences: 🔥✨⭐💎🌌🔮 (Personality traits) |
| `components/reading/ReadingFeedback.tsx:15` | 🎯 |
| `components/loading/MysticalLoader.tsx:282` | 💡 |
| `src/app/profile/page.tsx:893` | ✨ |
| Admin interfaces (`logs`, `settings`, `feedback`, `users`, `wiki`) | Internal emojis to be cleaned |
| API error messages (`master/route.ts:162`, `chat/route.ts:61`, `divination/route.ts:150,390`, `init:83,150`) | ✨ / 🔮 |

Replacement Standard: Handcrafted Oriental geometric SVG icons or `✦` (approved character used in registration, wiki, navbar, and V2 results).

**SaaS Marketing Copy**:
- `(divination)/fengshui/page.tsx:251,254` — "AI Intelligent Feng Shui Analysis" + AI marketing paragraphs
- `(divination)/bazi/page.tsx:231` — Generic "Artificial Intelligence / AI System" marketing copy
- `BaziResultV2.tsx:714,798,903,910`, `ZiweiResultV2.tsx:771,856,960` — "AI In-Depth Analysis" / "AI Channeled" upsell badges -> Replace with "XuanJi Deep Analysis"
- `components/ChatWidget.tsx` — Deprecated dead file containing "divination assistant" -> **Delete completely**
- Legal disclosures (terms, privacy) referencing "AI models" are retained for regulatory compliance.

**Approved Aesthetic Patterns (Kept Intact)**:
- 29 gold/amber gradients over deep obsidian black (auth buttons, subscribe, CoinCastPanel, wiki/portrait cards).
- ~46 `animate-pulse` states exclusively indicating loading, skeleton, or streaming operations.
- Zero occurrences of rounded-3xl generic white-ring cards.
- Subtle gold ambient glows (MasterEntryCard, MysticalLoader, CollapsedBar, ExpandedView).
- Poster canvas palette (`#d4a853/#e8c278/#c0392b/#0a0f1e`) representing consistent brand assets.

### 1.2 Dark & Light Architecture Diagnostics

**Token Layer** (`globals.css:76-120`): ~24 CSS variables defined across `:root` (Light: Xuan paper `#faf8f0` / ink `#2d1f0e` / deep gold `#8b6508`) and `.dark` (Dark: Obsidian `#0a0f1e` / white text / radiant gold `#d4a853`). However, **none were mapped into `tailwind.config.js`**, forcing components to rely on arbitrary values (`text-[var(--text-secondary)]` in 600+ lines).

**Cascade Override Layer**: 187 `:root:not(.dark) !important` rules (`globals.css:134-589`) patched ~150 dark-first classes (text-white in 18 opacity tiers, text-gold in 15 tiers, bg-navy variants, Five Element colors, Qi Men/Zi Wei colors, borders, and inputs). Any newly introduced raw dark class breaks light mode rendering.

**Structural Defects**:
1. **44 `dark:` Prefixes Non-functional**: `tailwind.config.js` lacked `darkMode: 'class'`, causing `dark:` prefixes to follow the OS `prefers-color-scheme` rather than the application theme switcher.
2. **18 Invalid `light:` Prefixes**: Invalid variants unsupported by Tailwind.
3. **Missing Prose Styles**: Absence of `@tailwindcss/typography` rendered markdown in wiki articles and consultation views with default browser link styling.
4. **10+ Hardcoded Dark Scrims**: Scrims (`bg-navy-950/85`, `bg-black/50`) appeared harsh in light mode.
5. **Undefined CSS Variables**: Reference to `--bg-secondary` and `--bg-input` defaulted permanently to dark fallbacks.
6. **Hardcoded Dark Pages**: `global-error.tsx` and `claim/[token]/page.tsx` lacked light mode adaptations.
7. **Starfield Inversion**: Golden celestial points in `StarField.tsx` were invisible against parchment backgrounds.
8. **Toast Style Inconsistencies**: Layout hardcoded dark styles while CSS rules patched light styles.
9. **Raw Class Proliferation**: ~3,369 raw dark utility classes across the repository.

### 1.3 Mystical Design Assets

- Established utility tokens: `oriental-sanctuary-card` (54 instances across 25 files), `card-mystic-l1/featured`, `stamp-vermillion`, `stamp-gold`, `verse-callout`, `hairline-gold`, `celestial-orbit`.
- Typography: Inter (body text) + Noto Serif (headings). Heading font must standardize on **Noto Serif TC** for Traditional Chinese typography.
- ThemeProvider: Toggles `dark`/`light` classes on `<html>`; defaults to dark mode with inline anti-FOUC script.

---

## 2. Design Execution Guidelines (v2.1)

### 2.1 Role & Mission

Establish an authentic, immersive visual standard for "XuanJi": **Eradicate generic AI/SaaS aesthetics, embodying a Modern Oriental Sanctuary—a Song Dynasty scholar's study under a tranquil night sky**. Dark and light modes are first-class peers. The overarching philosophy: **Dignified Oriental restraint encapsulating modern computational intelligence**.

### 2.2 Aesthetic Tenets

- **Dark Mode (Obsidian Night)**: Deep ink-blue base, hairline gold borders, vermillion seal accents, and subtle starfield ambient motion.
- **Light Mode (Xuan Paper)**: Warm ivory parchment base, deep ink typography, rich gold, and vermillion seal accents.
- Light mode is not a naive color inversion, but **the same scholarly aesthetic viewed in daylight**.
- Spatial composure (generous breathing room), intuitive pacing, stone-rubbing gravitas, and quiet celestial presence.
- Prohibited: Tech-bro tropes, multi-colored playground gradients, customer support widget tropes, and commercial eCommerce cliches.

### 2.3 Prohibited Elements

1. **Decorative Purple, Indigo, Violet, Fuchsia, or Cyan**. (Note: Astrological semantic colors for Five Elements and planetary states are preserved, with luminance calibrated per theme).
2. **Decorative Glassmorphism**: Transition `glass-card` to sanctuary tokens; preserve functional backdrop blur on navigation bars and scrims.
3. **Decorative Emoji** (🔮✨⭐🌟🤖🧙⚡🌌💡🎯💾) -> Replace with handcrafted geometric SVG icons or `✦`.
4. **SaaS Marketing Jargon** ("AI Powered", "AI Fortune Telling", "Smart Assistant", "Ask AI") -> XuanJi persona phrasing.
5. **Customer Support Visuals** (`animate-ping` presence dots, floating chat bubbles).
6. **Numeric Progress Bars Destroying Mystery** (Preserve the three-stage ceremonial progress transitions).
7. **Generic OpenAI Landing Page Aesthetics** (Pill-shaped glass cards with white ring borders).

### 2.4 Token Vocabulary & Theme Specifications

| Dimension | Dark (Obsidian Night) | Light (Xuan Paper) |
|---|---|---|
| Base Background | `--bg-primary #0a0f1e` / `--bg-surface #111d35` | `#faf8f0` / `#ffffff` |
| Cards / Elevated | `--bg-card rgba(17,29,53,.6)` / `--bg-elevated` | `rgba(255,255,255,.85)` |
| Typography | `--text-primary #fff` · secondary 0.7 · muted 0.4 | `#2d1f0e` · secondary 0.72 · muted 0.55 (WCAG AA $\ge 4.5:1$) |
| Gold Palette | `--gold #d4a853` · `--gold-light #e8c278` · `--gold-dark #b8893a` | `#8b6508` · `#d4a853` · `#705000` |
| Accent Seals | Vermillion `--vermillion #c0392b` · Jade `--jade #2d8a6e` | Same as dark |
| Borders | `--border-gold rgba(212,168,83,.2)` · `--card-border` (0.16 hairline) | `rgba(184,134,11,.3)` palette |
| Scrim Overlays | `--scrim rgba(4,8,16,.85)` | `rgba(45,31,14,.4)` |
| Input Fields | `--input-bg #111d35` | `#ffffff` |
| Heading Font | **Noto Serif TC** (400/700) | Same as dark |
| Body Font | Inter + system sans fallback | Same as dark |
| Motion | Gold thread transit 0.35s `cubic-bezier(.16,1,.3,1)`, celestial orbits, ink fade; reduced motion respected | Same as dark |
| Icons | Handcrafted geometric lines (trigrams, orbits, cloud motifs, seals) | Same as dark |

### 2.5 Dual-Theme Engineering Rules

1. **Write Exclusively Semantic Classes**: `bg-background`, `bg-surface`, `bg-card`, `bg-elevated`, `text-foreground`, `text-secondary`, `text-muted`, `text-gold`, `text-jade`, `text-vermillion`, `border-gold-hairline`, `bg-scrim`, `bg-input`. Prohibit raw `text-white/*`, `bg-navy-*`, `bg-black/*`, `bg-white/*`, and `border-white/*`.
2. Scrims must use `bg-scrim`.
3. Five Element / Star semantic hues: Retain semantic color tokens, with light mode contrast handled by dedicated calibration styles.
4. Poster canvas / OG images / Favicons represent brand artifacts and maintain fixed dark palettes.
5. All UI modifications must be verified in both dark and light modes.
6. The `dark:` variant operates exclusively under `darkMode: 'class'`; the `light:` variant does not exist.

---

## 3. Phased Execution Roadmap

### P1: Infrastructure Foundations
1. Configure `darkMode: 'class'` and map all design tokens in `tailwind.config.js`.
2. Define `--bg-elevated`, `--bg-secondary`, `--bg-input`, and `--scrim` across both modes in `globals.css`.
3. Switch heading typography import from Noto Serif SC to `Noto_Serif_TC`.
4. Fix 44 invalid `dark:` instances and eliminate 18 non-existent `light:` prefixes.
5. Replace broken `prose` classes with `.classic-prose` components in `globals.css`.
6. Consolidate toast styles onto CSS variables and add `.custom-scrollbar` utility.

### P2: Eliminating AI Tropes
1. Map `growthSystem` tiers to classical Oriental hues (Moon White, Frost Cyan, Pure Jade, Deep Indigo, Radiant Gold, Cinnabar, Obsidian Gold).
2. Replace badge emojis with seal characters (✦ / Calligraphic emblems).
3. Remove purple glow blob on `/start` and decorative blobs on `GrowthTab`.
4. Sanitize V1 Zi Wei and Qi Men panels into Sanctuary styling.
5. Rewrite AI marketing copy in Feng Shui and BaZi pages to authoritative XuanJi phrasing.
6. Remove deprecated `ChatWidget.tsx` and eliminate decorative emojis from API error messages.

### P3: Light Mode Hardening
1. Replace 13 hardcoded modal scrims with `bg-scrim` / `bg-elevated`.
2. Adapt `global-error.tsx` and `claim/[token]` to dual-theme variables.
3. Configure `StarField` canvas to pause animation or render ink-point stars in light mode.
4. Resolve missing CSS variable definitions in `InstallPrompt` and `FamilyTab`.

### P4: Semantic Token Migration & Cascade Removal
Migrate the repository across 5 waves:
- **Wave 1**: `/start/*`, home, divination landing pages and forms, MasterEntryCard.
- **Wave 2**: `/dashboard`, profile tabs (`GrowthTab`, `FamilyTab`, portrait), `/reading/[id]`, `ReadingResultCard`.
- **Wave 3**: All result components (V2, V1, Qi Men, Liu Yao, I Ching, Feng Shui, Other), XuanJi chat cards.
- **Wave 4**: Auth views, subscribe, claim, delete account, legal, wiki, Master chat widget, layout navigation.
- **Wave 5**: All 13 Admin views.
- **Final**: Remove 89 obsolete override rules in `globals.css`, retaining ~98 rules dedicated to Five Element and planetary contrast calibration.

### P5: Quality Verification
1. Automated grep audits: Zero decorative purple/indigo/cyan classes; zero user-facing decorative emojis; zero generic AI marketing phrases; zero legacy `glass-card` classes.
2. Complete green quality gates: `tsc --noEmit` 0 errors, `next lint` 0 warnings, `vitest run` 100% pass, `next build` success.

---

## 4. Acceptance Criteria

1. Grep verification: 0 decorative purple/indigo/cyan utility classes.
2. Grep verification: 0 user-facing decorative emojis.
3. Grep verification: 0 instances of generic AI marketing buzzwords.
4. Grep verification: 0 references to legacy `.glass-card`.
5. Light mode verification: Zero hardcoded dark scrims, zero broken prose classes, zero undefined CSS variables.
6. Cascade overrides in `globals.css` reduced strictly to metaphysical semantic calibration.
7. Quality gates passing: `tsc --noEmit` 0 errors, `next lint` 0 warnings, Vitest tests 100% passing.

---

## 5. Risk Assessment & Mitigations

| Risk | Mitigation |
|---|---|
| `darkMode: 'class'` alters component behavior | Review all 44 existing `dark:` instances during P1-4 and migrate to semantic classes. |
| `growthSystem` test color assertions break | Verify `growthSystem.test.ts` before modifying color constants and update assertions in sync. |
| Light mode regressions on secondary views | Execute automated grep scans across low-traffic views and perform visual spot-checks. |
| Large migration footprint introduces syntax slips | Enforce `lint` and `tsc` verification after each discrete wave. |
| V1 components render legacy readings | Modify only `className` attributes without touching data contracts or result structures. |

---

## 6. Project Scope Boundaries

- The `system` OS-following theme option is deferred (dark/light binary toggle maintained).
- `@tailwindcss/typography` is not added as an external dependency (handcrafted `.classic-prose` used instead).
- Share poster canvas, OG social cards, and favicons maintain their fixed dark brand styling.
- Legal terms referencing AI models are preserved for statutory disclosure compliance.
- Five Element and planetary star colors preserve their metaphysical color identities.

---

## Execution Record (Completed 2026-10-18)

### Completion Summary

- [x] **P1 Infrastructure**: Enabled `darkMode: 'class'`; mapped all semantic tokens to RGB channels (`/alpha` compatible); added `--scrim`, `--bg-elevated`, `--bg-secondary`, and `--bg-input`; switched font from Noto Serif SC to Noto Serif TC; consolidated toast styles; added `.classic-prose`; resolved invalid `dark:` / `light:` prefixes.
- [x] **P2 AI Tropes Elimination**: Updated `growthSystem` palette to classical Oriental hues and replaced emojis with seal characters; removed purple glow blobs; replaced decorative emojis across onboarding, credit packs, and error states; converted V1 result views to Sanctuary styling; rewrote marketing copy; deleted dead `ChatWidget.tsx`.
- [x] **P3 Light Mode Hardening**: Migrated 13 hardcoded modal scrims to `bg-scrim`; tokenized `claim` and error pages; added theme awareness to `StarField`.
- [x] **P4 Semantic Token Migration**: Migrated 79 files across 26 mapping patterns; pruned 89 cascade override rules from `globals.css`, retaining 98 semantic calibration rules.
- [x] **P5 Verification**: Quality gates passing (`tsc --noEmit` 0 errors, `next lint` 0 warnings, Vitest 84 files / 1,325 tests passing, `next build` exit code 0).
- [x] **Follow-up Deliverables**:
  1. **ModalShell Primitive**: Created `src/components/ui/ModalShell.tsx` (`role="dialog"`, `aria-modal`, Escape key, focus trapping/restoration, theme-aware scrim); upgraded `FatePosterModal`, start skip modal, `CacheDialog`, and `MemoryGateModal`.
  2. **Android Hardware Back Button**: Created `src/lib/overlayStack.ts`; integrated `@capacitor/app` backButton listener in `NativeInitializer` to dismiss overlays hierarchically before navigating history.
  3. **Quiet Card Token**: Introduced `.card-quiet` to replace `.glass-card` across 46 files.
  4. **i18n Circuit Breaker**: Added ESLint `no-restricted-syntax` rules prohibiting inline ternary language expressions; migrated 75 files to `T(lang, zh, en)` / `TEN(isEn, zh, en)`.

### Verification Metrics
- **106 files modified, +1,282 / -1,501 lines (net -219 lines)**.
- Light mode fully upgraded from fragile CSS overrides to RGB-channel semantic tokens.
- All four quality gates verified green: `tsc --noEmit` 0 errors, `next lint` 0 warnings, `vitest run` 100% pass, `next build` exit code 0.
