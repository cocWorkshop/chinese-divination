# Master Xuanji — Core Divination Skill Upgrade Roadmap

**Status:** Draft / Planned  
**Date:** 2026-04-27  
**Owner:** Wei Zhang  
**Scope:** `src/lib/master/skills/`  

---

## 0. Background

`gua_ming_hu_can` (Hexagram-Destiny Cross-Reference) has proven an important product paradigm: **Master does not compute raw data, but orchestrates existing readings through prose recipes into higher-order interpretative experiences.** Skills within the system represent:

- A prose recipe (executed by LLM rather than deterministic code)
- No new calculators, no new API endpoints, and no schema migrations
- One file plus one registry entry; the marginal implementation cost approaches zero
- The only hidden cost: every skill is injected into the system prompt; excessive skills risk confusing tool selection and elevating prompt cache eviction

Therefore, the core skill roadmap question is not "how many skills can be added," but rather "**which methodologies can be transformed into high-order experiences that demonstrate profound metaphysical mastery without duplicating existing readings or skills.**"

---

## 1. High-Order Methodologies in Chinese Metaphysics

The candidate pool compiles traditional metaphysical methodologies evaluated for product viability:

### 1. Cross-System Synthesis

| Methodology | Core Concept | Mapping in Current System |
|---|---|---|
| **Three Styles Synthesis** (Taiyi / Qimen / Liuren) | Cast three systems simultaneously on a single event for mutual corroboration | ❌ Lacks Taiyi and Liuren calculators; only Qimen exists |
| **Star-Destiny Synthesis** (Zi Wei Dou Shu ⊕ BaZi) | Cross-validate two destiny frameworks: high confidence when aligned, reconcile when conflicting | ✅ Both implemented as core reading types |
| **Hexagram Resonance & Solar Terms** | I Ching hexagrams × 24 Solar Terms / 72 Pentads | ⚠️ Conceptually interesting but lacks dedicated reading substrate |

### 2. Intra-System Advanced Deduction

| Methodology | Core Concept | Mapping in Current System |
|---|---|---|
| **Iron Plate Verification** (Tieban Shenshu) | Reverse-deduce parental and sibling data to calibrate exact birth quarter-hour | ❌ Requires interactive trial loop; unsuitable for read-only skill |
| **Plum Blossom Substance & Function** | Moving lines, mutual hexagrams, resulting hexagrams, and external omens | ⚠️ Already integrated within Plum Blossom reading; no standalone skill needed |
| **Zi Wei Flying Stars** | Chain Four Mutagens across Natal, Decadal, and Annual charts | ⚠️ Belongs in Zi Wei V3 calculator upgrade rather than Master prompt skill |

### 3. Geomancy & Date Selection Intersections

| Methodology | Core Concept | Mapping in Current System |
|---|---|---|
| **Destiny ⊕ Feng Shui Harmonization** | Use BaZi favorable elements to align residential layout; leverage Feng Shui to balance natal chart | ✅ Both BaZi and Feng Shui readings exist; viable candidate |
| **Destiny-Attuned Date Selection** | Select auspicious moments tailored to balance natal chart deficiencies | ⚠️ Lacks native date calculator; approximating via Qimen/Meihua risks overpromising |

### 4. Religious & Metaphysical Medical Integration

| Methodology | Core Concept | Mapping in Current System |
|---|---|---|
| **Medical-I Ching Convergence** | BaZi / Zi Wei × Five Element visceral manifestations | ⚠️ Medical liability risks; inappropriate for direct AI consultation |
| **Talismanic & Remedial Rituals** | Prescriptive rituals moving from fatalism to remedial action | ❌ Incompatible with product positioning and scope |

---

## 2. Evaluation and Tiering

Criteria:
1. **Feasibility** — Are prerequisite readings fully supported?
2. **Uniqueness** — Does it avoid overlapping existing skills?
3. **Product Value** — Does it establish distinct perception of deep domain expertise?
4. **Scope Safety** — Does it avoid boundary violations (medical, legal, financial speculation)?

