import { Solar } from 'lunar-typescript'

// 先天八卦数: 乾1 兑2 离3 震4 巽5 坎6 艮7 坤8
const XIANTIAN_GUA: Record<number, string> = { 1: '乾', 2: '兑', 3: '离', 4: '震', 5: '巽', 6: '坎', 7: '艮', 8: '坤' }
const GUA_SYMBOL: Record<string, string> = { '乾': '☰', '兑': '☱', '离': '☲', '震': '☳', '巽': '☴', '坎': '☵', '艮': '☶', '坤': '☷' }
const GUA_ELEMENT: Record<string, string> = { '乾': '金', '兑': '金', '离': '火', '震': '木', '巽': '木', '坎': '水', '艮': '土', '坤': '土' }

// 六十四卦名 (上卦, 下卦) → 卦名
const HEXAGRAM_NAMES: Record<string, string> = {
  '乾乾': '乾为天', '乾兑': '天泽履', '乾离': '天火同人', '乾震': '天雷无妄',
  '乾巽': '天风姤', '乾坎': '天水讼', '乾艮': '天山遯', '乾坤': '天地否',
  '兑乾': '泽天夬', '兑兑': '兑为泽', '兑离': '泽火革', '兑震': '泽雷随',
  '兑巽': '泽风大过', '兑坎': '泽水困', '兑艮': '泽山咸', '兑坤': '泽地萃',
  '离乾': '火天大有', '离兑': '火泽睽', '离离': '离为火', '离震': '火雷噬嗑',
  '离巽': '火风鼎', '离坎': '火水未济', '离艮': '火山旅', '离坤': '火地晋',
  '震乾': '雷天大壮', '震兑': '雷泽归妹', '震离': '雷火丰', '震震': '震为雷',
  '震巽': '雷风恒', '震坎': '雷水解', '震艮': '雷山小过', '震坤': '雷地豫',
  '巽乾': '风天小畜', '巽兑': '风泽中孚', '巽离': '风火家人', '巽震': '风雷益',
  '巽巽': '巽为风', '巽坎': '风水涣', '巽艮': '风山渐', '巽坤': '风地观',
  '坎乾': '水天需', '坎兑': '水泽节', '坎离': '水火既济', '坎震': '水雷屯',
  '坎巽': '水风井', '坎坎': '坎为水', '坎艮': '水山蹇', '坎坤': '水地比',
  '艮乾': '山天大畜', '艮兑': '山泽损', '艮离': '山火贲', '艮震': '山雷颐',
  '艮巽': '山风蛊', '艮坎': '山水蒙', '艮艮': '艮为山', '艮坤': '山地剥',
  '坤乾': '地天泰', '坤兑': '地泽临', '坤离': '地火明夷', '坤震': '地雷复',
  '坤巽': '地风升', '坤坎': '地水师', '坤艮': '地山谦', '坤坤': '坤为地',
}

// 五行生克
const WUXING_PRODUCE: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
const WUXING_OVERCOME: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

// 地支→时辰序数 (子=1, 丑=2, ... 亥=12)
const BRANCH_TO_SHICHEN: Record<string, number> = {
  '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6,
  '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12,
  'zi': 1, 'chou': 2, 'yin': 3, 'mao': 4, 'chen': 5, 'si': 6,
  'wu': 7, 'wei': 8, 'shen': 9, 'you': 10, 'xu': 11, 'hai': 12,
}

// 地支序数 (used as 年数 in time-based method)
const BRANCH_ORDER: Record<string, number> = {
  '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6,
  '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12,
}

// Lines for each trigram (from bottom to top): 1=yang, 0=yin
const GUA_LINES: Record<string, number[]> = {
  '乾': [1, 1, 1], '兑': [0, 1, 1], '离': [1, 0, 1], '震': [0, 0, 1],
  '巽': [1, 1, 0], '坎': [0, 1, 0], '艮': [1, 0, 0], '坤': [0, 0, 0],
}

