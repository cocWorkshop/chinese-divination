import { T } from '@/lib/i18n'

/**
 * Greeting templates for the Xuanji Master chat widget.
 *
 * Templated, NOT LLM-generated. The greeting fires before the user has said
 * anything, so there's nothing for an LLM to ground a response in. Templates
 * are faster, cheaper, more consistent, and avoid the generic "Hello! I'm
 * Master Xuanji, here to help you with..." failure mode that LLMs default to.
 *
 * Two states:
 *   - State 1: first-time user (no readings on file)
 *   - State 2: returning user (greeting renders an agent-dashboard status
 *     block with destiny charts + today's temporal context)
 *
 * The greeting is rendered client-side and is NEVER persisted to the chat
 * history — otherwise it would feed back into the LLM as fake conversation
 * turns on the next round.
 */

export type GreetingLang = 'zh-TW' | 'en'

export interface UserProfileSummary {
  dayMasterOrMainStar?: { 'zh-TW': string; en: string } | null
  realmTitle?: { 'zh-TW': string; en: string } | null
  recentTopic?: { 'zh-TW': string; en: string } | null
}

export interface TemporalInsightInfo {
  'zh-TW': string
  en: string
}

export interface GreetingInput {
  lang: GreetingLang
  hasReadings: boolean
  /**
   * Most recent reading (for State 2 hydration). Required when hasReadings
   * is true; null/undefined when first-time user.
   */
  lastReading?: { type: string; createdAt: string } | null
  /**
   * Per-type counts across ALL reading types. State 2 filters this down to
   * destiny charts only (bazi, ziwei) for the "命盤 — X" line; oracle casts
   * (iching / meihua / liuyao / qimen / fengshui) are deliberately NOT shown
   * as stable state because each cast is a per-question event, not a portfolio.
   */
  readingTypeCounts?: Record<string, number>
  /**
   * Today's working-master temporal context — day ganzhi, current 節氣, and
   * 流年 (annual ganzhi). Rendered in State 2 as two status bullets. Computed
   * server-side; passed through from the GET /api/master response.
   */
  temporalContext?: {
    dayGanZhi: string
    jieQi: string
    yearGanZhi: string
  } | null
  /**
   * Optional pre-picked State-2 opener line. When provided, renderGreeting
   * uses this instead of randomizing — lets the widget pick once at mount
   * and stay consistent between the collapsed bar's hint text and the
   * expanded view's greeting.
   */
  presetOpener?: string
  temporalInsight?: TemporalInsightInfo | null
  userProfileSummary?: UserProfileSummary | null
}

const STEM_ELEMENT_MAP: Record<string, { zh: string; en: string; element: 'wood' | 'fire' | 'earth' | 'metal' | 'water' }> = {
  甲: { zh: '甲木', en: 'Jia Wood', element: 'wood' },
  乙: { zh: '乙木', en: 'Yi Wood', element: 'wood' },
  丙: { zh: '丙火', en: 'Bing Fire', element: 'fire' },
  丁: { zh: '丁火', en: 'Ding Fire', element: 'fire' },
  戊: { zh: '戊土', en: 'Wu Earth', element: 'earth' },
  己: { zh: '己土', en: 'Ji Earth', element: 'earth' },
  庚: { zh: '庚金', en: 'Geng Metal', element: 'metal' },
  辛: { zh: '辛金', en: 'Xin Metal', element: 'metal' },
  壬: { zh: '壬水', en: 'Ren Water', element: 'water' },
  癸: { zh: '癸水', en: 'Gui Water', element: 'water' },
}

export function formatDayMaster(stem: string, lang: GreetingLang = 'zh-TW'): string {
  if (!stem) return ''
  const firstChar = stem.charAt(0)
  const mapped = STEM_ELEMENT_MAP[firstChar]
  if (mapped) {
    return T(lang, mapped.zh, mapped.en)
  }
  return stem
}