### Tier 1 — Immediate Implementation

| Skill | Rationale |
|---|---|
| **Star-Destiny Synthesis** (`xing_ming_he_can`, Zi Wei ⊕ BaZi) | Structurally analogous to `bazi_hepan` (read two records → compare → synthesize), but along a different axis (two systems for one individual rather than two individuals). A classical hallmark of advanced consultation. Prerequisite readings fully operational. **Target for current release.** |

### Tier 2 — Next-Phase Candidates (Evaluate Post-Tier 1)

| Skill | Deferral Rationale |
|---|---|
| **Destiny & Feng Shui Harmonization** (`ming_li_feng_shui`, BaZi favorable elements → Feng Shui directional adjustments) | Strong commercial resonance, but requires verifying user appetite for connecting both readings within Master context. Revisit after Tier 1 metrics mature. |
| **Destiny-Attuned Date Selection** (`zao_ming_ze_ri`, BaZi deficiencies → Qimen/Meihua timing recommendations) | Compelling concept, but lacking native date selection calculator. Approximating through Qimen risks exceeding foundational ground truth. Requires dedicated calculator feasibility study first. |

### Tier 3 — Excluded from Roadmap

| Skill | Exclusion Rationale |
|---|---|
| Three Styles Synthesis | Missing Taiyi and Liuren computation engines |
| Iron Plate Verification | Requires conversational trial loops; unsuitable for prompt recipe format |
| Zi Wei Flying Stars | Belongs to Zi Wei core reading V3 roadmap, not conversational skill |
| Medical-I Ching Convergence | High clinical risk; conflicts with Master boundaries ("Capabilities — CANNOT") |
| Hexagram Resonance & Solar Terms | Lacks structured reading substrate |
| Talismanic Rituals | Incompatible with product positioning |

---

## 3. Tier 1 Detailed Design: `xing_ming_he_can` (Star-Destiny Synthesis)

### 3.1 Product Positioning

**Summary**: "Evaluate your Zi Wei Dou Shu and BaZi side by side. When both frameworks point in the same direction, that represents a profound destiny signal; when they diverge, we uncover where their reconciliation lies."

**User Motivation**:
- Holds prior BaZi reading but seeks second-opinion validation
- Completed Zi Wei reading but finds astrological symbology abstract; desires concrete Five Elements and Ten Gods anchoring
- Investigating pivotal life domains (career, relationships, health) seeking high-confidence dual-system consensus

**Differentiation from Existing Skills**:
- vs `bazi_hepan` (two individuals × one system) → **one individual × two systems**
- vs `gua_ming_hu_can` (one hexagram × one natal chart) → purely destiny-to-destiny cross-validation without horary divination

### 3.2 Prerequisites

- **Saved self BaZi reading**
- **Saved self Zi Wei reading**

If both missing → guide to BaZi first (lower friction, broad applicability); if either missing → guide user to cast the missing reading.

### 3.3 Recipe Structure

```
Phase A — Validate Dual Charts Availability
  list_readings({ type: 'bazi', targetType: 'self' })
  list_readings({ type: 'ziwei', targetType: 'self' })  # Parallel
  Missing chart → prefill_divination_form, prompt user, halt recipe

Phase B — Retrieve Chart Data
  get_reading on bazi
  get_reading on ziwei  # Parallel tool calls

Phase C — Multi-Domain Alignment (Core)
  Extract matching coordinates across both charts by thematic domain:
    Self / Character: Day Master vitality ↔ Life Palace main stars
    Favorable Elements: Five Elements affinity ↔ San Fang Si Zheng auspicious stars
    Unfavorable Influence: Taboo God (Ji Shen) ↔ Hua Ji star palace placement
    Temporal Cycles: Decadal Fortune (DaYun) ↔ Decadal Limit (DaXian) Mutagens
    Interpersonal / Ten Gods ↔ Six Relatives palaces

Phase D — Tri-Fold Conclusion
  1) Aligned signals → High-confidence synthesis ("Both charts converge on...")
  2) Divergent signals → Acknowledge nuance directly; deliver reconciling interpretation
  3) Asymmetric clarity → Lead with definitive chart; use ambiguous chart as auxiliary evidence

Phase E — On-Demand Deep Dive
  User follows up on specific domain → get_reading_detail for corresponding section
```