// Lines to trigram name (reverse lookup)
function linesToGua(lines: number[]): string {
  for (const [name, l] of Object.entries(GUA_LINES)) {
    if (l[0] === lines[0] && l[1] === lines[1] && l[2] === lines[2]) return name
  }
  return '乾'
}

export interface MeihuaTrigram {
  name: string    // e.g. '乾'
  symbol: string  // e.g. '☰'
  element: string // e.g. '金'
  lines: number[] // e.g. [1,1,1] from bottom to top
}

export interface MeihuaHexagram {
  name: string           // e.g. '天泽履'
  upper: MeihuaTrigram
  lower: MeihuaTrigram
  lines: number[]        // 6 lines from bottom to top
}

export interface MeihuaChart {
  // Input info
  lunarYear: number
  lunarMonth: number
  lunarDay: number
  shichen: number        // 时辰序数
  yearBranch: string     // 年支
  // Numbers used
  yearNum: number
  monthNum: number
  dayNum: number
  hourNum: number
  upperNum: number       // (年+月+日)%8
  lowerNum: number       // (年+月+日+时)%8
  changingLine: number   // 动爻 (1-6)
  // Hexagrams
  benGua: MeihuaHexagram    // 本卦
  huGua: MeihuaHexagram     // 互卦
  bianGua: MeihuaHexagram   // 变卦
  // 体用 analysis
  tiGua: MeihuaTrigram      // 体卦
  yongGua: MeihuaTrigram    // 用卦
  tiYongRelation: string    // e.g. '用生体'
  tiYongAnalysis: string    // brief analysis
}

function modToRange(n: number, mod: number): number {
  const r = n % mod
  return r === 0 ? mod : r
}

function makeTrigram(guaNum: number): MeihuaTrigram {
  const name = XIANTIAN_GUA[guaNum]
  return {
    name,
    symbol: GUA_SYMBOL[name],
    element: GUA_ELEMENT[name],
    lines: GUA_LINES[name],
  }
}

function makeHexagram(upper: MeihuaTrigram, lower: MeihuaTrigram): MeihuaHexagram {
  const name = HEXAGRAM_NAMES[upper.name + lower.name] || `${upper.name}${lower.name}`
  const lines = [...lower.lines, ...upper.lines] // 6 lines from bottom to top
  return { name, upper, lower, lines }
}

function getHuGua(lines: number[]): MeihuaHexagram {
  // 互卦: take lines 2,3,4 as lower trigram, lines 3,4,5 as upper trigram (0-indexed)
  const lowerLines = [lines[1], lines[2], lines[3]]
  const upperLines = [lines[2], lines[3], lines[4]]
  const lower = { name: linesToGua(lowerLines), symbol: '', element: '', lines: lowerLines }
  const upper = { name: linesToGua(upperLines), symbol: '', element: '', lines: upperLines }
  lower.symbol = GUA_SYMBOL[lower.name]
  lower.element = GUA_ELEMENT[lower.name]
  upper.symbol = GUA_SYMBOL[upper.name]
  upper.element = GUA_ELEMENT[upper.name]
  return makeHexagram(upper, lower)
}

function getBianGua(lines: number[], changingLine: number): MeihuaHexagram {
  // 变卦: flip the changing line (1-indexed from bottom)
  const newLines = [...lines]
  newLines[changingLine - 1] = newLines[changingLine - 1] === 1 ? 0 : 1
  const lowerLines = [newLines[0], newLines[1], newLines[2]]
  const upperLines = [newLines[3], newLines[4], newLines[5]]
  const lower = { name: linesToGua(lowerLines), symbol: '', element: '', lines: lowerLines }
  const upper = { name: linesToGua(upperLines), symbol: '', element: '', lines: upperLines }
  lower.symbol = GUA_SYMBOL[lower.name]
  lower.element = GUA_ELEMENT[lower.name]
  upper.symbol = GUA_SYMBOL[upper.name]
  upper.element = GUA_ELEMENT[upper.name]
  return makeHexagram(upper, lower)
}

