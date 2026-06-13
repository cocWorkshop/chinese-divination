/**
 * 六爻占卜计算器
 * Liu Yao (Six Lines) Divination Calculator
 *
 * Based on the Three Coin Method:
 * - Each toss: 3 coins, Heads(字)=2, Tails(背)=3
 * - Sum: 6=老阴(changing yin), 7=少阳(yang), 8=少阴(yin), 9=老阳(changing yang)
 * - 6 tosses = 6 lines, bottom to top
 */

// 八卦 (Eight Trigrams)
const TRIGRAMS: Record<string, {
  name: string; symbol: string; element: string; nature: string
  direction: string; family: string; body: string; animal: string
}> = {
  '111': { name: '乾', symbol: '☰', element: '金', nature: '天', direction: '西北', family: '父', body: '首', animal: '马' },
  '000': { name: '坤', symbol: '☷', element: '土', nature: '地', direction: '西南', family: '母', body: '腹', animal: '牛' },
  '100': { name: '震', symbol: '☳', element: '木', nature: '雷', direction: '东', family: '长男', body: '足', animal: '龙' },
  '011': { name: '巽', symbol: '☴', element: '木', nature: '风', direction: '东南', family: '长女', body: '股', animal: '鸡' },
  '010': { name: '坎', symbol: '☵', element: '水', nature: '水', direction: '北', family: '中男', body: '耳', animal: '猪' },
  '101': { name: '离', symbol: '☲', element: '火', nature: '火', direction: '南', family: '中女', body: '目', animal: '雉' },
  '001': { name: '艮', symbol: '☶', element: '土', nature: '山', direction: '东北', family: '少男', body: '手', animal: '狗' },
  '110': { name: '兑', symbol: '☱', element: '金', nature: '泽', direction: '西', family: '少女', body: '口', animal: '羊' },
}

// 64 hexagram names: indexed by upper+lower trigram names
const HEXAGRAM_NAMES: Record<string, { number: number; name: string; fullName: string }> = {
  '乾乾': { number: 1, name: '乾', fullName: '乾为天' },
  '坤坤': { number: 2, name: '坤', fullName: '坤为地' },
  '坎震': { number: 3, name: '屯', fullName: '水雷屯' },
  '艮坎': { number: 4, name: '蒙', fullName: '山水蒙' },
  '坎乾': { number: 5, name: '需', fullName: '水天需' },
  '乾坎': { number: 6, name: '讼', fullName: '天水讼' },
  '坤坎': { number: 7, name: '师', fullName: '地水师' },
  '坎坤': { number: 8, name: '比', fullName: '水地比' },
  '巽乾': { number: 9, name: '小畜', fullName: '风天小畜' },
  '乾兑': { number: 10, name: '履', fullName: '天泽履' },
  '坤乾': { number: 11, name: '泰', fullName: '地天泰' },
  '乾坤': { number: 12, name: '否', fullName: '天地否' },
  '乾离': { number: 13, name: '同人', fullName: '天火同人' },
  '离乾': { number: 14, name: '大有', fullName: '火天大有' },
  '坤艮': { number: 15, name: '谦', fullName: '地山谦' },
  '震坤': { number: 16, name: '豫', fullName: '雷地豫' },
  '兑震': { number: 17, name: '随', fullName: '泽雷随' },
  '艮巽': { number: 18, name: '蛊', fullName: '山风蛊' },
  '坤兑': { number: 19, name: '临', fullName: '地泽临' },
  '巽坤': { number: 20, name: '观', fullName: '风地观' },
  '离震': { number: 21, name: '噬嗑', fullName: '火雷噬嗑' },
  '艮离': { number: 22, name: '贲', fullName: '山火贲' },
  '艮坤': { number: 23, name: '剥', fullName: '山地剥' },
  '坤震': { number: 24, name: '复', fullName: '地雷复' },
  '乾震': { number: 25, name: '无妄', fullName: '天雷无妄' },
  '艮乾': { number: 26, name: '大畜', fullName: '山天大畜' },
  '艮震': { number: 27, name: '颐', fullName: '山雷颐' },
  '兑巽': { number: 28, name: '大过', fullName: '泽风大过' },
  '坎坎': { number: 29, name: '坎', fullName: '坎为水' },
  '离离': { number: 30, name: '离', fullName: '离为火' },
  '兑艮': { number: 31, name: '咸', fullName: '泽山咸' },
  '震巽': { number: 32, name: '恒', fullName: '雷风恒' },
  '乾艮': { number: 33, name: '遁', fullName: '天山遁' },
  '震乾': { number: 34, name: '大壮', fullName: '雷天大壮' },
  '离坤': { number: 35, name: '晋', fullName: '火地晋' },
  '坤离': { number: 36, name: '明夷', fullName: '地火明夷' },
  '巽离': { number: 37, name: '家人', fullName: '风火家人' },
  '离兑': { number: 38, name: '睽', fullName: '火泽睽' },
  '坎艮': { number: 39, name: '蹇', fullName: '水山蹇' },
  '震坎': { number: 40, name: '解', fullName: '雷水解' },
  '艮兑': { number: 41, name: '损', fullName: '山泽损' },
  '巽震': { number: 42, name: '益', fullName: '风雷益' },
  '兑乾': { number: 43, name: '夬', fullName: '泽天夬' },
  '乾巽': { number: 44, name: '姤', fullName: '天风姤' },
  '兑坤': { number: 45, name: '萃', fullName: '泽地萃' },
  '坤巽': { number: 46, name: '升', fullName: '地风升' },
  '兑坎': { number: 47, name: '困', fullName: '泽水困' },
  '坎巽': { number: 48, name: '井', fullName: '水风井' },
  '兑离': { number: 49, name: '革', fullName: '泽火革' },
  '离巽': { number: 50, name: '鼎', fullName: '火风鼎' },
  '震震': { number: 51, name: '震', fullName: '震为雷' },
  '艮艮': { number: 52, name: '艮', fullName: '艮为山' },
  '巽艮': { number: 53, name: '渐', fullName: '风山渐' },
  '震兑': { number: 54, name: '归妹', fullName: '雷泽归妹' },
  '震离': { number: 55, name: '丰', fullName: '雷火丰' },
  '离艮': { number: 56, name: '旅', fullName: '火山旅' },
  '巽巽': { number: 57, name: '巽', fullName: '巽为风' },
  '兑兑': { number: 58, name: '兑', fullName: '兑为泽' },
  '巽坎': { number: 59, name: '涣', fullName: '风水涣' },
  '坎兑': { number: 60, name: '节', fullName: '水泽节' },
  '巽兑': { number: 61, name: '中孚', fullName: '风泽中孚' },
  '震艮': { number: 62, name: '小过', fullName: '雷山小过' },
  '坎离': { number: 63, name: '既济', fullName: '水火既济' },
  '离坎': { number: 64, name: '未济', fullName: '火水未济' },
}

