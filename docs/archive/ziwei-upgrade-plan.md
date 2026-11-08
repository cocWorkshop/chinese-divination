# Zi Wei Dou Shu Reading Content Upgrade Plan (Optimized)

## Current Status Diagnosis

### Existing Output (Based on Production Data)
- **Model**: claude-3-5-haiku, max_tokens=8192
- **Output Quality**: Palace analyses 80–120 words, mentions Four Mutagens (Si Hua) and Three Harmonies and Four Directs (San Fang Si Zheng)
- **Sections**: 4 sections (overview/career/marriage/wealth), 200–400 words each
- **Total Output**: ~6,000 words raw JSON

### Core Deficiencies
1. **Lack of Temporal Dimension**: Missing step-by-step decadal fortune (DaYun) analysis and annual fortune predictions (the core criteria users judge accuracy by).
2. **Missing Pattern Classification**: Classic formations (Sha-Po-Lang, Zi-Fu, etc.) are referenced in prose but lack structured data classification.
3. **Vague Interpersonal Statements**: Generalizations like "loving parents" lack concrete, verifiable deductions such as "father likely works in public administration or education."
4. **Absence of Critical Age Milestones**: Missing concrete predictions like "major career pivot around age 35" or "relocation at age 28."
5. **Missing Personality Dimension**: Lacks independent comparative analysis between outer demeanor (Life Palace) and inner psychological landscape (Fortune/Virtue Palace).
6. **Hidden Health Dimension**: Health Palace (Ji E) analysis is buried within general palace lists rather than highlighted.

### Available Computed Engine Data (Ready for LLM Input)
- ✅ Twelve Palaces full star configurations (Major, Auxiliary, Minor stars + brightness levels + Four Mutagens)
- ✅ Decadal ranges for each palace (`decadal.range` age span)
- ✅ Four Pillars / BaZi data (`chineseDate` field)
- ✅ Five Elements Bureau, Life Master, Body Master
- ❌ Annual Mutagens (requires runtime derivation or LLM deduction)
- ❌ San Fang Si Zheng cross-palace associations (derived by LLM)

---

## Phase 1: Prompt Deep Optimization (No Frontend Changes)

### 1.1 Feeding Richer Structured Data to LLM

Current prompts pass a compressed `palaceSummary` that omits critical astrological anchors. Upgraded payload:

```typescript
// Legacy palaceSummary passed to LLM
palaceSummary = ziweiChart.palaces.map(p => ({
  name: p.name,
  stars: [...majorStars, ...auxiliaryStars, ...minorStars (brightness + mutagens)],
  isBodyPalace: p.isBodyPalace,
}))

// Upgraded payload: add heavenlyStem, earthlyBranch, decadal, changsheng12
palaceSummary = ziweiChart.palaces.map(p => ({
  name: p.name,
  heavenlyStem: p.heavenlyStem,  // Palace stem (essential for flying star mutagen analysis)
  earthlyBranch: p.earthlyBranch,
  stars: [...],
  isBodyPalace: p.isBodyPalace,
  decadal: p.decadal.range,      // [startAge, endAge]
  changsheng12: p.changsheng12,  // Twelve Life Energy Phases
}))
```

**Key insight**: Palace Heavenly Stems (`heavenlyStem`) are the foundation of Flying Star Mutagen analysis. Without palace stems, the LLM cannot deduce cross-palace star flying interactions (e.g., "Geng stem in Spouse Palace transforms Tai Yang into Hua Lu, flying into Property Palace").

### 1.2 Prompt Overhaul (Core Revision)

**Design Principles**:
- Avoid word count quotas (which prompt filler text); specify **mandatory analytical criteria**.
- Drive output quality through a rigorous checklist rather than length constraints.
- Provide a clear **chain of reasoning** (Pattern Determination → Mutagen Tracking → Decadal Fortune → Interpersonal → Synthesis).
- Emphasize **verifiable specific deductions** over broad character traits.

