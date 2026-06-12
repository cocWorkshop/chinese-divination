/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error taobi has no type definitions
import TaobiModule from 'taobi'
import { Solar } from 'lunar-typescript'

const { TheArtOfBecomingInvisible } = TaobiModule

const DOOR_ARR = ['休门', '死门', '伤门', '杜门', '', '开门', '惊门', '生门', '景门']

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// Palace grid positions: canvas[row][col] maps to Luo Shu:
// [0][0]=巽4  [0][1]=离9  [0][2]=坤2
// [1][0]=震3  [1][1]=中5  [1][2]=兑7
// [2][0]=艮8  [2][1]=坎1  [2][2]=乾6
const PALACE_LAYOUT = [
  [{ name: '巽', num: 4, direction: '东南' }, { name: '离', num: 9, direction: '南' }, { name: '坤', num: 2, direction: '西南' }],
  [{ name: '震', num: 3, direction: '东' }, { name: '中', num: 5, direction: '中' }, { name: '兑', num: 7, direction: '西' }],
  [{ name: '艮', num: 8, direction: '东北' }, { name: '坎', num: 1, direction: '北' }, { name: '乾', num: 6, direction: '西北' }],
]

export interface QimenPalace {
  name: string         // e.g. '坎宫' (center renders as '中五宫')
  number: number       // 1-9
  direction: string    // e.g. '北'
  star: string         // 九星 e.g. '天任星'
  door: string         // 八门 e.g. '开门'
  divinity: string     // 八神 e.g. '九天'
  heavenStem: string   // 天盘天干
  earthStem: string    // 地盘天干
}

export interface QimenPattern {
  name: string       // e.g. '青龙返首'
  type: 'auspicious' | 'inauspicious' | 'neutral' // 吉/凶/中
  palace?: string    // which palace, if applicable
  description: string
}

export interface QimenChart {
  // Time info
  year: string      // e.g. '甲辰'
  month: string     // e.g. '庚午'
  day: string       // e.g. '甲子'
  hour: string      // e.g. '辛未'
  solarTerm: string // e.g. '芒种'
  round: number     // 用局 (positive=阳遁, negative=阴遁)
  roundLabel: string // e.g. '阳遁九局'
  // Key elements
  zhiFu: string      // 值符 (star name)
  zhiShi: string     // 值使 (door name)
  // Derived key positions — the anchors qimen analysis (用神/應期/方位) hinges on
  zhiFuPalace: string    // 值符落宮 e.g. '坎宫'
  zhiShiPalace: string   // 值使落宮 e.g. '艮宫'
  voidBranches: string[] // 旬空 (空亡) 地支 e.g. ['寅','卯']
  voidPalaces: string[]  // 空亡所落宮 names
  horseBranch: string    // 驛馬 (馬星) 地支 e.g. '申'
  horsePalace: string    // 馬星所落宮 name
  // 9 palaces
  palaces: QimenPalace[]
  // Flat 3x3 grid for rendering
  grid: (QimenPalace | null)[][]
  // Pattern analysis
  patterns: QimenPattern[]
}

// ═══ Five Elements mapping ═══
const STEM_ELEMENT: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}
const PALACE_ELEMENT: Record<number, string> = {
  1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火',
}
const DOOR_ELEMENT: Record<string, string> = {
  '开门': '金', '休门': '水', '生门': '土', '伤门': '木',
  '杜门': '木', '景门': '火', '死门': '土', '惊门': '金',
}
const STAR_ELEMENT: Record<string, string> = {
  '天蓬星': '水', '天任星': '土', '天冲星': '木', '天辅星': '木',
  '天禽星': '土', '天心星': '金', '天柱星': '金', '天芮星': '土', '天英星': '火',
}
// Five element cycles
const GENERATES: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
const OVERCOMES: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

