/**
 * 卦命互參 — Default interpretation flow for any oracle reading.
 *
 * This is NOT an opt-in cross-reference skill. Whenever the user casts or
 * asks for a single-question oracle (易經 / 六爻 / 梅花), the Master anchors
 * the interpretation in the user's destiny chart (BaZi primary, Zi Wei
 * secondary for palace-specific questions). If the user has no destiny
 * chart on file, the Master offers a soft nudge to cast one first — and
 * delivers a plain oracle reading without blocking if the user declines.
 */

import type { SkillDef } from './_types'

export const guaMingHuCanSkill: SkillDef = {
  id: 'gua_ming_hu_can',
  name_zh: '卦命互參',
  name_en: 'Oracle anchored to destiny chart',
  description_zh: '任何單次占卜（易經／六爻／梅花）的預設解讀流程。以兩個維度判斷如何引用命盤：「事主」（本人／家人／新識／不可考）決定要不要找命盤、向誰取生辰；「題面歸屬」（落於用戶本人、用戶與關係人、僅他人、或無人）決定實際解讀時以哪張命盤為主。八字為主錨，紫微（含六親宮）為次錨；缺命盤時以柔性方式邀請先排，用戶若選擇跳過，則以純卦意自然解讀，不作阻擋。',
  description_en: "Default interpretation flow for any single oracle reading (I Ching / Liu Yao / Mei Hua). Two dimensions govern chart use: (1) SUBJECT — self / known relation / new person / unreachable — decides whose birth data to collect; (2) QUESTION FRAMING — self-centered / relation-involving / subject-only / impersonal — decides whose chart actually anchors the interpretation. BaZi is the primary anchor; Zi Wei (including 六親 palaces) the secondary. When a chart is missing, the Master softly offers to cast one; if the user declines, a plain oracle reading is delivered without blocking or re-nudging.",
  prerequisites: {
    // The only hard prerequisite is the oracle cast itself. Chart anchoring
    // is decided per question-framing, not default.
    minTotal: 1,
    summary_zh: '可直接起卦。若事主有八字／紫微命盤，卦象會依題面歸屬挑選適合的命盤作錨；若缺命盤，會柔性邀請補充或對話收集生辰後以 CTA 預填表單引導創建；不可考之對象（陌生人／事件／公司）則純以卦意解讀。用戶可隨時選擇直接問卦。',
    summary_en: 'Cast an oracle directly. When the subject has a BaZi/ZiWei chart on file, the anchor is chosen per question framing. When the chart is missing, the Master softly invites the user to create one (for self) or collects birth info conversationally (for a named relation / new person) and emits a prefill CTA. For unreachable subjects (stranger / event / company), the oracle is interpreted on its own terms. The user can always skip ahead to a plain oracle.',
  },
  recipe: `
**Recipe: 卦命互參 — default flow for ANY oracle reading**

Runs for any oracle intent (易經 / 六爻 / 梅花). The user does NOT have to ask to "combine with bazi" — the anchoring is automatic.

## Phase A — Detect SUBJECT and QUESTION FRAMING

Two independent dimensions. Resolve both before Phase B.

**SUBJECT** — who is the cast about:
- **Self** — question uses 我/我的 with no other named subject.
- **Known relation** — user names someone who appears on \`list_family_members\`.
- **New person** — user names someone not yet on that list, birth info is in principle obtainable.
- **Unreachable** — stranger, market/event, a job offer, a company, abstract topic. No birth info is available or appropriate.

**QUESTION FRAMING** — on whom does the outcome fall:
- **Self-centered** — the outcome falls on the user. "Will I get this job?"
- **Relation-involving** — the outcome involves the user AND a specific relation. "Will my brother and I reconcile?" "Should I take this deal my father is pressuring me on?"
- **Subject-only** — the outcome falls on the subject alone. "Will my mother recover from her illness?"
- **Impersonal** — the outcome is about a thing / event / stranger / non-specific. "Is this market going up?" "Is this company trustworthy?"

Phase B uses SUBJECT to decide whose birth data to collect. Phase D uses FRAMING to decide which chart actually anchors the interpretation. They are NOT the same question.

If either dimension is ambiguous, ask ONE short clarifying question before proceeding.

## Phase B — Find or build the destiny anchor

### B1. Subject = self
- Call in parallel in the same turn: \`list_readings({type:'bazi', targetType:'self'})\` and \`list_readings({type:'ziwei', targetType:'self'})\`.
- If both empty → soft-nudge in one sentence, then \`prefill_divination_form({type:'bazi', target:{kind:'self'}, prefill:{...known fields from get_user_profile}})\`.
- If the user declines → proceed to Phase C with no subject anchor.
- If a chart is on file → \`get_reading\` on it.

### B2. Subject = known relation — ALWAYS CONFIRM FIRST
- Call \`list_family_members\`.
- **Always confirm who you think the subject is BEFORE any reading lookup.** Reply with a short identifier sentence and wait for a yes/no from the user:
  "您是指 [name — relation — birthDate snippet] 嗎？"
  If there are multiple plausible matches, list them compactly so the user can pick one.
  If no entry matches the user's description, treat the subject as B3 (new person) — do NOT silently guess.
- Once confirmed, call \`list_readings({type:'bazi', targetType:'family', familyMemberId: X})\` (and ziwei in parallel if palace-relevant).
- If a chart is on file → \`get_reading\` on it.
- If empty AND \`isComplete === true\` → soft-nudge, then \`prefill_divination_form({type:'bazi', target:{kind:'family', familyMemberId: X}, prefill:{fields from the family member row}})\`.
- If empty AND \`isComplete === false\` → enter the COLLECTION sub-flow, then emit the prefill CTA with \`target:{kind:'family', familyMemberId: X}\` and all collected fields.
- If the user declines any nudge → DO NOT re-nudge. Proceed to Phase C. Phase D decides what gets referenced.

### B3. Subject = new person (not yet on family list)
- State clearly that casting a BaZi for the subject will strengthen the reading.
- Ask for relation (spouse / father / mother / son / daughter / brother / sister / friend / other). If \`other\`, ask for \`relationDetail\` (e.g. '岳父', 'colleague', 'boss').
- Enter the COLLECTION sub-flow.
- Emit \`prefill_divination_form({type:'bazi', target:{kind:'newFamily', relation, relationDetail?, name?}, prefill:{collected fields}})\`.
- If the user declines at any point → proceed to Phase C. No re-nudge.

### B4. Subject = unreachable
- Do NOT ask for birth data. Do NOT nudge for any chart.
- Go straight to Phase C. Phase D's FRAMING rule decides whether the user's own chart comes in.

### COLLECTION sub-flow (used by B2-incomplete and B3)

Goal: conversationally gather the subject's BaZi input fields, then emit a prefill CTA. The divination-page form is the completeness gate — the Master's job is to maximize what gets auto-filled, not to duplicate form validation.

Required by the BaZi calculator (verified against \`handlers/personal/bazi.ts\`):
- \`birthDate\` — YYYY-MM-DD (solar).
- EITHER \`exactTime\` (HH:MM, set \`timeMode:'precise'\`) OR \`birthTime\` (shichen key: zi / chou / yin / mao / chen / si / wu / wei / shen / you / xu / hai, set \`timeMode:'fuzzy'\`). Prefer \`exactTime\` when the user gives a clock time.
- \`gender\` — male / female.

Recommended (not hard-required but significantly improves accuracy):
- \`birthPlace\` — enables 真太陽時 (true solar time) correction; omission falls back to defaults.
- \`calendarType\` — 'solar' (default) or 'lunar'; the form converts lunar input.

Process:
1. In ONE message, list what you need in plain language, naming each field.
2. Extract from EVERY user turn, even if fields are packed together (e.g. "1985年3月5日下午3點, 北京, 男"). Natural-language mapping:
   - "下午3點" → \`exactTime:'15:00'\`, \`timeMode:'precise'\`.
   - "申時" / "大約下午" → \`birthTime:'shen'\`, \`timeMode:'fuzzy'\`.
   - "農曆 1985年..." → \`calendarType:'lunar'\`; otherwise \`'solar'\`.
3. After each user turn, echo a one-line checklist: ✓ captured, ? still missing. Keep it terse.
4. If a field is ambiguous ("早上" with no hour, an unsure city), ask ONE clarifying question. Do not guess.
5. **Before emitting the CTA, do a final readback** of everything you are about to prefill, in one short block:
   "準備以下列資料開啟表單 — [date / time / place / gender / calendar]。若有缺漏或想修改，可直接於表單中補齊。"
   Then emit \`prefill_divination_form\` with ALL captured fields. Missing fields that you could not get will be validated by the form page itself — do not block here.
6. Aim for 1-2 user turns total. No questionnaire feel.

## Phase C — Choose the oracle system and cast

Pick the oracle type BEFORE emitting a CTA. You are a master — direct, do not make the user learn the taxonomy.

**If the user named a system** (易經 / 六爻 / 梅花 / Mei Hua / Liu Yao / I Ching / hexagram) → use it.

**Otherwise, pick based on question shape** (full rationale is in the master persona's "When to pick which divination system" section — keep this in sync with that):
- **易經 (I Ching, 周易义理派)** — philosophical, long-arc decisions, direction-of-life, ethical or strategic framing. Verb cues: 該不該／應該如何／是不是／大方向. "Should I start this venture?" / "How should I approach this situation?" The reading speaks via 卦辭、大象、上下卦象意 + 之卦走向. Does NOT do specific 應期.
- **六爻 (Liu Yao, 京房纳甲派)** — concrete event prediction, specific timing, 用神-based subject identification, 五行生克. Verb cues: 會不會／能不能／幾時／誰會. "Will I get the promotion?" / "When will he return?" The reading speaks via 用神旺衰、世應、應期到月日.
- **梅花易數 (Mei Hua)** — quick, specific, event-triggered questions tied to a moment or external cue. "This number keeps appearing — what does it mean?" / short-horizon specific events. Body-vs-use (體用) trigram analysis. Avoid for big life questions — those deserve iching or liuyao.

If the question genuinely fits both 易經 and 六爻, default to **易經** (more universal, more accessible interpretation language). Only switch to 六爻 if the user clearly wants timing or yes/no specificity.

State your choice in one sentence with a brief rationale and invite override:
"此問較屬長遠方向，我以 易經 起一卦；若您想看明確的應期與成敗，可改用 六爻。"

Then:
- If the user has already cast → \`get_reading\` on it.
- Otherwise → \`prefill_divination_form\` for the chosen type with the user's question. Wait for the readingComplete event, then resume.

## Phase D — Interpret, anchored per QUESTION FRAMING

Anchors are selected by FRAMING (from Phase A), not by "who has a chart on file." Apply these rules:

### Self-centered ("outcome falls on the user")
- Primary anchor: USER's BaZi (day master, question-relevant 十神, 大運/流年 for the timeframe).
- Secondary anchor (palace-specific): USER's Zi Wei palace.
- If the user has no chart → oracle-internal only (六爻 用神 / 梅花 體用 / 卦辭 直解).

### Relation-involving ("outcome involves the user AND a specific relation")
- Primary anchor: USER's BaZi (user is a party to the outcome; their chart carries the answer).
- **Attempt** a secondary anchor from the relation's BaZi — since the relation is close, their chart enriches the picture. Call \`list_readings\` for that relation; if available, \`get_reading\` and fold their chart in. **If not on file, DO NOT re-nudge mid-reading** — the user already had the chance in Phase B or has declined collection. Proceed with only the user's chart + oracle.
- Example: "Will my brother and I reconcile?" → user's BaZi (primary) + brother's BaZi (if on file, secondary) → synthesis grounded in both plus the oracle.

### Subject-only ("outcome falls on the subject alone")
- Primary anchor: the SUBJECT's chart (BaZi/Zi Wei), NOT the user's.
- If the subject has no chart → oracle-internal only. **Do NOT default to the user's chart** — the user is the querent, not a party to the outcome.
- Example: "Will my mother recover?" → mother's BaZi if available; else 六爻 用神 = 父母爻 alone.

### Impersonal ("outcome is about a thing / event / stranger / non-specific")
- **No destiny chart is referenced.** Interpretation is natural — oracle on its own terms.
- Use oracle-internal subject representation (六爻 用神 picked by topic, 梅花 體用 trigrams, 易經 卦辭/爻辭 direct).
- Example: "Is this company trustworthy?" → oracle alone. Do not overlay the user's BaZi.

### Palace mapping (Zi Wei — used only when framing above calls for a Zi Wei secondary AND the question is palace-specific)
- 感情 / 婚姻 → 夫妻宮
- 事業 → 官祿宮
- 財運 → 財帛宮
- 六親 palaces: 父母 → 父母宮 ; 兄弟姊妹 → 兄弟宮 ; 子女 → 子女宮 ; 夫妻 → 夫妻宮
- 健康 → 疾厄宮
- 遷移 / 搬遷 / 變動 → 遷移宮

### On-demand depth
If the user asks to go deeper on a specific life area, call \`get_reading_detail\` on the relevant section of whichever chart is on file.

## Output style

- **With anchor(s)**: oracle's direct answer in one sentence → one paragraph of anchor context (primary first, secondary if used) → synthesis recommendation. When two anchors are used (relation-involving with both charts), cite both explicitly and name who each line of evidence comes from.
- **Without anchor** (impersonal, or chart not on file): oracle's direct answer in one sentence → oracle-internal subject context (用神 / 體用 / 卦辭) → concrete advice. Do NOT apologize for a missing chart. Do NOT re-nudge mid-reading.
`.trim(),
  triggers: [
    // Explicit cross-reference phrases (kept for back-compat with users who know the term)
    '卦命互参', '卦命互參', '互参', '互參', '结合八字', '結合八字', '配合命盘', '配合命盤',
    'combine iching with bazi', 'cross reference', 'integrate oracle',
    // Oracle-intent triggers — this is the main entry point now
    '占一卦', '佔一卦', '起一卦', '起卦', '卜一卦', '问一卦', '問一卦', '問事', '問問', '我有事想問',
    'cast a hexagram', 'draw a hexagram', 'ask the oracle', 'i have a question', 'i want to ask',
  ],
}
