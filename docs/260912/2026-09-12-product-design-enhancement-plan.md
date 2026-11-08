# XuanJi — Product Feature Enhancement & Experience Design Specification (PRD & Design Spec)

**Version**: v1.0.0  
**Date**: 2026-09-12  
**Role**: Senior PM & Lead Product Designer  
**Objective**: Comprehensive review of prior strategy documents, establishing pixel-level engineering guidelines for product enhancements (page layouts, state machines, color palettes, and ceremonial micro-interactions).  
**Guideline**: Specification and architectural guidance document without premature code modifications.

---

## Table of Contents

- [1. In-Depth Strategic Review (PM & Designer Perspective)](#1-in-depth-strategic-review-pm--designer-perspective)
  - [1.1 Critique & Corrections on Product Analysis Report](#11-critique--corrections-on-product-analysis-report)
  - [1.2 Feasibility Audit of Sprint Plan](#12-feasibility-audit-of-sprint-plan)
  - [1.3 Core Experience & Growth Lifecycle Diagnostics](#13-core-experience--growth-lifecycle-diagnostics)
- [2. Global Modern Oriental Metaphysics Design System Tokens](#2-global-modern-oriental-metaphysics-design-system-tokens)
  - [2.1 Color Codes & Semantic Palette Matrix](#21-color-codes--semantic-palette-matrix)
  - [2.2 Typographic Hierarchy (Typography)](#22-typographic-hierarchy-typography)
  - [2.3 Elevation, Borders & Surface Translucency](#23-elevation-borders--surface-translucency)
  - [2.4 Ceremonial Micro-Interactions & Animation Curves](#24-ceremonial-micro-interactions--animation-curves)
- [3. Core Feature Specifications (PRD & Interaction Specs)](#3-core-feature-specifications-prd--interaction-specs)
  - [Module 1: Dual-Scenario Navigation & Homepage Hero Upgrade](#module-1-dual-scenario-navigation--homepage-hero-upgrade)
  - [Module 2: Viral Fate Poster Generator](#module-2-viral-fate-poster-generator)
  - [Module 3: In-Context Master Chat Prompts](#module-3-in-context-master-chat-prompts)
  - [Module 4: Task-Based Karma Center (Karma Shrine)](#module-4-task-based-karma-center-karma-shrine)
  - [Module 5: 2027 Annual Fortune Report MVP (Freemium Annual Report)](#module-5-2027-annual-fortune-report-mvp-freemium-annual-report)
- [4. Engineering Implementation Mapping](#4-engineering-implementation-mapping)
  - [4.1 Component Architecture & File Directory Tree](#41-component-architecture--file-directory-tree)
  - [4.2 Data Models & Schema Extension Specifications](#42-data-models--schema-extension-specifications)
- [5. Three-Week Release Milestones & Definition of Done](#5-three-week-release-milestones--definition-of-done)
- [6. Conclusion](#6-conclusion)

---

## 1. In-Depth Strategic Review (PM & Designer Perspective)

Review of `docs/260912/2026-09-11-product-analysis.md` (Analysis Report) and `docs/260912/2026-09-11-sprint-plan.md` (Sprint Plan) across commercial loops (PM) and user experience/visual aesthetics (Designer):

### 1.1 Critique & Corrections on Product Analysis Report

#### Validated High-Value Insights
1. **Accurate Strategic Diagnosis of "Excess Supply, Disconnected Demand"**: 327 registered users, 4 paying customers, 8 complete divination systems. Engineering is complete, but distribution and acquisition are nascent. Correctly recommends freezing expansion into low-volume methods (Feng Shui, Liu Ren) to concentrate on core anchors (BaZi, Zi Wei, Liu Yao, Mei Hua).
2. **Identification of the Three Disconnects (Acquisition, Lifecycle, Monetization)**: Metaphysics is naturally low-frequency and requires recurring lifecycle touchpoints; an unpopulated Wiki leaves valuable organic SEO compounding unrealized.
3. **Validated Evolution Path**: Moving from v1 Calculation Engine -> v2 Semantic Interpretation -> v3 Persistent Profiles & Continuous Guidance.

#### Critical Blindspots Identified
1. **Overlooking the Aesthetic and Emotional Drivers of Sharing**:
   - The report treated "share cards" as a mechanical utility, overlooking that users share metaphysical charts on social media (Instagram Stories, WeChat Moments) to **express personal identity, seek resonance, and share aesthetic artifacts**.
   - The existing share view (`/r/[token]`) is a dense wall of text, yielding poor click-through rates on mobile social feeds. Without visually compelling Oriental fortune posters, viral acquisition loops will not ignite.
2. **Superficial Diagnosis of Master Chat Engagement**:
   - The report noted that Master Chat had only 17 lifetime sessions, concluding that users lacked conversational habits.
   - **Root Cause**: Facing an empty input bar creates severe **"Blank Page Anxiety"**. After consuming thousands of words of detailed chart analysis, users experience cognitive fatigue and do not know what to ask. Master Chat must present contextual follow-up chips at the end of report sections to prompt natural engagement.
3. **Disconnected SEO Conversion Funnel**:
   - Publishing 15-20 Wiki articles drives organic traffic, but without embedded mini-calculation widgets, visitors bounce after reading without converting into registered users.

---

### 1.2 Feasibility Audit of Sprint Plan

#### Engineering Pitfalls Identified
1. **Absence of Pixel-Level Specifications**: The proposal to "rewrite the hero from 8 divination methods to dual scenarios" provided no information architecture, component states, card layouts, color codes, or typography specs.
2. **Routing and User State Conflict**:
   - In `src/app/page.tsx`, line 58 enforced: `if (status === 'authenticated' && session) { router.replace('/divination') }`.
   - Logged-in users were unconditionally redirected away from the homepage, never seeing brand announcements or returning user touchpoints.
3. **Gamified Karma Lacked Visual and Psychological Feedback**:
   - Converting daily allowances into tasks requires visual ceremony—a Karma Shrine drawer, interactive fortune-drawing animations, and tactile feedback—rather than silent background ledger entries.

---

### 1.3 Core Experience & Growth Lifecycle Diagnostics

```
Lifecycle Optimization Model:

[Acquisition] 
  └── Gap: Wiki lacked interactive calculators; social sharing was plain text
  └── Remedy: Embedded mini-calculators in Wiki + 1080x1440 Oriental Destiny Poster Generator

[Activation]
  └── Gap: Forced redirect on login; cognitive overload from 8 divination cards
  └── Remedy: Homepage Dual-Scenario Gateways (Self-Discovery vs Immediate Inquiries)

[Retention]
  └── Gap: Single-use drop-off; underutilized Master Chat
  └── Remedy: Three contextual follow-up chips in readings + Daily Karma Drawing ritual

[Monetization]
  └── Gap: 90% reliance on free allowances; missing premium anchor
  └── Remedy: 2027 Annual Fortune Report (Freemium preview + paid chapter unlocking)
```

---

## 2. Global Modern Oriental Metaphysics Design System Tokens

Standard design tokens for modern Oriental metaphysics:

### 2.1 Color Codes & Semantic Palette Matrix

"Obsidian night sky as base, morning radiant gold as structure, spring jade and cinnabar as soul":

| Color Role | Token Name | Hex / RGBA | Usage & Tone |
|---|---|---|---|
| **Night Sky Base** | `navy-950` (Primary BG) | `#0a0f1e` | Deep celestial void, avoiding harsh pure black |
| **Surface Base** | `navy-900` (Surface BG) | `#0d1526` | Card backgrounds, floating navigation chrome |
| **Elevated Surface** | `navy-800` (Elevated BG) | `#111d35` | Modals, floating panels, dropdown menus |
| **Subtle Border** | `navy-700` (Border Subtle) | `#162444` | Subtle card borders and dividers |
| **Core Gold** | `gold-DEFAULT` (Accent Gold) | `#d4a853` | Primary brand accent, primary CTAs, auspicious stars |
| **Radiant Gold** | `gold-light` (Hover Gold) | `#e8c278` | Hover states, glowing titles, poster highlights |
| **Ancient Gold** | `gold-dark` (Muted Gold) | `#b8893a` | Disabled buttons, secondary icons, subtitle text |
| **Spring Jade** | `jade-DEFAULT` (Auspicious) | `#2d8a6e` | Auspicious indicators, remedies, vitality |
| **Imperial Cinnabar** | `vermillion` (Seal / Alert) | `#c0392b` | Traditional seals, warning indicators, time-sensitive tags |
| **Light Theme Base** | `cream-bg` (Light Theme) | `#faf8f0` | Xuan paper parchment (for print and daylight reading) |
| **Gold Halo** | `gold-glow` | `rgba(212, 168, 83, 0.18)` | Ambient card glow, hover shadows |
| **Dark Scrim** | `overlay-backdrop` | `rgba(10, 15, 30, 0.75)` | Modal backdrops with `backdrop-blur-md` |

---

### 2.2 Typographic Hierarchy (Typography)

- **Headings (Traditional Gravitas)**: `'Noto Serif TC', 'Noto Serif SC', 'Songti SC', serif` (titles, star palaces, hexagram names, and judgments).
- **Body & Numerics (Modern Precision)**: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` (birth timestamps, coordinates, credit counts, and functional tags).

```css
.font-h1-display {
  font-family: var(--font-noto-serif);
  font-size: clamp(2.25rem, 5vw, 3.5rem); /* 36px ~ 56px */
  line-height: 1.15;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--gold);
  text-shadow: 0 0 35px rgba(212, 168, 83, 0.35);
}

.font-h2-title {
  font-family: var(--font-noto-serif);
  font-size: 1.5rem; /* 24px */
  line-height: 1.35;
  letter-spacing: 0.03em;
  font-weight: 600;
  color: #ffffff;
}

.font-body-reading {
  font-family: var(--font-noto-serif);
  font-size: 1.0625rem; /* 17px reading standard */
  line-height: 1.85; /* Generous line height reduces fatigue */
  color: rgba(255, 255, 255, 0.85);
}

.font-verse-callout {
  font-family: var(--font-noto-serif);
  font-size: 1.125rem; /* 18px */
  line-height: 1.6;
  font-style: normal;
  color: var(--gold-light);
  border-left: 2px solid var(--gold);
  padding-left: 1rem;
}
```

---

### 2.3 Elevation, Borders & Surface Translucency

```css
/* Level 1: Foundational Cards */
.card-mystic-l1 {
  background: rgba(17, 29, 53, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(212, 168, 83, 0.18);
  border-radius: 1.25rem; /* 20px */
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.36);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.card-mystic-l1:hover {
  border-color: rgba(212, 168, 83, 0.45);
  transform: translateY(-3px);
  box-shadow: 0 14px 40px -8px rgba(212, 168, 83, 0.18), inset 0 0 20px rgba(212, 168, 83, 0.04);
}

/* Level 2: Featured / Master / Paywall Cards */
.card-mystic-featured {
  background: linear-gradient(135deg, rgba(212, 168, 83, 0.08) 0%, rgba(17, 29, 53, 0.75) 50%, rgba(212, 168, 83, 0.04) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 168, 83, 0.35);
  border-radius: 1.5rem; /* 24px */
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(212, 168, 83, 0.08);
  position: relative;
  overflow: hidden;
}

/* Cinnabar Imperial Seal */
.stamp-vermillion {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #c0392b;
  color: #c0392b;
  border-radius: 4px;
  font-family: var(--font-noto-serif);
  font-weight: 700;
  letter-spacing: 0.15em;
  padding: 2px 8px;
  text-transform: uppercase;
  transform: rotate(-3deg);
  box-shadow: 0 0 8px rgba(192, 57, 43, 0.3), inset 0 0 4px rgba(192, 57, 43, 0.2);
}
```

---

### 2.4 Ceremonial Micro-Interactions & Animation Curves

- **Gold Ambient Breathing**: `animation: mysticBreath 4s ease-in-out infinite;`
- **Gold Particle Dispersal**: Triggered upon unlocking readings, copying charts, or claiming daily rewards (24px radius golden celestial points).
- **Haptic Tactile Feedback**: Mobile invocation of `navigator.vibrate?.([40, 60, 40])` accompanied by subtle 3-degree elastic card tilt.

---

## 3. Core Feature Specifications (PRD & Interaction Specs)

### Module 1: Dual-Scenario Navigation & Homepage Hero Upgrade

#### 1. User Mental Model
- **Problem**: 7 distinct divination cards caused choice paralysis for new users, while authenticated users were automatically redirected away from the homepage.
- **Mental Model Alignment**:
  - **Scenario A: Macro Destiny & Self-Discovery** (Who am I? Lifetime trajectory, decadal cycles, personality) -> **BaZi & Zi Wei Dou Shu**.
  - **Scenario B: Specific Inquiries & Decision Guidance** (Should I take this offer? Relationship timing? Contract signing?) -> **Liu Yao & Mei Hua**.

#### 2. Layout & Wireframe
- Remove unconditional redirects on `/` for authenticated sessions; render greeting: `"Welcome back, [Name]"`.
- Dual-scenario navigation cards (`grid-cols-2` on desktop, `flex-col` on mobile, 24px gap):

```
+----------------------------------------------------+----------------------------------------------------+
|  Scenario 1: Self-Discovery & Macro Trajectory     |  Scenario 2: Specific Decision & Horary Inquiries  |
|  "Understand your lifelong pattern, decadal        |  "Career transitions, investments, relationships,  |
|   cycles, and intrinsic nature"                    |   cast coins to determine timing and outcomes"     |
|                                                    |                                                    |
|  [ Zi Wei Dou Shu (In-depth) ] [ BaZi (Cycles) ]   |  [ Liu Yao (Precise Query) ] [ Mei Hua (Horary) ]  |
|                                                    |                                                    |
|  Recommended: Seeking long-term direction          |  Recommended: Facing immediate choices             |
|                                                    |                                                    |
|  [ Explore Personal Chart -> ]                     |  [ Cast an Immediate Inquiry -> ]                  |
+----------------------------------------------------+----------------------------------------------------+
```

#### 3. Styling & Interaction
- **Scenario 1 Card**: Gold accent gradient, `#d4a853` CTA button, navigates to `/divination/bazi` or Zi Wei.
- **Scenario 2 Card**: Deep celestial cyan accent, border-styled CTA button, navigates to `/divination/liuyao`.
- **Secondary Methods**: Secondary fold (`<details>` accordion) reveals Qi Men, Feng Shui, and I Ching cleanly.

---

### Module 2: Viral Fate Poster Generator

#### 1. Concept & Psychology
Users experiencing insightful readings reach an emotional peak. Providing a dignified 3:4 / 9:16 poster inscribed with their chart's core verse and seal transforms satisfaction into organic social sharing.

#### 2. Poster Layout (1080x1440 Export)

```
+--------------------------------------------------+
|               [ XUANJI DESTINY CARD ]            |
|  [Cloud Filigree]               [Year of Bing-Wu]|
|                                                  |
|                  Four Pillars                    |
|             Jia-Zi  Bing-Yin  Wu-Chen  Gui-Hai   |
|                                                  |
|     +--------------------------------------+     |
|     |  "Turning Adversity into Triumph,    |     |
|     |   Supported by Noble Stars"          |     |
|     +--------------------------------------+     |
|                                                  |
|   Core Astrological Insight:                     |
|   Wu Earth Day Master born in Yin Month;         |
|   Southern decadal cycles bring auspicious       |
|   support for long-term ventures.                |
|                                                  |
|   [ Tian Yi Noble Support ] [ Favorable Wood/Fire] |
|                                                  |
|  ----------------------------------------------  |
|  [ XuanJi Seal ]                   [ QR Code ]   |
|  Classical Wisdom + AI Derivation   Scan to read |
|                                     Ref #8942    |
+--------------------------------------------------+
|  [ Download Card (PNG) ]  [ Copy Referral Link ] |
+--------------------------------------------------+
```

#### 3. Technical Implementation
- Export Canvas rendered at 2x Retina resolution.
- QR code points to `/r/[token]?src=poster&ref=[userId]`. New signups earn 6 credits, awarding the sharer +5 Karma credits automatically upon registration.
- Mobile browsers invoke `navigator.share({ files: [blob] })` when available.

---

### Module 3: In-Context Master Chat Prompts

#### 1. Concept & Architecture
Solves user question anxiety by placing 3 context-aware question chips at the conclusion of chart reports (`ReadingResultView.tsx`).

```
+-------------------------------------------------------------------------+
|  Master XuanJi has reviewed your chart:                                 |
|  "The Day Master is weak with robust wealth stars. Are you currently     |
|   weighing a critical career decision?"                                  |
|                                                                         |
|  Click to ask Master XuanJi directly:                                   |
|                                                                         |
|  [ "Given my favorable elements, should I change jobs this year?"  -> ] |
|  [ "What are the characteristics of my ideal partner?"             -> ] |
|  [ "The chart notes a clash this year; which months require care?" -> ] |
|                                                                         |
|  [ Write a custom inquiry to the Master...                            ] |
+-------------------------------------------------------------------------+
```

#### 2. Interaction
Clicking a chip expands `MasterChatWidget` into `expanded` view, automatically injecting `readingId`, chart parameters, and the selected question into the prompt context for an immediate, seamless response.

---

### Module 4: Task-Based Karma Center (Karma Shrine)

#### 1. Concept & Ritual
Replaces passive daily credit handouts with an interactive Karma Shrine drawer (`KarmaShrineDrawer.tsx`). Users draw a daily fortune slip to claim credits, reinforced by profile completion and sharing missions.

#### 2. Layout & Daily Ritual
- Sliding drawer from the right on desktop, bottom sheet on mobile.
- Daily fortune casting: Shaking the bamboo canister reveals a daily hexagram line and awards 1-3 credits with gold particle animations.
- Missions: Profile completion (+5), first poster share (+5), friend referral (+10).

---

### Module 5: 2027 Annual Fortune Report MVP (Freemium Annual Report)

#### 1. Concept & Freemium Structure
Annual forecast analysis is the primary seasonal demand in Chinese metaphysics.
- **Route**: `src/app/divination/annual-2027/page.tsx`.
- **Chapter 1: Annual Overview (100% Free)**: Heavenly Stem and Earthly Branch interactions, Tai Sui alignment, Five Element radar chart.
- **Chapter 2: Monthly Trajectory Curve (Partial Preview)**: Spring months open; summer through winter blurred behind a paywall mask.
- **Chapters 3-5: Wealth, Romance, and Seasonal Remedies (Locked 🔒)**: Unlocked for 30 credits or $6.99 USD checkout.

```
+-----------------------------------------------------------------------+
|  2027 Year of Bing-Wu · Annual Fortune Guide                          |
|  Native: Day Master Wu-Chen                                           |
+-----------------------------------------------------------------------+
|  Chapter 1: Annual Macro Dynamics (Fully Unlocked)                   |
|  Bing-Wu Year: Fire and Earth in mutual generation...                 |
|  [ Five Element Radial Radar Chart ]                                  |
+-----------------------------------------------------------------------+
|  Chapter 2: Monthly Horizons (Preview)                                |
|  · Lunar Month 1: Flourishing prospects for foundational initiatives.  |
|  · Months 3-12:                                                       |
|  +-----------------------------------------------------------------+  |
|  |  [ Translucent Blur Mask: filter: blur(6px) ]                   |  |
|  |  🔒 Unlock detailed analysis for remaining 10 months            |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
|  +-----------------------------------------------------------------+  |
|  |  Unlock the Complete 2027 Annual Guide                          |  |
|  |  · Full chapters across Wealth, Romance, and Protective Remedies|  |
|  |  · Includes 3 dedicated Master follow-up inquiries              |  |
|  |                                                                 |  |
|  |  Special: 30 Karma Credits (or $6.99 USD)   [ Unlock All -> ]   |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

---

## 4. Engineering Implementation Mapping

### 4.1 Component Architecture & File Directory Tree

```
src/
├── app/
│   ├── page.tsx                           # Reconstruct Hero; implement dual scenarios; update auth redirect
│   ├── divination/
│   │   ├── page.tsx                       # Add 2027 annual banner; update system cards
│   │   └── annual-2027/
│   │       └── page.tsx                   # 2027 Annual Fortune freemium page
│   ├── r/
│   │   └── [token]/page.tsx               # Public share page with poster generator trigger
│   └── api/
│       ├── readings/[id]/poster/route.ts  # Structured poster generation payload
│       ├── tasks/claim-daily/route.ts     # Daily fortune drawing and streak management
│       └── annual/unlock/route.ts         # Annual report credit deduction and unlocking
├── components/
│   ├── home/
│   │   ├── DualScenarioSection.tsx        # Dual-scenario navigation cards
│   │   └── SacredHero.tsx                 # Redesigned hero section
│   ├── share/
│   │   ├── SharePosterModal.tsx           # Poster generation modal
│   │   └── PosterCanvas.tsx               # Canvas off-screen rendering
│   ├── master/
│   │   └── ReadingContextPrompts.tsx      # Contextual follow-up chips
│   ├── karma/
│   │   ├── KarmaShrineDrawer.tsx          # Karma Shrine drawer
│   │   └── FortuneStickAnimation.tsx      # Bamboo canister animation
│   └── annual/
│       ├── AnnualRadarChart.tsx           # Radial chart component
│       └── PaywallMask.tsx                # Translucent blur paywall container
```

### 4.2 Data Models & Schema Extension Specifications

Proposed non-breaking schema additions for `prisma/schema.prisma`:

```prisma
model UserTaskProgress {
  id                  String    @id @default(cuid())
  userId              String    @unique
  streakDays          Int       @default(0)
  lastCheckInAt       DateTime?
  sharedCount         Int       @default(0)
  profileBonusClaimed Boolean   @default(false)
  updatedAt           DateTime  @updatedAt

  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

---

## 5. Three-Week Release Milestones & Definition of Done

| Phase | Milestone Scope | Deliverables | Definition of Done (DoD) |
|---|---|---|---|
| **Week 1 (Days 1–7)**<br>Activation & Flow | Module 1: Dual-Scenario Home<br>Module 3: Master Context Chips | 1. Refactor `page.tsx`.<br>2. Welcoming hero for authenticated users.<br>3. Contextual chips on `ReadingResultCard.tsx`. | Clean mobile (390px) & desktop (1280px) layouts; chips expand Master chat within 0.3s carrying chart context; Master turn volume increases >300%. |
| **Week 2 (Days 8–14)**<br>Virality & Retention | Module 2: Poster Generator<br>Module 4: Karma Shrine | 1. Deploy `SharePosterModal.tsx`.<br>2. 1080x1440 image export with valid attribution QR code.<br>3. Karma Shrine drawer with fortune animation. | Poster renders in <1.5s on mobile devices; QR code resolves correctly; daily check-in rate reaches >70% of active users. |
| **Week 3 (Days 15–21)**<br>Monetization Anchor | Module 5: 2027 Annual Report<br>Wiki Embedded Mini-Calculators | 1. Launch `/divination/annual-2027`.<br>2. Deploy Five Element radar chart.<br>3. Freemium paywall and Stripe/Karma checkout. | Seamless preview-to-unlock flow; complete funnel analytics tracking (impressions, preview completions, checkout events). |

---

## 6. Conclusion

This specification provides an actionable architectural blueprint for transitioning XuanJi from **a technically proficient calculation tool** into **an authoritative, aesthetically refined, viral AI metaphysical platform**. Every recommendation addresses user psychology, visual finesse, interactive feedback, and commercial sustainability.
