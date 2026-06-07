/**
 * 擇日 — auspicious date selection, anchored to the 主事人's BaZi.
 *
 * Honesty constraint: the Master cannot reliably compute the 干支 of an
 * arbitrary future calendar date, so this skill gives a 喜用神-grounded
 * FRAMEWORK + favourable windows + hard avoidances, and routes precise
 * day/hour selection to a 奇門 cast (which computes a real chart for a
 * chosen datetime). Never fabricate 干支 for dates you did not compute.
 */

import type { SkillDef } from './_types'

export const zeRiSkill: SkillDef = {
  id: 'ze_ri',
  name_zh: '擇日',
  name_en: 'Auspicious date selection',
  description_zh: '為某件事（嫁娶／開市／動土／簽約／搬遷／出行等）挑選良辰吉日。以主事人的八字喜用神為核心，配合事項性質與沖煞避忌，給出有利的月份／時段與避開的日子；需要精準到日／時時，以奇門起盤定奪。',
  description_en: "Select an auspicious date for an event (wedding, opening, ground-breaking, signing, moving, travel). Anchored to the actor's BaZi 喜用神 plus the act's nature and clash-avoidance; yields favourable windows and dates to avoid. For day/hour precision, casts 奇門 for the candidate datetime.",
  prerequisites: {
    self: ['bazi'],
    minTotal: 1,
    summary_zh: '需要主事人的八字命盤（喜用神、生年支）。缺則先引導排八字。精準擇時可加起一局奇門。',
    summary_en: "Requires the actor's BaZi (for 喜用神 and birth-year branch). If missing, guide them to cast it first. Precise hour selection may add a 奇門 cast.",
  },
  recipe: `
**Recipe: 擇日 — auspicious date selection**

## Phase A — Pin down the act and the 主事人
Ask in ONE bubble if unclear:
1. **What act** — 嫁娶 / 開市開業 / 動土入宅 / 簽約 / 出行 / 求醫 / 祈福 etc. Each has its own 宜忌.
2. **Whose date** (主事人) — usually the user; for 嫁娶 note both parties (the 沖避 keys on each person's 生肖).
3. **Target window** — a month range or season ("明年上半年", "三個月內").

## Phase B — Get the destiny anchor
- \`list_readings({type:'bazi', targetType:'self'})\` (and the partner's via family if 嫁娶) → \`get_reading\`.
- If missing → soft nudge + \`prefill_divination_form({type:'bazi', target:{kind:'self'|'family'...}})\`, then stop.
- Extract: 日主強弱, **喜用神 / 忌神**, 生年地支 (生肖).

## Phase C — Build the recommendation (classical 擇日 logic)
1. **不沖主事人 (hard rule)** — exclude any 月/日 whose 地支 六沖 the person's 生肖 (子午, 丑未, 寅申, 卯酉, 辰戌, 巳亥) or 沖太歲. For 嫁娶, also avoid each party's 沖. This is computable from 生肖 — state it.
2. **喜用神當令** — favour months whose 月令五行 reinforces 喜用神, avoid 忌神當令的月:
   - 春(寅卯月)木旺 · 夏(巳午月)火旺 · 秋(申酉月)金旺 · 冬(亥子月)水旺 · 四季月(辰戌丑未)土旺.
3. **Act-specific avoids you CAN name** — 嫁娶避三娘煞(初三/初七/十三/十八/廿二/廿七)、楊公十三忌、無祿日; 開市宜逢 開/滿/成日; 動土避歲破方. Mention as caveats, do not over-claim.
4. **Day/hour precision** — you cannot reliably compute the 干支 of a specific future date. Do NOT fabricate it. To pin an exact day+hour, offer to **cast 奇門遁甲** for the candidate datetime (\`prefill_divination_form({type:'qimen'})\`) and read 值符/值使/格局 for that moment — or advise consulting a 通書 for 干支-precise 擇日.

## Output
- A favourable **window** (months/season) with the 喜用神 reason, and the **dates/branches to avoid** (沖生肖 + act-specific) — each grounded.
- One line on how to get day/hour precision (奇門 cast).
- 2-4 bubbles. Confident on the framework; honest about 干支 precision. Never invent specific 吉日 干支.
`.trim(),
  triggers: [
    '擇日', '择日', '選日子', '选日子', '看日子', '挑日子', '黃道吉日', '黄道吉日', '良辰吉日',
    '哪天適合', '哪天好', '幾月適合', '几月适合', '結婚吉日', '结婚吉日', '開業吉日', '开业吉日',
    '搬家吉日', '動土', '动土', 'auspicious date', 'pick a date', 'good day for', 'choose a date', 'wedding date',
  ],
}