### 3.4 Coordinate Mapping Matrix (Embedded in Recipe)

| Domain | BaZi Coordinates | Zi Wei Coordinates |
|---|---|---|
| Personality / Self | Day Master vitality + Month Commander status | Life Palace main stars + Body Palace (Shen Gong) |
| Relationships | Spouse Palace (Day Branch) + Spouse Stars | Spouse Palace San Fang Si Zheng |
| Career & Wealth | Direct Officer / Seven Killings / Wealth Stars + Favorable Fortune | Career and Wealth Palace main stars + Hua Quan / Hua Lu placements |
| Health | Element imbalances + Taboo God (Ji Shen) location | Health Palace (Ji E) + Hua Ji star |
| Parents & Elders | Seal Stars (Yin) + Year Pillar | Parents Palace |
| Siblings & Peers | Companion Stars (Bi Jie) | Siblings Palace |
| Children | Output Stars (Shi Shang) | Children Palace |
| Major Life Cycles | Decadal Fortune (DaYun) + Annual Pillar (LiuNian) | Decadal Limit (DaXian) + Annual Four Mutagens |

### 3.5 Conflict Resolution Protocol

Divergence between the two frameworks represents the highest-value analytical scenario and must be addressed transparently:

1. **Avoid Forced Unification**: State clearly that "BaZi highlights X while Zi Wei indicates Y," acknowledging genuine nuance.
2. **Seek Contextual Harmony**: Reconcile across temporal phases (early vs mid vs late life), thematic layers (external circumstances vs internal mindset), or distinct operational domains.
3. **Irreconcilable Discrepancies**: Adopt prudent, calibrated tone and suggest a horary hexagram (Liu Yao) as impartial arbiter.

### 3.6 Output Style

- 60–120 word synthesized overview focusing on convergent indicators
- 2–4 structured bullet points aligned with user inquiry priorities
- Distinct "**Cross-Chart Divergence**:" section highlighting nuanced contradictions
- 1–2 actionable takeaways or cautions grounded strictly in shared evidence

### 3.7 Triggers

- "Star-destiny synthesis", "cross-reference charts", "compare BaZi and Zi Wei", "read both charts together"

---

## 4. Out of Scope

- No new calculators, reading schemas, or tool primitives
- Tier 2/3 methodologies excluded from initial PR
- No automated skill trigger heuristics (Master retains autonomous selection via trigger cues)
- No specialized UI components (leverages standard CTA and reading cards)

---

## 5. Risks and Monitoring

| Risk | Mitigation / Observability |
|---|---|
| Prompt bloat causing Master selection confusion | Audit session logs for unintended recipe invocation on single-system queries |
| Prompt cache eviction rates | Track reasoning metadata to detect catalog prompt volatility |
| Forced reconciliation concealing valid discrepancies | Monitor frequency of "Cross-Chart Divergence" sections in synthesized outputs |

---

## 6. Migration and Maintenance

- **Post-Shipment**: Update status header to "Shipped", archive Tier 1 section, retain Tier 2/3 candidate pool, and relocate to `docs/architecture/master-skills-system.md`.
- **Tier 2/3 Re-evaluation**: Create dedicated RFC upon scheduling new skill candidates.

---

**Kickoff Reference**: "To inspect Master skills roadmap and `xing_ming_he_can` architecture: see `docs/archive/divination-skill-roadmap-2026-04-27.md`; implementation located at `src/lib/master/skills/xingMingHeCan.ts`."
