// Unified types for divination result components

// ─── Shared Props Interface ───

export interface DivinationResultProps {
  data: Record<string, unknown>
  isShared?: boolean
  rawResult?: string
  readingId?: string | null
  readingType?: string
  chatMessages?: ChatMsg[]
}

export interface ChatMsg {
  role: 'user' | 'assistant' | string
  content: string
}

// ─── BaziResult Types ───

export interface TenGodEntry { stem: string; god: string }

export interface ShenShaEntry { name: string; description: string }

export interface Pillar {
  stem: string; branch: string; element: string; nayin: string
  hiddenStems?: string[]
  tenGods?: TenGodEntry[]
  changSheng?: string
  kongWang?: string[]
  shenSha?: ShenShaEntry[]
}

export interface TrueSolarTimeInfo {
  originalTime: string; correctedTime: string; correctionMinutes: number
  longitude: number; shichen: string; shichenChanged: boolean
}

export interface DaYunEntry {
  stem: string; branch: string; nayin: string
  startAge: number; startYear: number; endAge: number; endYear: number
}

export interface XiaoYunEntry { stem: string; branch: string; age: number; year: number }

export interface QiYunInfo {
  direction: string; startAge: number; startAgeLabel: string
  startYear: number; startMonth: number
  nearestJieQi: string; nearestJieQiDate: string; daysDiff: number
}

export interface BaziData {
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  dayMaster: { stem: string; element: string; yinYang?: string; strength: string; strengthLabel: string }
  fiveElements: { metal: number; wood: number; water: number; fire: number; earth: number }
  luckyElements: string[]
  avoidElements: string[]
  sections: { overview: string; career: string; marriage: string; wealth: string; health: string; periods: string }
  keyAdvice: string[]
  luckyInfo: { numbers: number[]; colors: string[]; directions: string[] }
  shenSha?: ShenShaEntry[]
  trueSolarTime?: TrueSolarTimeInfo
  daYun?: DaYunEntry[]
  xiaoYun?: XiaoYunEntry[]
  qiYun?: QiYunInfo
  paipanOnly?: boolean
}

// ─── ZiweiResult Types ───

export interface ZiweiStar {
  name: string
  type?: string
  brightness?: string
  mutagen?: string
}

export interface ZiweiPalaceData {
  stars?: string[]
  majorStars?: ZiweiStar[]
  minorStars?: ZiweiStar[]
  adjectiveStars?: ZiweiStar[]
  heavenlyStem?: string
  earthlyBranch?: string
  isBodyPalace?: boolean
  changsheng12?: string
  decadal?: { range: number[]; heavenlyStem: string; earthlyBranch: string }
  ages?: number[]
  analysis: string
}

export interface ZiweiChartInfo {
  solarDate?: string
  lunarDate?: string
  chineseDate?: string
  time?: string
  timeRange?: string
  sign?: string
  zodiac?: string
  gender?: string
  fiveElementsClass?: string
  soul?: string
  body?: string
  earthlyBranchOfSoulPalace?: string
  earthlyBranchOfBodyPalace?: string
  siHua?: { star: string; type: string; palace: string }[]
}

export interface ZiweiData {
  mainStars: { name: string; palace: string; element?: string; brightness?: string; mutagen?: string }[]
  patterns?: { name: string; level: string; description: string }[]
  palaces: Record<string, ZiweiPalaceData>
  sections: {
    overview: string
    career: string
    marriage: string
    wealth: string
    personality?: string
    health?: string
    family?: string
    dayun?: string
  }
  keyPredictions?: { age: string; event: string; basis: string }[]
  keyAdvice: string[]
  luckyInfo: { numbers: number[]; colors: string[]; directions: string[] }
  ziweiChart?: ZiweiChartInfo
  paipanOnly?: boolean
}

// ─── QimenResult Types ───

export interface QimenPalace {
  name: string
  number: number
  direction: string
  star: string
  door: string
  divinity: string
  heavenStem: string
  earthStem: string
}

