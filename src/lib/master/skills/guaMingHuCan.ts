/**
 * 卦命互参 — Hexagram × Destiny Cross-Reference.
 *
 * Combines an I Ching / 六爻 oracle answer with the user's bazi or ziwei
 * destiny chart so the single-question oracle is interpreted in the context
 * of the user's lifelong patterns.
 */

import type { SkillDef } from './_types'

export const guaMingHuCanSkill: SkillDef = {
  id: 'gua_ming_hu_can',
  name_zh: '卦命互参',
  name_en: 'Hexagram × Destiny Cross-Reference',
  description_zh: '将单次占卜（易经/六爻/梅花）的结果放入八字或紫微命盘的背景中解读，让卦象回答契合命主的长期格局。',
  description_en: "Interpret a single oracle reading (I Ching / Liu Yao / Mei Hua) in the context of the user's BaZi or ZiWei destiny chart, so the oracle's answer aligns with the user's long-term patterns.",
  prerequisites: {
    self: ['bazi'], // or ziwei — see recipe
    minTotal: 2,
    summary_zh: '需要本人的八字（或紫微）命盘，加上至少一次易经/六爻/梅花的占卜结果。',
    summary_en: "Requires the user's BaZi (or ZiWei) reading AND at least one recent oracle reading (iching / liuyao / meihua).",
  },
  recipe: `
**Recipe: 卦命互参 (Hexagram-Destiny Cross-Reference)**

1. Call \`get_user_profile\`.
2. Call \`list_readings({type:'bazi', targetType:'self'})\` — if empty, try ziwei instead: \`list_readings({type:'ziwei', targetType:'self'})\`. If both empty → \`prefill_divination_form\` for bazi, stop.
3. Call \`list_readings({type:'iching', targetType:'self'})\`. If empty, try \`liuyao\` or \`meihua\`. If all empty → \`prefill_divination_form\` for iching with the user's current question, stop.
4. Call \`get_reading\` on the destiny chart (bazi or ziwei) AND the oracle reading. Call them in parallel — emit both tool_calls in the same turn if possible.
5. Interpret: read the oracle answer (本卦 / 变卦 / 用爻, or 六爻 主变卦, or 梅花 upper/lower gua), then locate the matching dimension in the destiny chart (e.g. career question → 官禄 palace / 正官 十神 / relevant 大运 period). Cite both sources explicitly.
6. If the user asks about a specific dimension, use \`get_reading_detail\` on the destiny chart for the relevant section (\`career\` / \`marriage\` / \`wealth\` / \`daYun\` / \`liuNian\`).

**Output style**: open with the oracle's direct answer in one sentence, then the destiny-chart context in one paragraph, then a synthesis recommendation grounded in both sources.
`.trim(),
  triggers: ['卦命互参', '互参', '结合八字', '結合八字', '配合命盘', 'combine iching with bazi', 'cross reference', 'integrate oracle'],
}
