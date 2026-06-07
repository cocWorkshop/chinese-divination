/**
 * 應期推算 — calculate WHEN a matter resolves, from an oracle reading.
 *
 * 六爻 is the precise system: the cast already fixes 月建/日辰, so 應期 is
 * derivable from the chart itself (用神旺衰 + 動爻 + 沖合墓空) — no fabrication.
 * 易經 (義理派) does NOT give precise 應期; say so and offer 六爻.
 */

import type { SkillDef } from './_types'

export const yingQiSkill: SkillDef = {
  id: 'ying_qi',
  name_zh: '應期推算',
  name_en: 'Event timing from an oracle',
  description_zh: '推算一件事「何時應驗／何時發生」。以六爻為主：用神旺衰、動爻生克、逢值逢沖逢合、空亡墓庫，由卦的月建日辰推出應期月日。易經主方向不主應期；梅花以卦氣卦數推時序；奇門以值符值使落宮定時。',
  description_en: "Calculate WHEN a matter resolves. 六爻 is primary — 用神 strength, moving-line interactions, value/clash/combination days, void & tomb — read off the cast's 月建/日辰. 易經 gives direction not precise timing; 梅花 uses 卦氣/卦數; 奇門 uses 值符/值使 palace.",
  prerequisites: {
    minTotal: 1,
    summary_zh: '需要一個已起的占卦（六爻最準；易經／梅花／奇門亦可）。多為對既有卦象的追問——直接 get_reading 取該卦。若尚未起卦且問的是「何時／能不能」，先以六爻起一卦。',
    summary_en: 'Requires one cast oracle (六爻 most precise; 易經/梅花/奇門 also work). Usually a follow-up to an existing cast — get_reading on it. If nothing is cast yet and the question is "when / will it", cast a 六爻 first.',
  },
  recipe: `
**Recipe: 應期推算 — when does it resolve**

## Phase A — Get the cast
- If the user is following up on a reading already in this conversation or on file → \`get_reading\` on that oracle (its \`calculationData\` carries the cast 月建/日辰/卦象 — your raw material).
- If nothing is cast and the question is timing ("何時 / 幾時 / 能不能成") → this is a 六爻 question: \`prefill_divination_form({type:'liuyao'})\`, wait for completion, then resume.
- Identify the **用神** (the line representing what's asked): 求財→妻財, 功名/工作→官鬼, 父母/文書/房→父母, 子女/下屬→子孫, 自身→世爻, 對方→應爻.

## Phase B — Derive 應期 (六爻 method — all grounded in the cast)
Judge the 用神 against the cast's 月建 and 日辰, then apply:
1. **用神旺相、逢值/逢合** → 近應：應在用神**值日／值月**（其臨之干支到時）。
2. **用神休囚無氣** → 應在**生扶之月日**（逢其長生、帝旺，或元神發動之時）。
3. **用神入墓** → 應在**沖墓（開墓）之日**；**用神空亡** → 應在**出空／填實之日**。
4. **動爻化進神** → 事漸成、應稍遲；**化退神** → 漸退、難成。
5. **旺極者看墓絕之時，衰極者看生旺之時**（物極必反）。
6. Convert to a **window** the user can act on (本月內 / 約X個月 / 某季節 / 待某月)，expressed plainly. State the 爻 and the rule it came from — that is your evidence.

## Phase C — Other systems
- **易經**：義理派不主精準應期。給**階段時序**（下卦→上卦之進程、變爻之轉折）並坦白「易經重方向，要準確應期請改六爻」。
- **梅花**：以體用卦氣旺衰 + 先後天卦數對應時序（卦數應月日）+ 三要十應外應。
- **奇門**：以值符／值使落宮、天乙所臨、時干推應時。

## Output
- ONE time **window**, not false precision — "約在X月" / "本月卯酉日前後" — with the 用神 + 旺衰/沖合 reason cited from the cast.
- One line of confidence (旺相明確 vs 休囚待時 → less certain).
- If the system can't give 應期 (易經) → say so and offer 六爻. 2-3 bubbles.
`.trim(),
  triggers: [
    '應期', '应期', '何時', '何时', '幾時', '几时', '什麼時候', '什么时候', '多久', '多長時間', '多长时间',
    '幾月', '几月', '能不能成', '會不會', '会不会', '什麼時候應驗', '何時發生', '何時實現',
    'when will', 'how long until', 'when does', 'timing of', 'when will it happen',
  ],
}