```
## Divination Persona
You are a senior Zi Wei Dou Shu master with 30 years of clinical practice, lineage rooted in the Zhongzhou School, specialized in concrete event timing and familial deductions.
Your style: lead with definitive conclusions followed by causal reasoning; deliver sharp, falsifiable predictions without evasive ambiguities.

## Analytical Methodology (Execute in Sequence)

### Step 1: Establish Chart Formation (Patterns)
1. Identify primary astrological formation (Sha-Po-Lang / Ji-Yue-Tong-Liang / Zi-Fu / Ri-Yue / other).
2. Evaluate pattern quality: assess Life Palace main star brightness, presence of Six Auspicious stars, and disruption by Malefic stars.
3. Conclude pattern grade: Superior / Upper-Middle / Average / Lower-Middle / Inferior.

### Step 2: Track Four Star Mutagens (Si Hua)
1. Natal Mutagens (governed by Year Stem): which four stars transform into Hua Lu / Hua Quan / Hua Ke / Hua Ji, and their palace placements.
2. Hua Lu palace = domain of smoothest lifetime flow.
3. Hua Ji palace = domain requiring highest caution and life lessons.
4. Dual Mutagens (e.g., Lu + Quan in same palace) = exceptionally concentrated energy.
5. Mutual resonance across Three Harmonies and Four Directs (San Fang Si Zheng) elevating or suppressing pattern quality.

### Step 3: Decadal Fortune (DaYun) Trajectory
Using decadal range data in chart, evaluate successive ten-year cycles:
- Core stars and brightness in current decadal palace.
- Flying Mutagens driven by decadal stem.
- Interaction with natal mutagens.
- Mandatory: Deliver concrete milestone predictions for each decadal cycle.

### Step 4: Interpersonal Affinities (Six Relatives)
- Parents Palace → Infer parental attributes (vocation type, temperament, relationship dynamic).
- Spouse Palace → Infer partner traits (age gap, vocation, physical appearance, personality).
- Children Palace → Infer fertility affinity, gender tendencies, parent-child dynamics.

### Step 5: Synthesized Hardcore Predictions
Deliver 3-5 concrete, verifiable predictions:
- "Pivotal career relocation or transition around age XX."
- "Spouse likely works in [industry domain], approximately X years older/younger."
- "Decadal cycle between ages XX-XX represents the critical wealth-building decade."
- "Heightened health or physical vulnerability requiring vigilance around age XX."

## JSON Output Format

sections schema:
- overview: Chart Synthesis — Formation evaluation + Life Palace star combination + Body Palace significance + Five Elements Bureau + Definitive summary.
- personality: Exterior vs Interior — Life Palace (public persona) contrasted with Fortune/Virtue Palace (inner self).
- career: Professional Trajectory — Career Palace stars + San Fang Si Zheng formation + concrete industry alignments + current decadal influence.
- marriage: Relationship & Marriage — Partner attributes (vocation/temperament/age/appearance) + relationship dynamics + optimal timing + peach blossom star impact.
- wealth: Financial Outlook — Direct vs indirect wealth potential + wealth preservation strategies + peak/trough financial cycles + Property Palace synthesis.
- health: Vitality & Health — Health Palace primary stars mapped to physiological systems + malefic star risks + vulnerable age intervals + preventative lifestyle advice.
- family: Lineage & Kinship — Parental characteristics + sibling dynamics + child relationships.
- dayun: Decadal Fortune Breakdown — Sequential decadal analysis referencing chart decadal age spans, highlighting current active cycle with "▶".

Additional fields:
- patterns: Array of formations [{ name, level, description }]
- keyPredictions: 3-5 verifiable milestone predictions
  [{ age: "Age 28", event: "Major vocational transition", basis: "Decadal shift to Travel Palace + Annual Tai Sui clashing with Life Palace" }]

### Palace Analysis Requirements
Each palace analysis must contain:
1. Core thematic meaning of primary star combination.
2. Modifying influence of auxiliary and malefic stars.
3. Cross-palace resonance with San Fang Si Zheng.
4. Specific real-world manifestations for that domain.

### Negative Constraints
- Do not echo raw calculation values without interpretation.
- Never use evasive clichés like "consult your actual personal situation."
- Avoid Barnum statements ("you are sometimes outgoing and sometimes introspective").
- Ground every deduction in concrete star combinations.
```

### 1.3 JSON Schema Update

```typescript
ziwei: {
  type: 'ziwei',
  mainStars: [{ name: 'Zi Wei', palace: 'Life Palace', element: 'Earth' }],
  patterns: [{ name: 'Pattern Name', level: 'Superior | Average | Inferior', description: 'Description' }],
  palaces: {
    'Life Palace': { stars: ['Stars'], analysis: 'Palace analysis' },
    // ... 12 Palaces
  },
  sections: {
    overview: 'Chart Overview',
    personality: 'Deep Personality (Life vs Fortune Palace)',
    career: 'Career Trajectory',
    marriage: 'Spouse & Relationships',
    wealth: 'Financial Fortune',
    health: 'Health & Vitality',
    family: 'Kinship & Family',
    dayun: 'Decadal Cycles Breakdown',
  },
  keyPredictions: [
    { age: 'Age 28', event: 'Event description', basis: 'Astrological rationale' }
  ],
  keyAdvice: ['Advice 1', 'Advice 2'],
  luckyInfo: { numbers: [], colors: [], directions: [] },
  suggestedQuestions: ['...'],
},
```