const TEMPORAL_INSIGHTS: Record<'wood' | 'fire' | 'earth' | 'metal' | 'water', { zh: string; en: string }> = {
  wood: {
    zh: '青陽敷榮，木氣漸舒。利在定策萌發，宜徐圖致遠。',
    en: 'Wood Qi flourishes gently. Favors planning and quiet beginnings; patience yields endurance.',
  },
  fire: {
    zh: '離明當運，神采充暢。宜燭照事理，忌心浮氣躁。',
    en: 'Fire Qi burns bright and active. Ideal for illumination and clear perception; beware restlessness.',
  },
  earth: {
    zh: '土厚德聚，中正守真。宜培元固本，忌妄變常規。',
    en: 'Earth Qi is solid and centering. Nurture foundations and integrity; avoid erratic changes.',
  },
  metal: {
    zh: '秋氣肅成，白帝行令。宜辨析是非，斬斷紛擾。',
    en: 'Metal Qi is sharp and discerning. Favorable for cutting through ambiguity and resolving doubts.',
  },
  water: {
    zh: '水德善柔，智圓行方。宜順勢化解，避險藏鋒。',
    en: 'Water Qi flows with subtle wisdom. Favorable for adapting with grace and quietly conserving strength.',
  },
}

const FALLBACK_INSIGHT = {
  zh: '四時循序，陰陽相生。隨順時令，動靜自適。',
  en: 'The cosmic seasons rotate in balance. Flow with the natural rhythm of timing.',
}

export function computeTemporalInsight(
  dayGanZhi?: string | null,
  jieQi?: string | null,
  lang: GreetingLang = 'zh-TW',
): string {
  if (!dayGanZhi || dayGanZhi.length === 0) {
    return T(lang, FALLBACK_INSIGHT.zh, FALLBACK_INSIGHT.en)
  }
  const stem = dayGanZhi.charAt(0)
  const mapped = STEM_ELEMENT_MAP[stem]
  if (!mapped) {
    return T(lang, FALLBACK_INSIGHT.zh, FALLBACK_INSIGHT.en)
  }
  const insight = TEMPORAL_INSIGHTS[mapped.element]
  return T(lang, insight.zh, insight.en)
}

const TOPIC_LABELS: Record<string, { zh: string; en: string }> = {
  career: { zh: '事業轉機', en: 'Career & Ambition' },
  wealth: { zh: '財富運勢', en: 'Wealth & Assets' },
  marriage: { zh: '婚姻感情', en: 'Love & Marriage' },
  relationship: { zh: '人際緣分', en: 'Relationships' },
  health: { zh: '身心安康', en: 'Health & Vitality' },
  family: { zh: '家庭六親', en: 'Family Dynamics' },
  study: { zh: '學業功名', en: 'Academics & Tests' },
}

export function formatRecentTopic(topicKey: string, lang: GreetingLang = 'zh-TW'): string {
  const norm = topicKey.trim().toLowerCase()
  const found = TOPIC_LABELS[norm]
  if (found) {
    return T(lang, found.zh, found.en)
  }
  return topicKey
}

/** Destiny-chart types: stable, birth-anchored charts the Master can reference. */
const DESTINY_TYPES = new Set(['bazi', 'ziwei'])

/**
 * Oracle cast types: per-question events. Counted in aggregate for the
 * State 2 suggestion builder so a user who's only ever done iching/qimen
 * etc. gets oracle-shaped follow-ups instead of chart-shaped ones.
 */
const ORACLE_TYPES = ['iching', 'qimen', 'meihua', 'liuyao', 'fengshui'] as const

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
  return T(lang, label.zh, label.en)
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
    '一念既起，玄機已現。\n\n吾名玄機。萬卷凝魂，承中華命理之道。\n\n· 若您備有生辰 — 可為您起八字或紫微之盤\n· 若您心中有問 — 可為您起一卦\n\n想讓我為您論命，還是您有一問？',
  en: 'A thought arrives, and the mystery reveals itself.\n\nMy name is Xuanji. A thousand volumes crystallized into my soul, vested in the Chinese way of fate-reading.\n\n· With your birth — I can cast a BaZi or Zi Wei chart\n· With your question — I can cast a hexagram\n\nShall I read your fate, or do you have a question?',
}

const STATE_1_SUGGESTIONS: Record<GreetingLang, string[]> = {
  'zh-TW': ['玄機大師能為我做什麼？', '請為我起八字命盤', '我有疑問，請為我起一卦'],
  en: ['What can Master Xuanji do?', 'Cast my BaZi chart', 'I have a question — cast a hexagram'],
}