// Default palace positions (Luo Shu order)
const STAR_DEFAULT_PALACE: Record<string, number> = {
  '天蓬星': 1, '天任星': 8, '天冲星': 3, '天辅星': 4,
  '天禽星': 5, '天心星': 6, '天柱星': 7, '天芮星': 2, '天英星': 9,
}
const DOOR_DEFAULT_PALACE: Record<string, number> = {
  '休门': 1, '生门': 8, '伤门': 3, '杜门': 4,
  '开门': 6, '惊门': 7, '死门': 2, '景门': 9,
}
// Opposite palace mapping
const OPPOSITE_PALACE: Record<number, number> = {
  1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4,
}

// 地支 → 后天宫位 (洛书定位): used to map 旬空 / 驿马 地支 onto palaces.
const BRANCH_PALACE: Record<string, number> = {
  '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4, '巳': 4,
  '午': 9, '未': 2, '申': 2, '酉': 7, '戌': 6, '亥': 6,
}
// 六甲旬 → 旬空 (空亡) 地支. Index = floor(hour 60-cycle index / 10):
// 甲子旬→戌亥, 甲戌旬→申酉, 甲申旬→午未, 甲午旬→辰巳, 甲辰旬→寅卯, 甲寅旬→子丑.
const XUN_KONG: string[][] = [
  ['戌', '亥'], ['申', '酉'], ['午', '未'], ['辰', '巳'], ['寅', '卯'], ['子', '丑'],
]
// 时支三合局 → 驿马 (马星) 地支. 申子辰马在寅 / 寅午戌马在申 / 巳酉丑马在亥 / 亥卯未马在巳.
const HORSE_BY_BRANCH: Record<string, string> = {
  '申': '寅', '子': '寅', '辰': '寅',
  '寅': '申', '午': '申', '戌': '申',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳',
}

/**
 * Detect Qimen patterns (格局) from the calculated chart.
 */