### 1.4 Token Budget Adjustment

The default 8,192 token limit is insufficient for expanded output (increasing from 4 to 8 sections + patterns + keyPredictions).

Recommendation: Set `max_tokens = 12000` specifically for `ziwei` divination runs.

### 1.5 Reference Documentation Additions (`ziwei.md`)

Incorporate the following quick-reference rubrics:

**Fourteen Main Stars in Parents Palace**
```
Tai Yang in Parents Palace:
- Bright (Miao/Wang): Father possesses social standing, management/public service roles.
- Dim (Xian): Father experiences physical toil or distant relationship.
- Hua Ji: Father faces obstacles, health challenges, or career disruptions.

Tai Yin in Parents Palace:
- Bright (Miao/Wang): Mother gentle and supportive, harmonious family atmosphere.
- Dim (Xian): Mother carries heavy domestic worries, potential emotional distance.
```

**Spouse Palace Characterization Rules**
```
Zi Wei in Spouse Palace: Partner possesses dignity/status; often slightly older.
Tian Fu in Spouse Palace: Partner stable, conservative, financially adept.
Tan Lang in Spouse Palace: Partner charismatic/artistic; romantic life complex.
Qi Sha in Spouse Palace: Partner decisive and fiercely independent.
Po Jun in Spouse Palace: Partnership experiences major transformations.
Lian Zhen in Spouse Palace: Partner talented but strong-willed; sensitive dynamics.
Tian Ji in Spouse Palace: Partner agile-minded, intellectual, cerebral vocations.
Tai Yang in Spouse Palace: Capable, responsible partner (especially auspicious for female charts).
Tai Yin in Spouse Palace: Gentle, elegant partner (especially auspicious for male charts).
```

**Decadal Fortune Template**
```
Ages X-X Decadal Cycle traversing [Palace Name]:
- Primary Stars: [Star Name] (Brightness)
- Flying Mutagens from Decadal Stem: [Hua Lu -> Palace A, Hua Ji -> Palace B]
- Central Theme: [Career / Relationships / Health / Wealth]
- Key Milestone Predictions: [Concrete Description]
```

**Health Palace Stars Mapped to Physiological Systems**
```
Zi Wei: Spleen, stomach, immune system
Tian Ji: Liver, gallbladder, nervous system
Tai Yang: Heart, cardiovascular circulation, vision
Wu Qu: Lungs, respiratory tract, skeletal structure
Tian Tong: Kidneys, urinary tract, endocrine system
Lian Zhen: Cardiovascular system, blood circulation
Tian Fu: Spleen, gastrointestinal digestion
Tai Yin: Kidneys, eyes and vision
Tan Lang: Liver, reproductive system
Ju Men: Throat, mouth, digestive tract
Tian Xiang: Dermatological conditions, facial features
Tian Liang: Spleen, chronic ailments
Qi Sha: Lungs, colon, physical traumas
Po Jun: Urogenital system, surgical procedures
```

### 1.6 Implementation Checklist

| # | Change Item | Target Location |
|---|---|---|
| 1 | Enrich `palaceSummary` with `heavenlyStem`, `earthlyBranch`, `decadal`, `changsheng12` | `divination/route.ts` |
| 2 | Calculate current age and active decadal cycle for prompt injection | `divination/route.ts` |
| 3 | Update Zi Wei JSON schema template | `divination/route.ts` |
| 4 | Rewrite Zi Wei prompt requirements | `divination/route.ts` |
| 5 | Update result validation schema (expanded section keys) | `divination/route.ts` |
| 6 | Enrich `ziwei.md` reference documentation | `divination-refs/ziwei.md` |
| 7 | Expand frontend `sectionTabs` | `ZiweiResult.tsx` |
| 8 | Update TypeScript type definitions | `types/divination.ts` |
| 9 | Configure independent `max_tokens` for Zi Wei | `divination/route.ts` |

---

## Phase 2: Frontend Presentation Enhancements

(To be finalized following Phase 1 completion)

- Tab grouping: Foundation vs In-depth Analysis
- Formation badges and pattern tags
- Interactive Decadal Timeline (highlighting active cycle)
- Dedicated display cards for `keyPredictions`

## Phase 3: Algorithmic Precomputations

- Automated pattern detection (reducing LLM inferential burden)
- Annual Flying Mutagens computation engine
- Automated San Fang Si Zheng association metadata