function analyzeTiYong(ti: MeihuaTrigram, yong: MeihuaTrigram): { relation: string; analysis: string } {
  const tiEl = ti.element
  const yongEl = yong.element

  if (tiEl === yongEl) {
    return { relation: '体用比和', analysis: `体卦${ti.name}(${tiEl})与用卦${yong.name}(${yongEl})五行相同，比和之象，主平稳。` }
  }
  if (WUXING_PRODUCE[yongEl] === tiEl) {
    return { relation: '用生体', analysis: `用卦${yong.name}(${yongEl})生体卦${ti.name}(${tiEl})，大吉之象，所问之事对我有利。` }
  }
  if (WUXING_PRODUCE[tiEl] === yongEl) {
    return { relation: '体生用', analysis: `体卦${ti.name}(${tiEl})生用卦${yong.name}(${yongEl})，我付出较多，耗泄精力，中平。` }
  }
  if (WUXING_OVERCOME[tiEl] === yongEl) {
    return { relation: '体克用', analysis: `体卦${ti.name}(${tiEl})克用卦${yong.name}(${yongEl})，我能主导局面，较吉。` }
  }
  if (WUXING_OVERCOME[yongEl] === tiEl) {
    return { relation: '用克体', analysis: `用卦${yong.name}(${yongEl})克体卦${ti.name}(${tiEl})，受压不利，主凶。` }
  }

  return { relation: '未知', analysis: '' }
}

export function calculateMeihua(
  solarBirthDate: string,  // 'YYYY-MM-DD' solar date
  birthTime: string,       // pinyin like 'zi' or 地支 like '子'
): MeihuaChart {
  const [year, month, day] = solarBirthDate.split('-').map(Number)

  // Convert solar to lunar
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()

  const lunarYear = lunar.getYear()
  const lunarMonth = Math.abs(lunar.getMonth()) // handle leap months
  const lunarDay = lunar.getDay()
  const yearBranch = lunar.getYearZhi()

  // 年数 = 地支序数 (子1, 丑2, ..., 亥12)
  const yearNum = BRANCH_ORDER[yearBranch] || 1
  const monthNum = lunarMonth
  const dayNum = lunarDay
  const hourNum = BRANCH_TO_SHICHEN[birthTime] || 1

  // Calculate trigram numbers
  // 上卦 = (年+月+日) % 8, 0→8
  const upperSum = yearNum + monthNum + dayNum
  const upperNum = modToRange(upperSum, 8)

  // 下卦 = (年+月+日+时) % 8, 0→8
  const lowerSum = yearNum + monthNum + dayNum + hourNum
  const lowerNum = modToRange(lowerSum, 8)

  // 动爻 = (年+月+日+时) % 6, 0→6
  const changingLine = modToRange(lowerSum, 6)

  // Build trigrams
  const upperTrigram = makeTrigram(upperNum)
  const lowerTrigram = makeTrigram(lowerNum)

  // 本卦
  const benGua = makeHexagram(upperTrigram, lowerTrigram)

  // 互卦
  const huGua = getHuGua(benGua.lines)

  // 变卦
  const bianGua = getBianGua(benGua.lines, changingLine)

  // Determine 体卦 and 用卦
  // 动爻在上卦(4-6) → 上卦为用，下卦为体
  // 动爻在下卦(1-3) → 下卦为用，上卦为体
  let tiGua: MeihuaTrigram
  let yongGua: MeihuaTrigram
  if (changingLine >= 4) {
    // Moving line is in upper trigram
    tiGua = lowerTrigram  // 下卦为体
    yongGua = upperTrigram // 上卦为用
  } else {
    // Moving line is in lower trigram
    tiGua = upperTrigram   // 上卦为体
    yongGua = lowerTrigram // 下卦为用
  }

  const { relation, analysis } = analyzeTiYong(tiGua, yongGua)

  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    shichen: hourNum,
    yearBranch,
    yearNum,
    monthNum,
    dayNum,
    hourNum,
    upperNum,
    lowerNum,
    changingLine,
    benGua,
    huGua,
    bianGua,
    tiGua,
    yongGua,
    tiYongRelation: relation,
    tiYongAnalysis: analysis,
  }
}