function detectPatterns(palaces: QimenPalace[]): QimenPattern[] {
  const patterns: QimenPattern[] = []
  const palaceByNum = new Map<number, QimenPalace>()
  for (const p of palaces) palaceByNum.set(p.number, p)

  // ═══ 1. Global patterns: 伏吟 / 反吟 ═══
  let starFuyin = 0, starFanyin = 0
  let doorFuyin = 0, doorFanyin = 0
  let starTotal = 0, doorTotal = 0

  for (const p of palaces) {
    if (p.number === 5) continue // skip center
    // Star check — use the PRIMARY star (寄宫 lodges 天禽 onto 天芮; 天芮 is primary)
    const primaryStar = p.star.split('、')[0]
    if (primaryStar && STAR_DEFAULT_PALACE[primaryStar] !== undefined) {
      starTotal++
      if (STAR_DEFAULT_PALACE[primaryStar] === p.number) starFuyin++
      if (OPPOSITE_PALACE[STAR_DEFAULT_PALACE[primaryStar]] === p.number) starFanyin++
    }
    // Door check
    if (p.door && DOOR_DEFAULT_PALACE[p.door] !== undefined) {
      doorTotal++
      if (DOOR_DEFAULT_PALACE[p.door] === p.number) doorFuyin++
      if (OPPOSITE_PALACE[DOOR_DEFAULT_PALACE[p.door]] === p.number) doorFanyin++
    }
  }

  if (starFuyin >= 6 || doorFuyin >= 6) {
    patterns.push({
      name: '伏吟',
      type: 'inauspicious',
      description: '星门归本位，主事情迟缓、拖延、停滞不前，宜守不宜攻',
    })
  }
  if (starFanyin >= 6 || doorFanyin >= 6) {
    patterns.push({
      name: '反吟',
      type: 'inauspicious',
      description: '星门对冲到对宫，主事情反复、变动大、出入往来不定',
    })
  }

  // ═══ 2. Stem-combination 格局 (天盘干 over 地盘干) ═══
  // 甲 is HIDDEN in Qi Men (represented by 戊 / the 旬首 六仪) and NEVER appears
  // on a plate, so no rule may test for 甲 — the old `e === '甲'` conditions were
  // dead and fired 0 times. The 寄宫 stacks two heaven stems (e.g. "丙、己"); we
  // test EACH so 格局 sitting there aren't silently missed.
  const sanQi = ['乙', '丙', '丁']
  const jiMen = ['开门', '休门', '生门']
  // 天干墓库宫 (五行墓库 → 后天宫位): 木墓未→坤2, 火墓戌→乾6, 金墓丑→艮8, 水/土墓辰→巽4.
  const stemTombs: Record<string, number> = {
    '乙': 2, '丁': 2, '丙': 6, '壬': 4, '癸': 4,
    '庚': 8, '辛': 8,   // 金墓在丑→艮8  (corrected: was mis-set to 坤2)
    '戊': 4, '己': 4,
  }
  for (const p of palaces) {
    if (p.number === 5) continue
    const e = p.earthStem
    const heavenStems = p.heavenStem.split('、').map(s => s.trim()).filter(Boolean)
    if (!e || heavenStems.length === 0) continue
    const push = (name: string, type: QimenPattern['type'], description: string) =>
      patterns.push({ name, type, palace: p.name, description })

    for (const h of heavenStems) {
      // ── 仪奇格 (天盘干 + 地盘干) ──
      if (h === '戊' && e === '丙') push('青龙返首', 'auspicious', '大吉格，万事如意，利于谋事、出行、求官')      // 戊(代甲)+丙
      if (h === '丙' && e === '戊') push('飞鸟跌穴', 'auspicious', '大吉格，喜从天降、谋望遂心、利求财')          // 丙+戊
      if (h === '乙' && e === '辛') push('青龙逃走', 'inauspicious', '不利格，主走失、逃避、计划受阻')            // 烟波钓叟歌：乙加辛
      if (h === '辛' && e === '乙') push('白虎猖狂', 'inauspicious', '凶格，主强人作乱、客欺主、有损失')          // 烟波钓叟歌：辛加乙

      // ── 庚格 (六仪凶格) ──  庚加癸=大格 / 庚加壬=小格 / 庚加己=刑格 / 庚加庚=战格
      if (h === '庚') {
        if (e === '癸') push('大格', 'inauspicious', '凶格，主道路阻隔、行人不至、官非是非')
        else if (e === '壬') push('小格', 'inauspicious', '凶格，主小阻、出行往来不利')
        else if (e === '己') push('刑格', 'inauspicious', '凶格，主官符、刑讼牵连')
        else if (e === '庚') push('战格', 'inauspicious', '凶格，两金相争，主争斗、冲突')
      }

      // ── 三奇得使: 乙丙丁临开休生三吉门 ──
      if (sanQi.includes(h) && jiMen.includes(p.door)) push('三奇得使', 'auspicious', `${h}奇临${p.door}，吉格，利于谋事、求官、出行`)

      // ── 三遁 (天/地/人遁) ──
      if (h === '丙' && e === '戊' && p.door === '生门') push('天遁', 'auspicious', '大吉格，天助之格，利于祈福、上书、迁徙')
      if (h === '乙' && e === '己' && p.door === '开门') push('地遁', 'auspicious', '大吉格，地助之格，利于藏形、遁迹、营建')
      if (h === '丁' && e === '己' && p.door === '休门') push('人遁', 'auspicious', '大吉格，人助之格，利于求贵、见人、婚姻')

      // ── 玉女守门 ──
      if (h === '丁' && e === '己' && p.door === '开门') push('玉女守门', 'auspicious', '吉格，利于求婚、见贵人、暗中行事')

      // ── 三奇入墓 ──  (NOTE: palace mapping is school-variant — kept from the
      //     original; verify against your reference before relying on it.)
      if ((h === '乙' && p.number === 6) || (h === '丙' && p.number === 6) || (h === '丁' && p.number === 2))
        push('三奇入墓', 'inauspicious', `${h}奇入墓于${p.name}，主昏暗不明、事情受阻`)

      // ── 六仪入墓 (非三奇之干临其墓库宫) ──
      if (stemTombs[h] === p.number && !sanQi.includes(h)) push('天干入墓', 'inauspicious', `${h}入墓于${p.name}，主事情受阻、不得出头`)
    }
  }

  // ═══ 3. Door/Star vs Palace element (门迫/星迫) ═══
  for (const p of palaces) {
    if (p.number === 5) continue
    const palaceEl = PALACE_ELEMENT[p.number]
    // 门迫: 门克宫 (门克其所落之宫 → 门受迫). 宫克门 = 门受制，是另一回事。
    const doorEl = DOOR_ELEMENT[p.door]
    if (doorEl && palaceEl && OVERCOMES[doorEl] === palaceEl) {
      patterns.push({
        name: '门迫', type: 'inauspicious', palace: p.name,
        description: `${p.door}(${doorEl})克${p.name}(${palaceEl})，门克宫为迫，主强求生变、欲速不达`,
      })
    }
    // 星迫: 宫克星 (less common, some schools use)
  }

  return patterns
}