export interface QimenPattern {
  name: string
  type: 'auspicious' | 'inauspicious' | 'neutral'
  palace?: string
  description: string
}

export interface QimenChartInfo {
  year?: string
  month?: string
  day?: string
  hour?: string
  solarTerm?: string
  round?: number
  roundLabel?: string
  zhiFu?: string
  zhiShi?: string
  palaces?: QimenPalace[]
  grid?: (QimenPalace | null)[][]
  patterns?: QimenPattern[]
}

export interface QimenData {
  palace: { inquiry: string; outcome: string; god: string; star: string; door: string }
  sections: { situation: string; trend: string; timing: string; strategy: string }
  outcome: string
  keyAdvice: string[]
  luckyInfo: { timing: string; direction: string }
  qimenChart?: QimenChartInfo
  paipanOnly?: boolean
}

// ─── OtherResult (Meihua) Types ───

export interface MeihuaTrigram {
  name: string
  symbol: string
  element: string
  lines: number[]
}

export interface MeihuaHexagram {
  name: string
  upper: MeihuaTrigram
  lower: MeihuaTrigram
  lines: number[]
}

export interface MeihuaChartInfo {
  lunarYear?: number
  lunarMonth?: number
  lunarDay?: number
  shichen?: number
  yearBranch?: string
  yearNum?: number
  monthNum?: number
  dayNum?: number
  hourNum?: number
  upperNum?: number
  lowerNum?: number
  changingLine?: number
  benGua?: MeihuaHexagram
  huGua?: MeihuaHexagram
  bianGua?: MeihuaHexagram
  tiGua?: MeihuaTrigram
  yongGua?: MeihuaTrigram
  tiYongRelation?: string
  tiYongAnalysis?: string
}

export interface OtherData {
  subType: string
  trigrams: {
    upper: { name: string; symbol: string; element: string }
    lower: { name: string; symbol: string; element: string }
    transformed: { name: string; symbol: string; element: string }
  }
  sections: { situation: string; inquiry: string; interaction: string; timeline: string }
  outcome: string
  keyAdvice: string[]
  meihuaChart?: MeihuaChartInfo
  paipanOnly?: boolean
}

// ─── FengshuiResult Types ───

export interface FengshuiData {
  flyingStar: { facing: string; period: string; mountainStar: string; waterStar: string }
  rooms: { room: string; energy: string; suggestion: string }[]
  sections: { overall: string; wealth: string; health: string; relationships: string }
  remedies: { issue: string; solution: string }[]
  keyAdvice: string[]
}

// ─── IChingResult Types ───

export interface IChingData {
  hexagram: {
    number: number; name: string; chineseName: string
    upperTrigram: { name: string; symbol: string; element: string }
    lowerTrigram: { name: string; symbol: string; element: string }
    lines: number[]
  }
  judgment: string; image: string; interpretation: string
  changingLines: { position: number; text: string }[]
  advice: string; outcome: string; keyPoints: string[]
}

// ─── LiuYaoResult Types ───

export interface LiuYaoLine {
  position: number; yaoName: string; value: number
  isYang: boolean; isChanging: boolean
  branch: string; element: string; sixRelative: string
  isShiYao: boolean; isYingYao: boolean
}

export interface HexagramData {
  name: string; fullName: string; number: number
  palace?: string; palaceElement?: string
  upperTrigram?: { name: string; symbol: string; element: string; nature: string }
  lowerTrigram?: { name: string; symbol: string; element: string; nature: string }
  lines: LiuYaoLine[]
}

export interface LiuYaoData {
  originalHexagram?: HexagramData
  changedHexagram?: HexagramData | null
  changingLines?: number[]
  guaCi?: string; yaoCi?: string; interpretation?: string
  sixRelativeAnalysis?: string; shiYingAnalysis?: string
  changingAnalysis?: string; timing?: string; advice?: string
  outcome?: string; keyPoints?: string[]
}
