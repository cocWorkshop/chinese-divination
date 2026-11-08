# XuanJi Sprint Execution Plan (2026-09-11 PM to 09-13)

**Context**: High-density 2.5-day sprint. Guiding Priority: **User Acquisition & Growth > Product Packaging > Features > Infrastructure** (infrastructure limited to wrapping up existing tasks without expanding scope).  
**Division of Labor**: Content drafting (Wiki, copywriting, social posts, emails) and PR drafting; review, merge, deployment, and media production.  
**Engineering Discipline**: No direct pushes to main; PR -> Review -> Merge. Production releases via manual deploy script during low-traffic windows.

---

## Track A — User Acquisition & Growth (Highest Priority)

### A1. Wiki / SEO Content (P0; 0 published articles since April feature launch)
- [ ] 15-20 articles (primarily Traditional Chinese + 3-5 in English).
- Keywords aligned with transactional intent: BaZi paipan / free Zi Wei Dou Shu calculator / online Zi Wei Dou Shu / Chinese fortune telling / BaZi calculator / Chinese zodiac compatibility / Liu Yao hexagram casting.
- Structure: Educational content + internal contextual CTA links ("Free Chart Calculation" button).
- Workflow: Drafted -> Reviewed & published via Wiki Admin console (~10 min/article, bypassing PRs).
- Definition of Done (DoD): $\ge 12$ articles published by Sunday, each containing contextual CTA links.

### A2. Social Media Account Setup & Initial Content
- Positioning: "Software engineer built an AI metaphysics engine" (developer journal angle to avoid generic fortune-telling promotion throttles).
- Initial 3 posts: (1) "I built a free BaZi calculation platform", (2) "Evaluating the depth of AI Zi Wei interpretations (8-section breakdown)", (3) "An engineer's perspective: Algorithmic modeling of 23 classical Zi Wei formations".
- DoD: Accounts established, 3 posts published with conversion links.

### A3. Community Seeding & Gift Link Distribution (Co-creation Focus; Anti-abuse)
- **Core Principles (Preventing Dormant or Freebie-only Groups)**:
  - **Avoid Pure Freebie Groups**: Metaphysical interpretations incur real Claude/OpenRouter token costs; unrestricted free groups attract low-intent users and turn dormant quickly.
  - **Position as Seed Co-creation & Case Study Communities**: Transition free credits from unconditional handouts into value exchanges (e.g. reporting valid bugs, sharing anonymized case studies for credits; limit to 5-10 grants/day to maintain scarcity).
  - **Platform Risk Defense**: WeChat strictly restricts metaphysical promotion and referral schemes; avoid aggressive referral tactics to protect domains and groups.
- [ ] Generate 2 dedicated gift links (`/admin/gift-links` with campaign notes: Toronto Chinese community / Reddit trial, with usage caps and expiration).
- [ ] Seed group guidelines: Establish group charter as "XuanJi AI Early Access Cohort" with transparent feedback-for-compute policies.
- [ ] Outreach: North American Chinese community groups and natural Reddit discussions (e.g., r/iching) accompanied by authentic chart case discussions.
- DoD: Links distributed with source attribution; anti-farming community guidelines established.

### A4. Analytics Instrumentation (Prerequisite for Growth)
- [ ] Tool selection: PostHog Cloud free tier (10-min integration) or self-hosted Umami.
- Core event tracking: `register`, `reading_start` (by type), `reading_complete`, `master_chat`, `share`, `paywall_view`, `purchase`.
- DoD: Funnel dashboards answering: Registration-to-reading conversion rates and usage share by divination system.

---

## Track B — Product Packaging

- [ ] **Homepage Hero Rewrite**: Shift from "8 Metaphysical Systems" list into a dual-scenario narrative—"Self-Discovery (BaZi / Zi Wei)" + "Specific Questions (Liu Yao / Mei Hua)", with CTA = "Free Chart Calculation".
- [ ] Brand Alignment: Unify XuanJi logo, favicon, and OpenGraph assets (for share cards).
- [ ] Dynamic OpenGraph Share Cards: Transform divination result pages into shareable visual cards.
- [ ] Legal Disclaimers: Footer and result page disclaimers: "For traditional cultural experience and entertainment only; does not constitute legal, financial, or medical advice".
- DoD: Updated homepage deployed; dynamic OG preview cards render properly when shared across Telegram and WeChat.

