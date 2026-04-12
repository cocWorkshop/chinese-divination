/**
 * 八字合盘 — BaZi compatibility reading between two people.
 */

import type { SkillDef } from './_types'

export const baziHepanSkill: SkillDef = {
  id: 'bazi_hepan',
  name_zh: '八字合盘',
  name_en: 'BaZi Compatibility',
  description_zh: '对比两个人的八字命盘，分析匹配度、互动关系、婚姻/合作前景。',
  description_en: "Compare two people's BaZi charts to analyze compatibility, interpersonal dynamics, and marriage/partnership prospects.",
  prerequisites: {
    self: ['bazi'],
    family: ['bazi'],
    minTotal: 2,
    summary_zh: '需要本人和对象两人的八字命盘（均已保存）。',
    summary_en: 'Requires saved BaZi readings for both the user and the other person.',
  },
  recipe: `
**Recipe: 八字合盘 (BaZi compatibility)**

1. Call \`get_user_profile\` to confirm the user's birth data is complete.
2. Call \`list_family_members\` to locate the target person. If they ask about a non-family relationship (e.g. business partner), look for the matching entry or \`relation === 'other'\` with \`relationDetail\`.
3. Call \`list_readings({type:'bazi', targetType:'self'})\`. If empty → call \`prefill_divination_form\` for the user's bazi and stop the recipe.
4. Call \`list_readings({type:'bazi', targetType:'family', familyMemberId: <id>})\`. If empty → call \`prefill_divination_form\` for the target person's bazi and stop the recipe.
5. Call \`get_reading\` on both readings (call them in parallel — emit two tool_calls in the same turn if possible).
6. Interpret the compatibility: compare day masters (日主 五行), pillar 冲/合/害/刑 cross-chart, 喜用神 alignment, 夫妻宫 (for marriage cases), and 大运 timing overlap. Cite evidence from both charts explicitly.
7. On-demand: if the user asks about a specific life area not covered, call \`get_reading_detail\` on one chart with the relevant section key.

**Output style**: one tight comparison, ending with 2-3 concrete suggestions or warnings grounded in the chart data.
`.trim(),
  triggers: ['合盘', '合八字', '配對', '配对', '匹配', '夫妻相性', 'compatibility', 'compare us', 'partner match'],
}