// 问真 four pillars from wall-clock components. Day rolls at 23:00 (晚子时算明天)
// per the project-wide convention — lunar-typescript's *Exact* methods, driven
// purely by the integer components, are deterministic and timezone-independent.
function wenZhenPillars(y: number, mo: number, d: number, h: number, mi: number) {
  const lunar = Solar.fromYmdHms(y, mo, d, h, mi, 0).getLunar()
  return {
    year: lunar.getYearInGanZhiExact(),   // 立春 boundary
    month: lunar.getMonthInGanZhiExact(), // 节气 boundary
    day: lunar.getDayInGanZhiExact(),     // 23:00 → 次日
    hour: lunar.getTimeInGanZhi(),
  }
}

export function calculateQimen(dateTime: Date): QimenChart {
  // The user's intended wall-clock. The input Date was parsed from a naive
  // datetime-local string in the *current* process TZ, so local getters here
  // round-trip the wall clock regardless of what that TZ is.
  const y = dateTime.getFullYear()
  const mo = dateTime.getMonth() + 1
  const d = dateTime.getDate()
  const h = dateTime.getHours()
  const mi = dateTime.getMinutes()

  // Authoritative 干支 four pillars (问真). Computed from the integer wall-clock,
  // so they never depend on server timezone. taobi's own pillars are NOT used
  // for display: its 月柱 uses a non-standard formula and its 日柱/时柱 roll at
  // midnight rather than 23:00.
  const wz = wenZhenPillars(y, mo, d, h, mi)

  // taobi's 9-palace engine mixes local-time (干支) and UTC (黄经) getters, so it
  // is only self-consistent under Asia/Shanghai (verified: day/hour pillars match
  // 问真 100% across 2023–2027 only in that TZ). calculateQimen is synchronous —
  // no await — so scoping the TZ override around the taobi call is concurrency-
  // safe: no other request's JS can interleave during this synchronous block.
  const prevTZ = process.env.TZ
  process.env.TZ = 'Asia/Shanghai'
  try {
    // 晚子时 (23:00–23:59): the plate must use the NEXT day's 子时 (问真). Shift the
    // moment fed to taobi to next-day 00:mm so its 旬首/值符/值使/日干支 roll over to
    // match the 问真 pillars above.
    let ey = y, em = mo, ed = d, eh = h
    if (h === 23) {
      const nd = new Date(y, mo - 1, d)
      nd.setDate(nd.getDate() + 1)
      ey = nd.getFullYear(); em = nd.getMonth() + 1; ed = nd.getDate(); eh = 0
    }

    const taobi = new TheArtOfBecomingInvisible(new Date(ey, em - 1, ed, eh, mi))
    const canvas = taobi.getCanvas()
    const cal = taobi.calendar

    const solarTerm = taobi.getSolarTerms(true) as string
    const round = taobi.round as number
    const roundLabel = round > 0 ? `阳遁${round}局` : `阴遁${Math.abs(round)}局`

    const zhiFu = taobi.getSymbol(true) as string
    const zhiShiIndex = taobi.getMandate() as number
    const zhiShi = DOOR_ARR[zhiShiIndex] || `第${zhiShiIndex}门`

    // Parse the 3x3 canvas into palace objects
    const palaces: QimenPalace[] = []
    const grid: (QimenPalace | null)[][] = [[], [], []]

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = canvas[row][col]
        const layoutInfo = PALACE_LAYOUT[row][col]

        // cell structure: [[divinity,"",""], [door,"",heavenStem], [star,"palaceName",earthStem]]
        const divinity = cell[0][0] || ''
        const door = cell[1][0] || ''
        // The 寄宫 stacks two stars and their two heaven stems (e.g. "天芮星,天禽星"
        // / "丙,己"). Keep BOTH — normalize the separator to 、. Previously `star`
        // dropped the 2nd (lost 天禽) and `heavenStem` leaked the raw "丙,己" into
        // the LLM/renderer AND broke equality checks in detectPatterns.
        const heavenStem = (cell[1][2] || '').replace(/[,，]/g, '、')
        const star = (cell[2][0] || '').replace(/[,，]/g, '、')
        const earthStem = cell[2][2] || ''

        const palace: QimenPalace = {
          name: `${layoutInfo.name}${layoutInfo.num === 5 ? '五' : ''}宫`,
          number: layoutInfo.num,
          direction: layoutInfo.direction,
          star: star,
          door: door,
          divinity: divinity,
          heavenStem: heavenStem,
          earthStem: earthStem,
        }

        palaces.push(palace)
        grid[row].push(palace)
      }
    }

    const patterns = detectPatterns(palaces)

    // ─── Derived key positions ───────────────────────────────────────────
    const palaceName = (num: number) => palaces.find(p => p.number === num)?.name || ''
    // Under Shanghai TZ + the 晚子时 shift, taobi's hour 60-cycle index equals the
    // 问真 hour pillar, so 旬空 / 驿马 derived from it are consistent with display.
    const hourCycleIndex = cal.hour.index as number
    // 值符落宫 / 值使落宫: locate the palace currently holding the 值符 star / 值使 door.
    const zhiFuPalace = palaces.find(p => p.star.includes(zhiFu))?.name || ''
    const zhiShiPalace = palaces.find(p => p.door === zhiShi)?.name || ''
    // 旬空 (空亡): from the hour's 旬 (六甲旬 index) → 地支 → 宫.
    const voidBranches = XUN_KONG[Math.floor(hourCycleIndex / 10)] || []
    const voidPalaces = Array.from(new Set(voidBranches.map(b => BRANCH_PALACE[b]).filter(Boolean))).map(palaceName)
    // 驿马 (马星): from the hour 地支 三合局 → 地支 → 宫.
    const horseBranch = HORSE_BY_BRANCH[BRANCHES[hourCycleIndex % 12]] || ''
    const horsePalace = horseBranch && BRANCH_PALACE[horseBranch] ? palaceName(BRANCH_PALACE[horseBranch]) : ''

    return {
      year: wz.year,
      month: wz.month,
      day: wz.day,
      hour: wz.hour,
      solarTerm,
      round,
      roundLabel,
      zhiFu,
      zhiShi,
      zhiFuPalace,
      zhiShiPalace,
      voidBranches,
      voidPalaces,
      horseBranch,
      horsePalace,
      palaces,
      grid,
      patterns,
    }
  } finally {
    if (prevTZ === undefined) delete process.env.TZ
    else process.env.TZ = prevTZ
  }
}