---

## Track C — Feature Enhancements (Limited to 2 Items)

### C1. Shareable Reading Cards & Referral Credits (Core Growth Loop)
- Result pages generate shareable cards with referral links -> Sharing/copying earns credits.
- Reuses existing tables: `ShareLink`, `CreditLog`, and ledger services.
- DoD: One-click card generation, transactional ledger logging, and auditable referral attribution.

### C2. Gamified Free Credit Missions & Anti-Abuse (Lightweight)
- Shift subsidy budgets into growth drivers: Retain modest daily allowances, adding rewards for sharing (+X) and profile completion (+X).
- **Anti-Abuse & Funnel Segmentation**:
  - **Rate Limiting**: Enforce daily mission claim limits per IP and device to mitigate automated multi-account scripting.
  - **Free-to-Paid Segmentation**: Free credits allow foundational chart calculation and core overviews; in-depth remedies and annual decadal analysis guide toward paid top-ups and subscriptions.
- DoD: `CreditLog` records `grant_share` events with rate-limiting guards.

### C3. (Stretch Goal) 2027 Annual Fortune Report MVP
- Display report table of contents for free -> Paywall to unlock detailed chapters (reusing reading tiers).
- Serves as the primary seasonal monetization anchor.

---

## Track D — DevOps & CI/CD Wrap-up (Timeboxed $\le 3\text{h}$)

- [ ] **Automated Backup Script + Systemd Timer**: `scripts/backup-divination-db.sh` + `divination-backup.timer`, scheduled daily at 03:00, retaining 7 days of verified dumps.
- [ ] **GitHub Main Branch Protection**: Require PR reviews + CI status checks.
- [ ] **Test Environment Configuration (`docker-compose.dev.yml` + `.env.dev`)**: Port 8088 test environment with Watchtower label `enable=true`; production compose specifies `enable=false` with parameterized `IMAGE_TAG`.
- [ ] **End-to-End Smoke Tests**: Verify end-to-end registration -> calculation -> credit deduction on staging (`xuanji.bakers.top`).
- DoD: Branch protection active, backup timer running, staging environment automated, and smoke tests passing.

---

## Track E — GitHub Issue Backlog Triage

- [ ] Run `gh auth login`.
- [ ] Triage open issues into four categories: (1) Conversion-blocking quick fixes (weekend execution), (2) Product enhancements (scheduled), (3) Technical debt (frozen), (4) Obsolete (closed).
- DoD: All issues categorized; Category 1 contains $\le 3$ items and is resolved during the sprint.

---

## Execution Schedule

### Friday Afternoon 09-11 (~4h)
| Duration | Task |
|---|---|
| 15 min | `gh auth login` and issue export |
| 30 min | Issue triage into 4 buckets |
| 1 h | Analytics setup (PostHog/Umami) and deployment |
| 1 h | Homepage copywriting draft and OG share card design |
| 1 h | Draft initial 5 Wiki articles; review and publish |
| 45 min | Database backup script and systemd timer verification |

### Saturday 09-12 (~7h)
| Duration | Task |
|---|---|
| 2 h | Track D wrap-up: Branch protection, compose dev environment, smoke tests |
| 3 h | C1 Share card feature development and review |
| 1 h | Social media setup and initial 3 posts |
| 1 h | Generate 2 gift links and publish 5 additional Wiki articles |

### Sunday 09-13 (~5h)
| Duration | Task |
|---|---|
| 2 h | C2 Credit mission tasks + Category 1 issue fixes |
| 2 h | C3 Annual fortune report MVP (stretch) or 2 email templates |
| 1 h | Retrospective: Initial funnel analytics review and growth channel decisions |

---

## Sunday Definition of Done Checklist
- [ ] Wiki $\ge 12$ articles published; initial social media posts published; 2 gift links distributed.
- [ ] Analytics funnel active; updated homepage and OG cards deployed.
- [ ] Share card feature deployed; branch protection, backup timers, and test automation operational.
- [ ] Issues triaged, Category 1 items resolved.

## Subsequent Week Roadmap
- Growth attribution analysis to identify primary acquisition channels.
- Formalize annual fortune reports and pricing models (one-time vs subscription).
- Prepare Android application wrapper for Google Play Store (Capacitor wrapper exists).
- Evaluate English localization based on Traditional Chinese conversion metrics.