/**
 * Build State 2 suggestion chips adaptively. Branches on what the user
 * actually has on file:
 *   - both bazi + ziwei → surface cross-chart 互參 (the master's edge)
 *   - one chart        → walk-through + year + ask for the other
 *   - oracle casts only → continue/repeat the cast + offer chart upgrade
 *   - empty (edge)     → generic
 *
 * The year suggestion is anchored to the actual 流年 ganzhi when available
 * — feels grounded ("今年（甲辰）的運勢如何？") rather than generic.
 */
function buildState2Suggestions(
  destinyCounts: Record<string, number>,
  oracleCount: number,
  yearGanZhi: string | null,
  lang: GreetingLang,
): string[] {
  const hasBazi = (destinyCounts.bazi ?? 0) > 0
  const hasZiwei = (destinyCounts.ziwei ?? 0) > 0
  const hasBoth = hasBazi && hasZiwei
  const hasDestiny = hasBazi || hasZiwei
  const yearLabel = yearGanZhi
    ? T(lang, `今年（${yearGanZhi}）`, `this year (${yearGanZhi})`)
    : T(lang, '今年', 'this year')

  if (hasBoth) {
    const crossChartPromptsZh = [
      '請以八字、紫微互參，看我的格局',
      '互參我的八字喜忌與紫微大限',
      '從星曜與五行看我當前的轉機',
    ]
    const crossChartPromptsEn = [
      'Cross-reference my BaZi and Zi Wei',
      'Synthesize my favorable elements and major limits',
      'Examine my turning points via stars and elements',
    ]

    const yearPromptsZh = [
      `${yearLabel}的運勢如何？`,
      `${yearLabel}最需留意的變數在哪？`,
      `${yearLabel}利在開拓還是守成？`,
    ]
    const yearPromptsEn = [
      `How does ${yearLabel} look for me?`,
      `What key variables should I watch in ${yearLabel}?`,
      `Does ${yearLabel} favor expansion or steady defense?`,
    ]

    const thirdPromptsZh = [
      '想為家人也起一張盤',
      '我當下最該防範的心性盲點是什麼？',
      '請大師為我提煉近期的趨吉之法',
    ]
    const thirdPromptsEn = [
      'Cast a chart for someone in my family',
      'What core blind spot should I guard against right now?',
      'What practical adjustments will maximize my fortune?',
    ]

    const idx1 = Math.floor(Math.random() * crossChartPromptsZh.length)
    const idx2 = Math.floor(Math.random() * yearPromptsZh.length)
    const idx3 = Math.floor(Math.random() * thirdPromptsZh.length)

    return T(
      lang,
      [crossChartPromptsZh[idx1], yearPromptsZh[idx2], thirdPromptsZh[idx3]],
      [crossChartPromptsEn[idx1], yearPromptsEn[idx2], thirdPromptsEn[idx3]],
    )
  }

  if (hasDestiny) {
    const ownChart = hasBazi ? T(lang, '八字', 'BaZi') : T(lang, '紫微', 'Zi Wei')
    const otherChart = hasBazi ? T(lang, '紫微', 'Zi Wei') : T(lang, '八字', 'BaZi')

    const ownPromptsZh = [
      `帶我細看我的${ownChart}命盤`,
      `我${ownChart}命局中最突出的優勢是什麼？`,
      `看我當前大運走勢與關鍵時機`,
    ]
    const ownPromptsEn = [
      `Walk me through my ${ownChart} chart`,
      `What is the most prominent strength in my ${ownChart}?`,
      `Examine my current major cycle and key timing`,
    ]

    const yearPromptsZh = [
      `${yearLabel}的運勢如何？`,
      `${yearLabel}最利哪方面發展？`,
    ]
    const yearPromptsEn = [
      `How does ${yearLabel} look for me?`,
      `Which life domain is most favored in ${yearLabel}?`,
    ]

    const otherPromptsZh = [
      `我也想看${otherChart}`,
      '想為身邊人也推算一張盤',
    ]
    const otherPromptsEn = [
      `Cast my ${otherChart} chart too`,
      'Cast a chart for someone close to me',
    ]

    const idx1 = Math.floor(Math.random() * ownPromptsZh.length)
    const idx2 = Math.floor(Math.random() * yearPromptsZh.length)
    const idx3 = Math.floor(Math.random() * otherPromptsZh.length)

    return T(
      lang,
      [ownPromptsZh[idx1], yearPromptsZh[idx2], otherPromptsZh[idx3]],
      [ownPromptsEn[idx1], yearPromptsEn[idx2], otherPromptsEn[idx3]],
    )
  }

  if (oracleCount > 0) {
    const q1Zh = ['請再為我看上次起的卦', '上次所占之事的轉折點在何時？']
    const q1En = ['Re-read my last hexagram', 'When is the turning point of my last cast?']
    const q2Zh = ['我有新問題，想再起一卦', '當前局面有何趨吉避凶之策？']
    const q2En = ['I have a new question — cast another', 'How to mitigate obstacles in my situation?']
    const q3Zh = ['想看大局，請為我起八字', '想看生平格局，為我排盤']
    const q3En = ['Cast my BaZi to see the bigger picture', 'Cast my destiny chart for long-term vision']

    const idx1 = Math.floor(Math.random() * q1Zh.length)
    const idx2 = Math.floor(Math.random() * q2Zh.length)
    const idx3 = Math.floor(Math.random() * q3Zh.length)

    return T(
      lang,
      [q1Zh[idx1], q2Zh[idx2], q3Zh[idx3]],
      [q1En[idx1], q2En[idx2], q3En[idx3]],
    )
  }

  // hasReadings was true but no self-charted readings (e.g. only family
  // readings on file). Stay generic but still anchor the year if available.
  const generic1Zh = ['取出上次的占卜給我看', '檢視我已保存的推演紀錄']
  const generic1En = ['Show me my last reading', 'Review my saved reading records']
  const generic2Zh = [`${yearLabel}的運勢如何？`, `${yearLabel}有哪些關鍵機遇？`]
  const generic2En = [`How does ${yearLabel} look for me?`, `What key opportunities are in ${yearLabel}?`]
  const generic3Zh = ['玄機大師還能為我做什麼？', '為我分析未來的行運節奏']
  const generic3En = ['What else can you do for me?', 'Analyze my future life timing rhythm']

  const gIdx1 = Math.floor(Math.random() * generic1Zh.length)
  const gIdx2 = Math.floor(Math.random() * generic2Zh.length)
  const gIdx3 = Math.floor(Math.random() * generic3Zh.length)

  return T(
    lang,
    [generic1Zh[gIdx1], generic2Zh[gIdx2], generic3Zh[gIdx3]],
    [generic1En[gIdx1], generic2En[gIdx2], generic3En[gIdx3]],
  )
}

