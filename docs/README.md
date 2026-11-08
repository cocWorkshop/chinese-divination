# XuanJi — Engineering & Product Documentation Index

This directory contains the engineering architecture, domain knowledge standards, active planning, and historical archives for the "XuanJi" AI Chinese Divination system.

---

## Directory Overview

```
docs/
├── README.md                 <- [Doc Index] (This document)
├── DEPLOYMENT.md             <- [Ops Manual] Production environment, quality gates, Docker deployment, and observability
│
├── 260912/                   <- [Active Sprint] 2026-09 Product analysis, sprint planning, and Oriental aesthetic redesign
│   ├── 2026-09-11-product-analysis.md
│   ├── 2026-09-11-sprint-plan.md
│   ├── 2026-09-12-product-design-enhancement-plan.md
│   └── 2026-09-12-ui-ux-aesthetic-audit-and-redesign.md
│
├── architecture/             <- [System Architecture] Core production subsystems and architectural specifications
│   ├── overview.md
│   ├── master-interaction-features.md
│   ├── master-portrait-system.md
│   ├── start-funnel.md
│   └── streaming-divination.md
│
├── references/               <- [Domain References] Gold standard benchmarks, algorithms, and Master consultation dialogues
│   ├── bazi-gold-standard-example.md
│   ├── ziwei-gold-standard-example.md
│   ├── dayun-reference.md
│   └── master-chat-scenarios.md
│
├── planning/                 <- [Active Planning] System audits, performance optimizations, and deferred task tracking
│   ├── audit-2026-09-round2.md
│   ├── audit-2026-10.md
│   └── ui-restyle-2026-10.md
│
└── archive/                  <- [Historical Archives] Fully implemented, superseded, or contextual decision records
    ├── changelog-2026-06.md
    ├── prisma-migrations-recovery-202606.md
    ├── deferred-evaluation-tasks-202606.md
    ├── activation-resume-design-2026-04-27.md
    ├── divination-skill-roadmap-2026-04-27.md
    ├── hci-audit-2026-04-27.md
    ├── uix-hci-audit-2026-06-12.md
    └── ziwei-upgrade-plan.md
```

> **Note**: The root-level `divination-refs/` directory contains **runtime dynamic LLM system prompt templates** representing active business logic assets (see section below).

---

## 1. System Architecture (`architecture/`)

Primary reference for team onboarding and system maintainers. Each document corresponds to an active, stable production subsystem:

| Document | Core Topics Covered |
|---|---|
| [overview.md](architecture/overview.md) | **System Whitepaper**: 8 Chinese divination systems, dual-track deterministic paipan + LLM interpretation, architectural invariants, atomic Karma credit reservations, and ledger audit. |
| [streaming-divination.md](architecture/streaming-divination.md) | **Streaming Architecture**: SSE transport protocol, character-level JSON streaming FSM, 15s keep-alive heartbeat, RAF 60fps throttling, and long-call progressive feedback. |
| [master-interaction-features.md](architecture/master-interaction-features.md) | **Master Interaction Engine**: Global state machine, burst debouncing (1500ms), in-flight interruption, CTA reversal, idle reflection (75-120s), and activation resume. |
| [master-portrait-system.md](architecture/master-portrait-system.md) | **Master Memory System**: Three-layer memory hierarchy (raw chat log, 60K token sliding window summarizer, dual-axis profile extraction), personalized prompt caching, and GDPR boundaries. |
| [start-funnel.md](architecture/start-funnel.md) | **Acquisition Funnel**: `/start` 5-view funnel state transitions, frictionless trial paipan, signed funnel cookie auth, and abuse-resistant trial conversion. |

---

## 2. Domain References & Benchmarks (`references/`)

Reference material for modifying LLM prompts, tuning output schemas, or aligning with metaphysical domain requirements:

| Document | Primary Purpose |
|---|---|
| [bazi-gold-standard-example.md](references/bazi-gold-standard-example.md) | BaZi V2 gold standard output benchmark and **4-dimension architectural evaluation rubric**. |
| [ziwei-gold-standard-example.md](references/ziwei-gold-standard-example.md) | Zi Wei Dou Shu V2 gold standard output benchmark and **star mutagen causal chain evaluation rubric**. |
| [dayun-reference.md](references/dayun-reference.md) | **Decadal Fortune Algorithmic Spec**: Astronomical solar term criteria, high-precision conversion equations, edge boundaries, and code mappings. |
| [master-chat-scenarios.md](references/master-chat-scenarios.md) | **Master Consultation Corpus**: 22 authentic WeChat dialogue samples, 5-stage conversation control model, 4 safety boundaries, and LLM-as-a-Judge scoring rubric. |