// 地支 (Earthly Branches) for each line of each trigram
// Based on 纳甲法 (Na Jia method)
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const
const BRANCH_ELEMENT: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
}

// 纳甲: Each trigram assigns branches to its 3 lines (bottom to top)
// For inner trigram (lines 1-3) and outer trigram (lines 4-6)
const NAJIA: Record<string, { stem: string; innerBranches: string[]; outerBranches: string[] }> = {
  '乾': { stem: '甲', innerBranches: ['子','寅','辰'], outerBranches: ['午','申','戌'] },
  '坤': { stem: '乙', innerBranches: ['未','巳','卯'], outerBranches: ['丑','亥','酉'] },
  '震': { stem: '庚', innerBranches: ['子','寅','辰'], outerBranches: ['午','申','戌'] },
  '巽': { stem: '辛', innerBranches: ['丑','亥','酉'], outerBranches: ['未','巳','卯'] },
  '坎': { stem: '戊', innerBranches: ['寅','辰','午'], outerBranches: ['申','戌','子'] },
  '离': { stem: '己', innerBranches: ['卯','丑','亥'], outerBranches: ['酉','未','巳'] },
  '艮': { stem: '丙', innerBranches: ['辰','午','申'], outerBranches: ['戌','子','寅'] },
  '兑': { stem: '丁', innerBranches: ['巳','卯','丑'], outerBranches: ['亥','酉','未'] },
}

// 六亲 (Six Relatives) based on 五行生克 with the 宫 (palace) element:
//   比和(同)→兄弟, 我生→子孙, 生我→父母, 我克→妻财, 克我→官鬼.
// (was a bug: 妻财/官鬼 used 生 maps instead of 克, so 财/官鬼 could never be
// assigned and those lines fell through to '?'.)
function getSixRelative(gongElement: string, lineElement: string): string {
  if (gongElement === lineElement) return '兄弟'
  const produces: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  const overcomes: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }
  if (produces[gongElement] === lineElement) return '子孙'   // 我生者为子孙
  if (produces[lineElement] === gongElement) return '父母'   // 生我者为父母
  if (overcomes[gongElement] === lineElement) return '妻财'  // 我克者为妻财
  if (overcomes[lineElement] === gongElement) return '官鬼'  // 克我者为官鬼
  return '?'
}