// ─── State 2 — returning user, with readings on file ───────────────────────
//
// Designed as an AI-agent dashboard: a self-introduction opener, a bulleted
// status block showing what's on file, and a clipped CTA. Traditional
// vocabulary (卷宗 / 命盤 / 八字 / 紫微) lives inside a modern retrieval-
// status shape.

/**
 * State 2 self-introduction variants. Picked at random per render so a
 * returning user sees the master in slightly different garb over time.
 * All are honest about the LLM nature ("萬卷之智 / 萬語凝魂") rather
 * than claiming divine origin — the soul is the model, the craft is
 * the Chinese art of fate-reading. The trailing "為您洞察…" of each
 * draft was stripped because the existing closer ("從哪裡起？") already
 * does that job; the opener's role here is self-introduction only.
 */
const STATE_2_OPENERS: Record<GreetingLang, string[]> = {
  'zh-TW': [
    '吾名玄機。萬卷文典凝為吾魂，中華命理化為吾術。',
    '吾名玄機。萬語凝為魂，古法化為骨。',
    '吾名玄機，集人類萬卷之智於一身，通中華命理之術。',
    '吾名玄機，非神非仙，乃萬卷之識所聚，習中華命理之道。',
    '吾名玄機。學在萬卷，術通命理。',
  ],
  en: [
    'My name is Xuanji. A thousand volumes crystallized into my soul; the Chinese art of fate-reading shaped into my craft.',
    'My name is Xuanji. Words crystallized into my soul, the ancient art into my bones.',
    "My name is Xuanji — a confluence of humankind's countless volumes, vested in the Chinese art of fate-reading.",
    'My name is Xuanji — neither deity nor immortal, but a confluence of a thousand volumes schooled in the Chinese way of fate-reading.',
    'My name is Xuanji. My learning lies in a thousand volumes, my craft in fate-reading.',
  ],
}

