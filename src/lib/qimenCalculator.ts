/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error taobi has no type definitions
import TaobiModule from 'taobi'

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
  name: string         // e.g. '坎一'
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
    // Star check
    if (p.star && STAR_DEFAULT_PALACE[p.star] !== undefined) {
      starTotal++
      if (STAR_DEFAULT_PALACE[p.star] === p.number) starFuyin++
      if (OPPOSITE_PALACE[STAR_DEFAULT_PALACE[p.star]] === p.number) starFanyin++
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

  // ═══ 2. Stem combination patterns (天盘干+地盘干) ═══
  for (const p of palaces) {
    if (p.number === 5) continue
    const h = p.heavenStem, e = p.earthStem
    if (!h || !e) continue

    // 青龙返首: 天盘戊+地盘甲 (戊代甲)
    if (h === '戊' && e === '甲') {
      // Strictly in 乾6 is classic, but any palace is recognized
      patterns.push({
        name: '青龙返首', type: 'auspicious', palace: p.name,
        description: '大吉格，万事如意，利于谋事、出行、求官',
      })
    }
    // 飞鸟跌穴: 天盘甲+地盘己 (or 戊+己 in some schools)
    if ((h === '甲' || h === '戊') && e === '己') {
      patterns.push({
        name: '飞鸟跌穴', type: 'auspicious', palace: p.name,
        description: '吉格，利于隐藏、防守、暗中谋事',
      })
    }
    // 龙逃走: 天盘甲(戊)遇地盘辛
    if ((h === '甲' || h === '戊') && e === '辛') {
      patterns.push({
        name: '龙逃走', type: 'inauspicious', palace: p.name,
        description: '不利格，主人走失、逃避、奴欺主',
      })
    }
    // 虎猖狂: 天盘辛遇地盘甲(戊)
    if (h === '辛' && (e === '甲' || e === '戊')) {
      patterns.push({
        name: '虎猖狂', type: 'inauspicious', palace: p.name,
        description: '凶格，主强人作乱、客欺主、有损失',
      })
    }

    // 三奇得使: 乙丙丁临开休生三吉门
    const sanQi = ['乙', '丙', '丁']
    const jiMen = ['开门', '休门', '生门']
    if (sanQi.includes(h) && jiMen.includes(p.door)) {
      patterns.push({
        name: '三奇得使', type: 'auspicious', palace: p.name,
        description: `${h}奇临${p.door}，吉格，利于谋事、求官、出行`,
      })
    }

    // 三奇入墓
    if ((h === '乙' && p.number === 6) || // 乙入乾金墓
        (h === '丙' && p.number === 6) || // 丙入乾(戌墓)
        (h === '丁' && p.number === 2))   // 丁入坤(未墓)
    {
      patterns.push({
        name: '三奇入墓', type: 'inauspicious', palace: p.name,
        description: `${h}奇入墓于${p.name}，主昏暗不明、事情受阻`,
      })
    }

    // 天遁: 天盘丙+地盘戊+生门
    if (h === '丙' && e === '戊' && p.door === '生门') {
      patterns.push({
        name: '天遁', type: 'auspicious', palace: p.name,
        description: '大吉格，天助之格，利于祈福、上书、迁徙',
      })
    }
    // 地遁: 天盘乙+地盘己+开门
    if (h === '乙' && e === '己' && p.door === '开门') {
      patterns.push({
        name: '地遁', type: 'auspicious', palace: p.name,
        description: '大吉格，地助之格，利于藏形、遁迹、营建',
      })
    }
    // 人遁: 天盘丁+地盘己+休门
    if (h === '丁' && e === '己' && p.door === '休门') {
      patterns.push({
        name: '人遁', type: 'auspicious', palace: p.name,
        description: '大吉格，人助之格，利于求贵、见人、婚姻',
      })
    }

    // 玉女守门: 天盘丁+地盘己+开门(一说休门)
    if (h === '丁' && e === '己' && (p.door === '开门')) {
      patterns.push({
        name: '玉女守门', type: 'auspicious', palace: p.name,
        description: '吉格，利于求婚、见贵人、暗中行事',
      })
    }

    // 庚格: 天盘庚遇地盘丙/丁/乙
    if (h === '庚' && ['丙', '丁', '乙'].includes(e)) {
      const subName = e === '丙' ? '大格' : e === '丁' ? '小格' : '刑格'
      patterns.push({
        name: `庚${subName}`, type: 'inauspicious', palace: p.name,
        description: `凶格，主阻隔、官讼、行事不通`,
      })
    }

    // 入墓: 天干入墓于所在宫
    const stemTombs: Record<string, number> = {
      '甲': 2, '乙': 2, // 木墓在未→坤2
      '丙': 6, '丁': 6, // 火墓在戌→乾6
      '壬': 4, '癸': 4, // 水墓在辰→巽4
      '庚': 2, '辛': 2, // 金墓在丑→艮8? (some use 坤2/未)
      '戊': 4, '己': 4, // 土墓在辰→巽4
    }
    if (stemTombs[h] === p.number && !sanQi.includes(h)) {
      patterns.push({
        name: '天干入墓', type: 'inauspicious', palace: p.name,
        description: `${h}入墓于${p.name}，主事情受阻、不得出头`,
      })
    }
  }

  // ═══ 3. Door/Star vs Palace element (门迫/星迫) ═══
  for (const p of palaces) {
    if (p.number === 5) continue
    const palaceEl = PALACE_ELEMENT[p.number]
    // 门迫: 宫克门
    const doorEl = DOOR_ELEMENT[p.door]
    if (doorEl && palaceEl && OVERCOMES[palaceEl] === doorEl) {
      patterns.push({
        name: '门迫', type: 'inauspicious', palace: p.name,
        description: `${p.door}(${doorEl})被${p.name}(${palaceEl})所克，门的力量被压制`,
      })
    }
    // 星迫: 宫克星 (less common, some schools use)
  }

  return patterns
}

function stemBranchFromIndex(index: number): string {
  return STEMS[index % 10] + BRANCHES[index % 12]
}

export function calculateQimen(dateTime: Date): QimenChart {
  const taobi = new TheArtOfBecomingInvisible(dateTime)
  const canvas = taobi.getCanvas()

  const cal = taobi.calendar
  const yearGZ = stemBranchFromIndex(cal.year.index)
  const monthGZ = stemBranchFromIndex(cal.month.index)
  const dayGZ = stemBranchFromIndex(cal.date.index)
  const hourGZ = stemBranchFromIndex(cal.hour.index)

  const solarTerm = taobi.getSolarTerms(true) as string
  const round = taobi.round as number
  const roundLabel = round > 0 ? `阳遁${round}局` : `阴遁${Math.abs(round)}局`

  const zhiFuIndex = taobi.getSymbol() as number
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
      const heavenStem = cell[1][2] || ''
      const star = (cell[2][0] || '').split(',')[0] // may have comma-separated (e.g. 天芮星,天禽星)
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

  return {
    year: yearGZ,
    month: monthGZ,
    day: dayGZ,
    hour: hourGZ,
    solarTerm,
    round,
    roundLabel,
    zhiFu,
    zhiShi,
    palaces,
    grid,
    patterns,
  }
}
