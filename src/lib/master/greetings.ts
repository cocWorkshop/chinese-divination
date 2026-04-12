/**
 * Greeting templates for the Xuanji Master chat widget.
 *
 * Templated, NOT LLM-generated. The greeting fires before the user has said
 * anything, so there's nothing for an LLM to ground a response in. Templates
 * are faster, cheaper, more consistent, and avoid the "Hello! I'm Master
 * Xuanji, here to help you with..." failure mode that LLMs default to.
 *
 * Phase 0 implements two states:
 *   - State 1: first-time user (no readings, no chat history)
 *   - State 2: returning user (has readings, no portrait yet)
 *
 * State 3 (returning + active portrait) and State 4 (after "start new session"
 * button) are introduced in later phases when UserPortrait + new-session
 * endpoints exist.
 *
 * The greeting is rendered client-side. It is NOT persisted in
 * MasterSession.messages — that would feed it back to the LLM as fake
 * conversation history on the next turn, which is wrong.
 */

export type GreetingLang = 'zh-TW' | 'en'

export interface GreetingInput {
  lang: GreetingLang
  hasReadings: boolean
  /**
   * Most recent reading (for State 2 hydration). Required when hasReadings
   * is true; null/undefined when first-time user.
   */
  lastReading?: { type: string; createdAt: string } | null
  /**
   * Per-type counts for building the "你的命盘我手边有 八字、紫微" summary.
   * Optional — if omitted or empty, State 2 falls back to a generic phrase.
   */
  readingTypeCounts?: Record<string, number>
}

export interface GreetingOutput {
  /** The text to display, with newlines preserved. */
  text: string
  /** Optional follow-up prompt suggestions (clickable chips in the widget). */
  suggestions: string[]
  /** Which state was rendered, for telemetry / tests. */
  state: 1 | 2
}

const TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  bazi: { zh: '八字', en: 'BaZi' },
  ziwei: { zh: '紫微', en: 'Zi Wei' },
  iching: { zh: '易經', en: 'I Ching' },
  qimen: { zh: '奇門', en: 'Qi Men' },
  meihua: { zh: '梅花', en: 'Mei Hua' },
  fengshui: { zh: '風水', en: 'Feng Shui' },
  liuyao: { zh: '六爻', en: 'Liu Yao' },
}

function typeLabel(type: string, lang: GreetingLang): string {
  const label = TYPE_LABELS[type]
  if (!label) return type
  return lang === 'en' ? label.en : label.zh
}

function formatDate(iso: string, lang: GreetingLang): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (lang === 'en') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * Builds the "你的命盤我手邊有 — 八字、紫微都在" summary from the type-counts
 * object. Returns just the type list portion (not the full sentence). Returns
 * an empty string if no counts present.
 */
function buildTypeSummary(
  counts: Record<string, number> | undefined,
  lang: GreetingLang,
): string {
  if (!counts) return ''
  const types = Object.keys(counts).filter((t) => counts[t] > 0)
  if (types.length === 0) return ''

  // Pick the top 3 by count, in display order
  const ordered = types
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, 3)
    .map((t) => typeLabel(t, lang))

  if (lang === 'en') {
    if (ordered.length === 1) return ordered[0]
    if (ordered.length === 2) return `${ordered[0]} and ${ordered[1]}`
    return `${ordered.slice(0, -1).join(', ')}, and ${ordered[ordered.length - 1]}`
  }
  // zh-TW: 八字、紫微 / 八字、紫微、奇門
  return ordered.join('、')
}

// ─── State 1 — first-time user ─────────────────────────────────────────────

const STATE_1_TEXT: Record<GreetingLang, string> = {
  'zh-TW':
    '我是 玄機大師。\n\n你給我一個出生日期、時辰、地點，我替你排八字或紫微；給我一個具體的問題加上一個時刻，我替你起一卦。\n\n想從哪一個開始？',
  en: "I am Master Xuanji.\n\nGive me a birth date, time, and place — I'll cast your bazi or ziwei chart. Give me a question and a moment in time — I'll cast a hexagram.\n\nWhere would you like to begin?",
}

const STATE_1_SUGGESTIONS: Record<GreetingLang, string[]> = {
  'zh-TW': ['幫我排個八字', '我想看紫微命盤', '起一卦問問'],
  en: ['Cast my bazi', 'Show me my zi wei chart', 'Cast a hexagram'],
}

// ─── State 2 — returning user, no portrait ─────────────────────────────────

function renderState2(input: GreetingInput): GreetingOutput {
  const { lang, lastReading, readingTypeCounts } = input
  const typeSummary = buildTypeSummary(readingTypeCounts, lang)

  let text: string

  if (lang === 'en') {
    const datePhrase = lastReading
      ? ` Last reading was on ${formatDate(lastReading.createdAt, lang)} — your ${typeLabel(lastReading.type, lang)}.`
      : ''
    const summaryPhrase = typeSummary
      ? `Your charts are at hand — ${typeSummary} on file.`
      : 'Your charts are at hand.'
    text = `Welcome back.\n\n${summaryPhrase}${datePhrase}\n\nPick up where we left off, or take a new direction?`
  } else {
    const datePhrase = lastReading
      ? `最近一次是 ${formatDate(lastReading.createdAt, lang)} 的${typeLabel(lastReading.type, lang)}。`
      : ''
    const summaryPhrase = typeSummary
      ? `你的命盤我手邊有 — ${typeSummary}都在。`
      : '你的命盤我手邊有。'
    text = `又見面了。\n\n${summaryPhrase}${datePhrase}\n\n今天想接著哪一段問？還是要看新的方向？`
  }

  const suggestions = lang === 'en'
    ? ['How is my luck this year?', 'Continue last topic', 'Look at career timing']
    : ['今年運勢如何？', '接著上次的話題', '看看事業時機']

  return { text, suggestions, state: 2 }
}

// ─── Public entry point ────────────────────────────────────────────────────

/**
 * Pick the greeting state and render it. Pure function — no I/O, no
 * side effects. Used by the widget on mount when the message list is empty.
 */
export function renderGreeting(input: GreetingInput): GreetingOutput {
  if (!input.hasReadings) {
    return {
      text: STATE_1_TEXT[input.lang],
      suggestions: STATE_1_SUGGESTIONS[input.lang],
      state: 1,
    }
  }
  return renderState2(input)
}