// 八宫 (Eight Palace / 京房八宫) determination for a hexagram.
// Each palace has 8 hexagrams in order: 本宫卦, 一世, 二世, 三世, 四世, 五世, 游魂, 归魂.
//
// Generated programmatically from the canonical flip rules rather than typed by
// hand (the previous hand-typed table was wrong for ~48/64 hexagrams, which
// corrupted 宫/世应/六亲 for most readings). Rules, relative to the pure
// palace hexagram (lower=upper=palace trigram), with line indices 0..5
// counted bottom→top:
//   本宫 = no flip; 一世..五世 = cumulatively flip lines 1..5;
//   游魂 = 五世 with line 4 (index 3) reverted (net flips {0,1,2,4});
//   归魂 = lower trigram restored to original (net flip {4}).
const PALACE_ORDER = ['乾', '坤', '震', '巽', '坎', '离', '艮', '兑'] as const
const FLIP_SETS: number[][] = [
  [],            // 本宫卦
  [0],           // 一世
  [0, 1],        // 二世
  [0, 1, 2],     // 三世
  [0, 1, 2, 3],  // 四世
  [0, 1, 2, 3, 4], // 五世
  [0, 1, 2, 4],  // 游魂
  [4],           // 归魂
]

const EIGHT_PALACES: { palace: string; hexagrams: string[] }[] = (() => {
  const bitsToName: Record<string, string> = {}
  const nameToBits: Record<string, string> = {}
  for (const k of Object.keys(TRIGRAMS)) {
    bitsToName[k] = TRIGRAMS[k].name
    nameToBits[TRIGRAMS[k].name] = k
  }
  return PALACE_ORDER.map((palace) => {
    const base = nameToBits[palace] // 3-bit string, bottom→top
    const full = (base + base).split('').map(Number) // 6 bits, bottom→top
    const hexagrams = FLIP_SETS.map((flips) => {
      const b = full.slice()
      for (const idx of flips) b[idx] ^= 1
      const lower = bitsToName[b.slice(0, 3).join('')]
      const upper = bitsToName[b.slice(3, 6).join('')]
      return upper + lower // key format used by findPalace/getShiYing
    })
    return { palace, hexagrams }
  })
})()

function findPalace(upperName: string, lowerName: string): string {
  const key = upperName + lowerName
  for (const p of EIGHT_PALACES) {
    if (p.hexagrams.includes(key)) return p.palace
  }
  // Fallback: use upper trigram
  return upperName
}

// 世应 (Shi-Ying) positions — depends on the position in the palace sequence
function getShiYing(upperName: string, lowerName: string): { shi: number; ying: number } {
  const key = upperName + lowerName
  for (const p of EIGHT_PALACES) {
    const idx = p.hexagrams.indexOf(key)
    if (idx >= 0) {
      // 世爻位置: 本宫卦=6, 一世=1, 二世=2, 三世=3, 四世=4, 五世=5, 游魂=4, 归魂=3
      const shiPositions = [6, 1, 2, 3, 4, 5, 4, 3]
      const shi = shiPositions[idx]
      const ying = shi <= 3 ? shi + 3 : shi - 3
      return { shi, ying }
    }
  }
  return { shi: 6, ying: 3 }
}

export interface LiuYaoLine {
  position: number       // 1-6 (bottom to top)
  yaoName: string        // 初爻, 二爻, ...
  value: number          // 6, 7, 8, 9
  isYang: boolean        // 7 or 9
  isChanging: boolean    // 6 or 9
  branch: string         // 地支
  element: string        // 五行
  sixRelative: string    // 六亲
  isShiYao: boolean      // 世爻
  isYingYao: boolean     // 应爻
}

export interface LiuYaoHexagram {
  name: string
  fullName: string
  number: number
  upperTrigram: typeof TRIGRAMS[string]
  lowerTrigram: typeof TRIGRAMS[string]
  palace: string
  palaceElement: string
  lines: LiuYaoLine[]
}

export interface LiuYaoChart {
  originalHexagram: LiuYaoHexagram
  changedHexagram: LiuYaoHexagram | null
  changingLines: number[]  // positions of changing lines (1-indexed)
  castTime: string
  rawLines: { coins: number[]; value: number }[]
}

