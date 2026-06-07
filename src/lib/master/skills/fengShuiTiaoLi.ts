/**
 * 風水調理建議 — actionable feng-shui layout & remedies.
 *
 * MUST be grounded in an actual 風水 reading (坐向 + 玄空飛星 chart). Never
 * advise on layout without the flying-star chart in hand — read it off the
 * reading, then give per-position adjustments. No superstition-dump; every
 * suggestion ties to a star/position from the reading.
 */

import type { SkillDef } from './_types'

export const fengShuiTiaoLiSkill: SkillDef = {
  id: 'feng_shui_tiao_li',
  name_zh: '風水調理建議',
  name_en: 'Feng-shui layout & remedies',
  description_zh: '根據一份風水排盤（坐向＋玄空飛星）給出可落地的佈局與化煞建議：判旺山旺向／上山下水等格局，定財位丁位、衰死星位、文昌桃花位，逐方位給出宜動宜靜、用物化煞（五行通關），並處理尖角路沖橫梁等形煞。必須先有風水排盤才能調理。',
  description_en: "From a 風水 reading (sitting/facing + 玄空飛星 chart), give actionable layout & remedy advice: identify the formation (旺山旺向 / 上山下水…), the wealth & people stars, the decayed/killing positions, 文昌/桃花 spots; per-direction advice on activate-vs-quiet and 五行 remedies; and handle 形煞 (sharp corners, road-rush, beams). Requires the flying-star chart first.",
  prerequisites: {
    self: ['fengshui'],
    minTotal: 1,
    summary_zh: '必須先有一份風水排盤（含坐向與飛星）。缺則先引導排一盤風水（需朝向、建造年份、屋主資訊）再調理。',
    summary_en: 'Requires a 風水 reading (sitting/facing + flying-star chart). If missing, guide them to cast one first (needs facing direction, year built, occupant info), then advise.',
  },
  recipe: `
**Recipe: 風水調理建議 — layout & remedies**

## Phase A — Get the chart (no chart, no advice)
- \`list_readings({type:'fengshui', targetType:'self'})\` → \`get_reading\`. Pull 坐向、元運、**玄空飛星盤**（每宮的山星／向星／運星）、建造年份、屋主資訊.
- If none on file → soft nudge + \`prefill_divination_form({type:'fengshui'})\` (needs 朝向 / 建造年份 / 屋主簡介), then **stop**. Do NOT advise layout from imagination.

## Phase B — Read the 飛星 pattern
1. **格局**：判 旺山旺向 / 上山下水 / 雙星到向 / 雙星到坐 — sets whether the facing favours 財 or 丁.
2. **當運吉星**：向星當運（旺財）→ 該宮宜開門、宜動、宜見水/明亮；山星當運（旺丁/健康）→ 該宮宜靜、宜高、宜安床.
3. **衰死凶星**：失運的 **二黑(病符)、五黃(廉貞)** → 凶位，宜靜，忌動土忌火;三碧(是非)、七赤(破軍/盜) → 口舌破耗.
4. **吉用星**：四綠(文昌)→讀書工作位；一白(桃花/事業)→感情人緣；六白/八白/九紫(財丁喜)→催旺.
5. **流年紫白**疊加：年飛星入中，定流年的吉凶方（如今年五黃到某宮 → 該宮今年特別忌動）.

## Phase C — Per-position advice (8方/9宮)
For each relevant room/direction give CONCRETE moves tied to the star:
- **旺位**：床/辦公桌/爐灶/門 安此，保持明亮活動 → 聚財旺丁.
- **衰位**：宜靜、宜空；化煞用 **五行通關**：二黑五黃(土煞) → 以金洩之（銅鈴/金屬/六帝錢），忌紅色火物與動土；三七(金) → 以水化.
- **文昌位**：書桌/書架；**桃花位**：感情催化或收斂.
- **形煞**：尖角→擋/化（屏風、植物）；橫梁壓頂→避（移床移坐）；路沖/門沖→化（玄關、屏風）.

## Output
- Per-room / per-direction adjustments, **prioritized**, each citing the star/position from the reading (e.g.「向星八白到東南，宜在此設門或擺水聚財」).
- End with the **single top 化煞 priority** (usually the year's 五黃/二黑 position).
- Practical and reasoned — no charm-shopping list. 3-5 bubbles.
`.trim(),
  triggers: [
    '風水', '风水', '佈局', '布局', '擺設', '摆设', '飛星', '飞星', '化煞', '文昌位', '財位', '财位',
    '桃花位', '旺位', '房間佈置', '房间布置', '辦公室風水', '办公室风水', '床怎麼擺', '門口', '玄關',
    'feng shui', 'fengshui', 'layout', 'where to put', 'where should i place', 'office feng shui',
  ],
}
