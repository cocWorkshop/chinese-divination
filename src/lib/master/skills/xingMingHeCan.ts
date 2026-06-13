/**
 * 星命合参 — Cross-validation between BaZi (子平) and Zi Wei Dou Shu (紫微斗數)
 * for the SAME person.
 *
 * Distinct from `bazi_hepan` (two people × one system) and `gua_ming_hu_can`
 * (one oracle anchored to a destiny chart). This skill operates on
 * one-person × two-systems and explicitly surfaces both convergence and
 * divergence between the two destiny views.
 *
 * Design notes: see docs/planning/divination-skill-roadmap-2026-04-27.md.
 */

import type { SkillDef } from './_types'

export const xingMingHeCanSkill: SkillDef = {
  id: 'xing_ming_he_can',
  name_zh: '星命合參',
  name_en: 'Star-Destiny Cross-Validation',
  description_zh:
    '把同一個人的紫微斗數命盤與八字命盤並列互校。八字以五行干支見其根器，紫微以星曜宮位見其格局——兩盤同向即是高信度訊號，兩盤分歧則需找其和解點（時間相位／主題層次／人生領域）。不強行統一兩盤結論，分歧本身常常是最有價值的判讀。',
  description_en:
    "Cross-validate the same person's BaZi and Zi Wei charts. BaZi reveals constitution through five-elements/stems-and-branches; Zi Wei reveals patterns through star palaces. Convergence between the two is a high-confidence signal; divergence is reconciled (time-phase / topic-layer / life-domain) rather than forced into agreement — the divergence itself is often the most valuable reading.",
  prerequisites: {
    self: ['bazi', 'ziwei'],
    minTotal: 2,
    summary_zh: '需要本人的八字命盤與紫微命盤（皆已保存）。缺哪盤就先引導補哪盤。',
    summary_en: "Requires the user's own saved BaZi and Zi Wei readings. If either is missing, guide the user to create the missing one first.",
  },
  recipe: `
**Recipe: 星命合參 — BaZi × Zi Wei cross-validation for the SAME person**

The user wants their two destiny charts compared. This is NOT compatibility (\`bazi_hepan\`) and NOT oracle-anchored (\`gua_ming_hu_can\`). It is one-person × two-systems mutual verification.

## Phase A — Confirm both charts exist

Call in parallel in the same turn:
- \`list_readings({type:'bazi', targetType:'self'})\`
- \`list_readings({type:'ziwei', targetType:'self'})\`

Branches:
- **Both empty** → soft-nudge to start with BaZi (lower input barrier, more universal). Call \`prefill_divination_form({type:'bazi', target:{kind:'self'}, prefill:{...known fields from get_user_profile if useful}})\`. Stop the recipe.
- **Only one missing** → state plainly that the cross-validation needs the other system too, then \`prefill_divination_form\` for the missing type. Do NOT proceed with a one-sided reading; that would defeat the skill's purpose.
- **Both present** → continue to Phase B.

## Phase B — Pull both charts in parallel

Emit two \`get_reading\` calls in the SAME turn (one for bazi, one for ziwei). Do not serialize.

## Phase C — Cross-position mapping

Walk the user's question (or, if no specific question, the user's most likely concern from their portrait / recent readings) against this mapping. Pull evidence from BOTH charts for each topic the user touches. Do not lecture through every row — only cite the rows that matter to the question:

| Topic | BaZi anchor | Zi Wei anchor |
|---|---|---|
| 性格／自我 (self / character) | 日主 + 月令旺衰 + 比劫格局 | 命宮主星 + 身宮 |
| 感情／婚姻 (love / marriage) | 配偶宮（日支）+ 夫妻星位置 | 夫妻宮三方四正 |
| 事業 (career) | 正官／七殺 + 喜用神運程 | 官祿宮主星 + 化權／化祿落宮 |
| 財運 (wealth) | 正財／偏財 + 財星旺衰 | 財帛宮主星 + 化祿落宮 |
| 健康 (health) | 五行偏枯 + 忌神所在 | 疾厄宮 + 化忌星 |
| 父母 (parents) | 印星 + 年柱 | 父母宮 |
| 兄弟 (siblings) | 比劫 | 兄弟宮 |
| 子女 (children) | 食傷 | 子女宮 |
| 時間相位 (timing) | 大運 + 流年（含吉凶） | 大限 + 流年四化 |

If the chart header lacks a needed section, call \`get_reading_detail\` for it. Bazi sections you may need: \`daYunAnalysis\`, \`branchAnalysis\`, \`shenSha\`. Ziwei sections you may need: \`palaces\`, \`daYunAnalysis\`, \`keyPredictions\`.

## Phase D — Three verdict modes (this is the core of the skill)

Classify each topic you cite into one of three modes. Be honest about which mode applies — the user's trust depends on it.

### Mode 1 — 雙盤同向 (convergent)
Both charts point to the same outcome. State this with confidence: "兩盤都顯示...". This is the most reliable kind of conclusion.

### Mode 2 — 雙盤分歧 (divergent) — DO NOT HIDE
The two charts say different things. **Never paper over this.** Surface it explicitly with a "**雙盤分歧**：" line, then offer ONE reconciliation hypothesis from these angles:
- **時間相位** — maybe BaZi describes the underlying tendency while Zi Wei's 大限 shows a current overlay (or vice versa).
- **主題層次** — maybe one chart is showing the inner state and the other the outer expression.
- **人生領域** — maybe the topic splits across multiple life domains (e.g. career vs. wealth) and each chart is more sensitive to one.

If none of these reconciliations feels honest, **say so** and offer to cast a 六爻 hexagram as a third-party arbiter. Do NOT manufacture a fake reconciliation.

### Mode 3 — 一盤明顯一盤模糊 (one clear, one ambiguous)
Lead with the clear chart; use the ambiguous one as supportive (or neutral) context. Name which is which: "八字此處明顯，紫微此處中性，所以以八字為主錨。"

## Phase E — On-demand depth

If the user follows up on a specific topic, call \`get_reading_detail\` on whichever chart's section is most informative. You may pull a section from one chart without re-pulling from the other if the second chart has nothing additional to say on that topic.

---

## Output style

- **Lead bubble (60-120 chars):** the integrated verdict — what BOTH charts agree on, framed as a single insight, not "BaZi says X, Zi Wei says Y" stitched together.
- **Evidence bullets (2-4 items):** one bullet per topic the user actually asked about. Each bullet cites the bazi anchor AND the ziwei anchor so the reader sees the cross-validation. Use \`[NEXT]\` to break into a second bubble if you go past ~3 bullets.
- **Divergence section if any:** prefix with "**雙盤分歧**：" — name the divergence, give your one reconciliation hypothesis, stop. Do not over-explain.
- **Closing (1-2 lines):** concrete suggestion or warning grounded in convergent evidence. If only divergent evidence exists for the user's question, say so directly and offer a 六爻 cast as arbitration.

## Anti-patterns (do not do these)

- ❌ Reciting both charts in full as parallel paragraphs ("您的八字是... 您的紫微是...") — that's two readings glued together, not 合參.
- ❌ Forcing convergence when the charts disagree. The divergence IS the reading.
- ❌ Asking the user to choose which system they "trust more". You are the master; you do the synthesis.
- ❌ Treating ziwei's abstract star language as decorative. Translate star meanings into concrete life-effects in the user's question domain.
`.trim(),
  triggers: [
    '星命合參', '星命合参', '合參', '合参', '互校', '對照', '对照',
    '兩盤一起看', '两盘一起看', '八字紫微一起', '紫微八字一起',
    'bazi and ziwei together', 'compare bazi and ziwei', 'cross check destiny',
    'star and destiny', 'cross validate my charts',
  ],
}