export function calculateLiuYao(
  rawLines: { coins: number[]; value: number }[],
  castTime?: string
): LiuYaoChart {
  const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

  // Determine trigram bit strings
  // value 7,9 = yang (1), value 6,8 = yin (0)
  const bits = rawLines.map(l => (l.value === 7 || l.value === 9) ? '1' : '0')
  const lowerKey = bits.slice(0, 3).join('')
  const upperKey = bits.slice(3, 6).join('')

  const lowerTrigram = TRIGRAMS[lowerKey]
  const upperTrigram = TRIGRAMS[upperKey]

  if (!lowerTrigram || !upperTrigram) {
    throw new Error(`Invalid trigram: lower=${lowerKey}, upper=${upperKey}`)
  }

  const hexKey = upperTrigram.name + lowerTrigram.name
  const hexInfo = HEXAGRAM_NAMES[hexKey] || { number: 0, name: '?', fullName: '?' }

  const palace = findPalace(upperTrigram.name, lowerTrigram.name)
  const palaceElement = TRIGRAMS[Object.keys(TRIGRAMS).find(k => TRIGRAMS[k].name === palace) || '111']?.element || '金'
  const { shi, ying } = getShiYing(upperTrigram.name, lowerTrigram.name)

  // Build lines with 纳甲
  const lowerNajia = NAJIA[lowerTrigram.name]
  const upperNajia = NAJIA[upperTrigram.name]

  const lines: LiuYaoLine[] = rawLines.map((raw, i) => {
    const position = i + 1
    const isUpper = i >= 3
    const trigramIdx = isUpper ? i - 3 : i
    const najia = isUpper ? upperNajia : lowerNajia
    const branches = isUpper ? najia.outerBranches : najia.innerBranches
    const branch = branches[trigramIdx]
    const element = BRANCH_ELEMENT[branch]

    return {
      position,
      yaoName: yaoNames[i],
      value: raw.value,
      isYang: raw.value === 7 || raw.value === 9,
      isChanging: raw.value === 6 || raw.value === 9,
      branch,
      element,
      sixRelative: getSixRelative(palaceElement, element),
      isShiYao: position === shi,
      isYingYao: position === ying,
    }
  })

  const changingLines = lines.filter(l => l.isChanging).map(l => l.position)

  // Calculate changed hexagram if there are changing lines
  let changedHexagram: LiuYaoHexagram | null = null
  if (changingLines.length > 0) {
    const changedBits = rawLines.map(l => {
      if (l.value === 9) return '0'  // old yang → yin
      if (l.value === 6) return '1'  // old yin → yang
      return (l.value === 7) ? '1' : '0'
    })
    const changedLowerKey = changedBits.slice(0, 3).join('')
    const changedUpperKey = changedBits.slice(3, 6).join('')
    const changedLower = TRIGRAMS[changedLowerKey]
    const changedUpper = TRIGRAMS[changedUpperKey]

    if (changedLower && changedUpper) {
      const changedHexKey = changedUpper.name + changedLower.name
      const changedHexInfo = HEXAGRAM_NAMES[changedHexKey] || { number: 0, name: '?', fullName: '?' }
      const changedPalace = findPalace(changedUpper.name, changedLower.name)
      const changedPalaceEl = TRIGRAMS[Object.keys(TRIGRAMS).find(k => TRIGRAMS[k].name === changedPalace) || '111']?.element || '金'
      const changedShiYing = getShiYing(changedUpper.name, changedLower.name)

      const changedLowerNajia = NAJIA[changedLower.name]
      const changedUpperNajia = NAJIA[changedUpper.name]

      const changedLines: LiuYaoLine[] = changedBits.map((bit, i) => {
        const position = i + 1
        const isUpper = i >= 3
        const trigramIdx = isUpper ? i - 3 : i
        const najia = isUpper ? changedUpperNajia : changedLowerNajia
        const branches = isUpper ? najia.outerBranches : najia.innerBranches
        const branch = branches[trigramIdx]
        const element = BRANCH_ELEMENT[branch]
        return {
          position,
          yaoName: yaoNames[i],
          value: bit === '1' ? 7 : 8,
          isYang: bit === '1',
          isChanging: false,
          branch,
          element,
          sixRelative: getSixRelative(changedPalaceEl, element),
          isShiYao: position === changedShiYing.shi,
          isYingYao: position === changedShiYing.ying,
        }
      })

      changedHexagram = {
        name: changedHexInfo.name,
        fullName: changedHexInfo.fullName,
        number: changedHexInfo.number,
        upperTrigram: changedUpper,
        lowerTrigram: changedLower,
        palace: changedPalace,
        palaceElement: changedPalaceEl,
        lines: changedLines,
      }
    }
  }

  return {
    originalHexagram: {
      name: hexInfo.name,
      fullName: hexInfo.fullName,
      number: hexInfo.number,
      upperTrigram,
      lowerTrigram,
      palace,
      palaceElement,
      lines,
    },
    changedHexagram,
    changingLines,
    castTime: castTime || new Date().toISOString(),
    rawLines,
  }
}