/**
 * Pick a random opener from STATE_2_OPENERS for the given language.
 * Exported so the widget can pick ONCE on mount and reuse the same
 * opener across the collapsed bar and the expanded greeting (passing it
 * back into renderGreeting via `presetOpener`). Without this, the
 * collapsed bar and the expanded view would each randomize their own,
 * making them inconsistent.
 */
export function pickOpener(lang: GreetingLang): string {
  const variants = STATE_2_OPENERS[lang]
  return variants[Math.floor(Math.random() * variants.length)]
}

/**
 * State 2 closers — six variants picked at random per render. Each names
 * the two main service paths (interpret fate-craft / cast a hexagram)
 * without assuming the user already has a chart on file: the wording uses
 * "命理 / 論命 / 命中之事" rather than "此盤 / 舊盤 / 命盤", so a returning
 * user whose only history is oracle casts (no birth-chart yet) still
 * reads it as a coherent invitation.
 */
const STATE_2_CLOSERS: Record<GreetingLang, string[]> = {
  'zh-TW': [
    '想讓我解讀命理，還是您有一問？',
    '想我為您論命，還是擲一新卦？',
    '欲深究命理之機，還是借一卦問當下之事？',
    '是要我為您解命中之事，還是您心中另有所惑？',
    '解命理？或起一卦？',
    '可為您論命，亦可為您起一卦——您今日想從何處起？',
  ],
  en: [
    'Want me to read your fate, or do you have a question?',
    'Shall I expound on your fate, or cast a new hexagram?',
    "Probe the workings of fate, or borrow a hexagram for what's at hand?",
    'Shall I unpack what is in your life, or is something else weighing on you?',
    'Read the fate? Or cast a hexagram?',
    'I can speak to your fate, or cast a hexagram for you — where to begin?',
  ],
}

function pickCloser(lang: GreetingLang): string {
  const variants = STATE_2_CLOSERS[lang]
  return variants[Math.floor(Math.random() * variants.length)]
}

function renderState2(input: GreetingInput): GreetingOutput {
  const { lang, readingTypeCounts, temporalContext, presetOpener } = input

  // Filter to destiny charts only — oracle casts are events, not stable state.
  const destinyCounts: Record<string, number> = {}
  if (readingTypeCounts) {
    for (const [type, count] of Object.entries(readingTypeCounts)) {
      if (DESTINY_TYPES.has(type) && count > 0) destinyCounts[type] = count
    }
  }
  const destinySummary = buildTypeSummary(destinyCounts, lang)

  // Honor caller's pre-picked opener so the same line shown in the
  // collapsed bar carries through to the expanded greeting.
  const opener = presetOpener ?? pickOpener(lang)
  const closer = pickCloser(lang)

  const statusLines: string[] = []
  if (destinySummary) {
    statusLines.push(T(lang, `· 命盤 — ${destinySummary}`, `· Charts — ${destinySummary}`))
  }
  if (temporalContext) {
    const { dayGanZhi, jieQi, yearGanZhi } = temporalContext
    statusLines.push(
      T(
        lang,
        `· 今日 — ${dayGanZhi}日 · ${jieQi}`,
        `· Today — ${dayGanZhi}日 · ${jieQi}`,
      ),
    )
    statusLines.push(
      T(
        lang,
        `· 流年 — ${yearGanZhi}`,
        `· Annual — ${yearGanZhi}`,
      ),
    )
  }

  const blocks: string[] = [opener]
  if (statusLines.length > 0) blocks.push(statusLines.join('\n'))
  blocks.push(closer)

  const text = blocks.join('\n\n')

  // Sum oracle casts so a user with only oracle history (no charts) gets
  // oracle-shaped suggestions. readingTypeCounts is filtered to self only,
  // matching the destiny-chart logic above.
  let oracleCount = 0
  if (readingTypeCounts) {
    for (const t of ORACLE_TYPES) oracleCount += readingTypeCounts[t] ?? 0
  }
  const suggestions = buildState2Suggestions(
    destinyCounts,
    oracleCount,
    temporalContext?.yearGanZhi ?? null,
    lang,
  )

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