---

## 3. Active Planning & Sprints (`260912/` & `planning/`)

Ongoing product designs and technical audit tracks:

| Directory / Document | Status / Description |
|---|---|
| [docs/260912/](260912/) | **Primary Active Sprint**: Competitive teardown, sprint execution roadmap, Oriental sanctuary aesthetics, and de-AI template UI/UX refactor. |
| [planning/audit-2026-09-round2.md](planning/audit-2026-09-round2.md) | **Technical Audit Round 2**: Concurrency race fixes for billing, security hardening, database index tuning, and P1~P14 deferred task backlog. |
| [planning/audit-2026-10.md](planning/audit-2026-10.md) | **Full Spectrum Technical Audit**: Complete audit covering W0~W8 findings and ISS-01 to ISS-28 resolutions. |
| [planning/ui-restyle-2026-10.md](planning/ui-restyle-2026-10.md) | **UI Restyle Plan**: Visual token consolidation, mobile responsiveness, and layout architecture. |

---

## 4. Historical Archives (`archive/`)

Fully delivered, superseded, or contextual historical records maintained for architectural lineage:

| Document | Original Purpose & Archival Reason |
|---|---|
| [changelog-2026-06.md](archive/changelog-2026-06.md) | Consolidated changelog covering all 11 change records from the 2026-06 refactor sprint (Phase 0~2, UIX W0~W5). |
| [prisma-migrations-recovery-202606.md](archive/prisma-migrations-recovery-202606.md) | 2026-06 Database drift reconciliation runbook (production schema is fully reconciled). |
| [deferred-evaluation-tasks-202606.md](archive/deferred-evaluation-tasks-202606.md) | June deferred item evaluation (Shensha metaphysical alignment completed; constant-time bcrypt implemented). |
| [activation-resume-design-2026-04-27.md](archive/activation-resume-design-2026-04-27.md) | Initial Master activation resume mechanism proposal (implemented; active spec in `architecture/`). |
| [divination-skill-roadmap-2026-04-27.md](archive/divination-skill-roadmap-2026-04-27.md) | Master skill expansion roadmap (Tier 1/2 skills implemented in `src/lib/master/skills/`). |
| [hci-audit-2026-04-27.md](archive/hci-audit-2026-04-27.md) | April HCI audit report (P0/P1/P2 optimizations fully implemented). |
| [uix-hci-audit-2026-06-12.md](archive/uix-hci-audit-2026-06-12.md) | June UIX audit report (W0~W5 optimizations fully implemented). |
| [ziwei-upgrade-plan.md](archive/ziwei-upgrade-plan.md) | Early Zi Wei V2 upgrade roadmap (fully deployed). |

---

## Runtime LLM Prompt Templates (`divination-refs/`)

Markdown files in the root `divination-refs/` directory are **dynamically loaded at runtime** by `src/lib/llm/prompts.ts` and `src/lib/master/systemPrompt/persona.ts`:

| File | Loaded By | Function |
|---|---|---|
| `master.md` | `persona.ts` | Master persona, tone rules (Voice), capability limits, and interruption/reflection heuristics. |
| `bazi.md` | `prompts.ts` | BaZi interpretation framework: strength analysis, climatic regulation, structure, and Ten Gods. |
| `ziwei.md` | `prompts.ts` | Zi Wei Dou Shu interpretation framework: Twelve Palaces, Si Hua flying stars, and star interactions. |
| `iching.md` | `prompts.ts` | I Ching sixty-four hexagram statements and line judgements. |
| `liuyao.md` | `prompts.ts` | Jing Fang Liu Yao Najia, Shi/Ying lines, and Six Relatives useful god selection rules. |
| `qimen.md` | `prompts.ts` | Qi Men Dun Jia Heaven/Earth plates, Nine Stars, Eight Gates, and Eight Deities. |
| `fengshui.md` | `prompts.ts` | Residential Feng Shui Four Celestial Animals, Eight Mansions, and form adjustments. |
| `others.md` | `prompts.ts` | Plum Blossom Divination, Liu Ren divination methods, and host/guest interaction dynamics. |

> Warning: Modifying Markdown files in `divination-refs/` directly affects production LLM inference and tone. Validate any changes in staging or against gold standard benchmark suites before deploying.
