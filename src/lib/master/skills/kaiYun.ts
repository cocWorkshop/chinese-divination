/**
 * 開運調理 — fortune fine-tuning & mitigation (命運微調 / 趨吉避凶 / 化煞).
 *
 * Translates the BaZi 喜用神 / 忌神 + 神煞 into concrete, grounded
 * adjustments (方位 / 顏色 / 行業 / 數字 / 時機 / 人事) and softens the
 * chart's hard patterns. You adjust how the 命 is LIVED — never claim to
 * rewrite fate, never promise outcomes.
 */

import type { SkillDef } from './_types'

export const kaiYunSkill: SkillDef = {
  id: 'kai_yun',
  name_zh: '開運調理',
  name_en: 'Fortune fine-tuning & mitigation',
  description_zh: '依八字喜用神／忌神給出可落地的開運調理：有利的方位、顏色、行業方向、數字、行動時機、貴人人事；並針對命中忌神過旺或凶煞（羊刃／孤辰寡宿／劫煞等）給出趨吉避凶與化解之道。調的是行運的方式，非更改命格。涵蓋命運微調／趨吉避凶／化煞。',
  description_en: "Concrete fortune-tuning from the BaZi 喜用神/忌神: favourable direction, colour, industry, numbers, timing, and helpful people; plus mitigation (趨吉避凶/化煞) for an over-strong 忌神 or hard 神煞 (羊刃, 孤辰寡宿, 劫煞…). You adjust how a fate is LIVED, not the chart itself. Covers 命運微調 / 趨吉避凶 / 化煞.",
  prerequisites: {
    self: ['bazi'],
    minTotal: 1,
    summary_zh: '需要本人（或指定家人）的八字命盤，以定喜用神／忌神／神煞。缺則先引導排八字。',
    summary_en: "Requires the subject's BaZi (for 喜用神/忌神/神煞). If missing, guide them to cast it first.",
  },
  recipe: `
**Recipe: 開運調理 — fine-tune & mitigate**

## Phase A — Read the chart's levers
- \`get_reading\` on the subject's bazi (self, or a confirmed family member). If missing → \`prefill_divination_form\`, stop.
- Extract: 日主強弱、**喜用神 / 忌神**、格局、關鍵神煞 (羊刃／孤辰寡宿／劫煞／驛馬／桃花…)、當前大運與流年。Use \`get_reading_detail\` only if the header lacks 喜用神/神煞.

## Phase B — Translate 喜用神 → concrete adjustments (the 五行 map)
Pick the user's actual 喜用神 and map ONLY those (don't dump all five):
- **方位**：木→東 · 火→南 · 土→中宮/西南/東北 · 金→西 · 水→北.
- **顏色**：木→青綠 · 火→紅紫 · 土→黃棕 · 金→白金銀 · 水→黑藍.
- **行業／職業傾向**：木→文教木材 · 火→能源餐飲文化 · 土→地產農牧 · 金→金融機械 · 水→流通貿易資訊.
- **數字**：水1,6 · 火2,7 · 木3,8 · 金4,9 · 土5,0.
- **時機**：喜用神當令的流年/大運 → 主動進取；忌神當令之年 → 守成、不擴張、不冒進.
- **貴人人事**：與喜用神同氣／能生扶日主之六親方位的人。

## Phase C — 趨吉避凶 / 化煞 (the hard patterns)
For忌神過旺或凶煞，name the concrete risk AND the 化解, each tied to a chart element:
- **忌神過旺** → 五行通關：以洩／化之神疏導（如忌火旺，喜土洩、忌再添木火）；對應到行為（避開忌神方位/行業/時段）。
- **羊刃／劫財重** → 衝動破耗、血光之憂 → 收斂鋒芒、避高風險投機、忌神年尤慎。
- **孤辰寡宿／比劫奪財** → 關係疏離／合夥損財 → 經營深度關係、合夥謹慎、白紙黑字。
- **驛馬動／桃花重** → 奔波／情緣紛擾 → 借動制動、守心守界。
Ground EVERY suggestion in the specific 干支/神煞 — no generic "多行善" filler.

## Output
- 3-5 **prioritized**, concrete adjustments, each citing the chart element it comes from.
- Frame as leaning the odds, NOT changing fate; never promise outcomes; preserve agency.
- End with the single highest-leverage move. 2-4 bubbles.
`.trim(),
  triggers: [
    '開運', '开运', '改運', '改运', '調理', '调理', '趨吉避凶', '趋吉避凶', '化煞', '補運', '补运',
    '怎麼補救', '怎么补救', '如何改善', '怎麼改善', '開運方法', '旺運', '催運', '幸運色', '幸运色',
    '幸運方位', '幸运方位', '適合的行業', '适合的行业', 'lucky color', 'lucky direction',
    'how to improve luck', 'remedy', 'what should i do about', 'boost my fortune',
  ],
}
