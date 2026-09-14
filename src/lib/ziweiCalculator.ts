import { astro } from 'iztro'

// Map pinyin shichen names to iztro timeIndex (0-12)
const SHICHEN_TO_TIME_INDEX: Record<string, number> = {
  'zi': 0, 'zi_early': 0, 'zi_late': 0, 'chou': 1, 'yin': 2, 'mao': 3,
  'chen': 4, 'si': 5, 'wu': 6, 'wei': 7,
  'shen': 8, 'you': 9, 'xu': 10, 'hai': 11,
  '子': 0, '丑': 1, '寅': 2, '卯': 3,
  '辰': 4, '巳': 5, '午': 6, '未': 7,
  '申': 8, '酉': 9, '戌': 10, '亥': 11,
}

// 天干 → 四化 mapping table (standard)
const SIHUA_TABLE: Record<string, [string, string, string, string]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼'],
}

export interface ZiweiStar {
  name: string
  type: string         // 'major' | 'minor' | 'adjective'
  brightness?: string  // 旺|庙|得|利|平|闲|陷
  mutagen?: string     // 禄|权|科|忌
}

export interface ZiweiPalace {
  name: string
  heavenlyStem: string
  earthlyBranch: string
  majorStars: ZiweiStar[]
  minorStars: ZiweiStar[]
  adjectiveStars: ZiweiStar[]
  isBodyPalace: boolean
  changsheng12: string
  decadal: { range: number[]; heavenlyStem: string; earthlyBranch: string }
  ages: number[]
}

export interface ZiweiLiuNianEntry {
  year: number
  age: number
  earthlyBranch: string       // 流年地支 (determines 流年命宫 position)
  yearlyMutagen: string[]     // [禄星, 权星, 科星, 忌星] names
  huaLuPalace: string         // 化禄落在哪个宫
  huaJiPalace: string         // 化忌落在哪个宫
  isLucky: boolean | null     // green/red/neutral
}

export interface ZiweiDecadalSiHua {
  heavenlyStem: string
  earthlyBranch: string
  range: number[]
  mutagen: [string, string, string, string]  // [禄星, 权星, 科星, 忌星]
}

export interface ZiweiChart {
  // Basic info
  solarDate: string
  lunarDate: string
  time: string
  timeRange: string
  zodiac: string
  sign: string
  gender: string
  // Core chart data
  fiveElementsClass: string
  soul: string              // 命主
  body: string              // 身主
  earthlyBranchOfSoulPalace: string
  earthlyBranchOfBodyPalace: string
  // 12 palaces
  palaces: ZiweiPalace[]
  // Four transformations summary
  siHua: { star: string; type: string; palace: string }[]
  // 大限四化 per decade
  decadalSiHua?: ZiweiDecadalSiHua[]
  // 流年
  liuNian?: ZiweiLiuNianEntry[]
}

// Key natal palaces for isLucky determination
const KEY_PALACES = ['命宫', '财帛', '官禄', '夫妻']

export function calculateZiwei(
  solarBirthDate: string,  // 'YYYY-MM-DD'
  birthTime: string,       // pinyin like 'zi', 'chou' or 地支 like '子'
  gender: 'male' | 'female'
): ZiweiChart {
  const timeIndex = SHICHEN_TO_TIME_INDEX[birthTime] ?? 0
  const genderName = gender === 'male' ? '男' : '女'

  // Convert 'YYYY-MM-DD' to 'YYYY-M-D' (iztro expects no leading zeros)
  const [y, m, d] = solarBirthDate.split('-').map(Number)
  const iztroDate = `${y}-${m}-${d}`

  const chart = astro.bySolar(iztroDate, timeIndex, genderName, true, 'zh-CN')

  // Extract palace data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const palaces: ZiweiPalace[] = chart.palaces.map((p: any) => {
    const palace = p as {
      name: string
      heavenlyStem: string
      earthlyBranch: string
      majorStars: { name: string; type: string; brightness?: string; mutagen?: string }[]
      minorStars: { name: string; type: string; brightness?: string; mutagen?: string }[]
      adjectiveStars: { name: string; type: string; brightness?: string; mutagen?: string }[]
      isBodyPalace: boolean
      changsheng12: string
      decadal: { range: number[]; heavenlyStem: string; earthlyBranch: string }
      ages: number[]
    }

    const mapStars = (stars: { name: string; type: string; brightness?: string; mutagen?: string }[]): ZiweiStar[] =>
      (stars || []).map(s => ({
        name: s.name,
        type: s.type,
        brightness: s.brightness || undefined,
        mutagen: s.mutagen || undefined,
      }))

    return {
      name: palace.name,
      heavenlyStem: palace.heavenlyStem,
      earthlyBranch: palace.earthlyBranch,
      majorStars: mapStars(palace.majorStars),
      minorStars: mapStars(palace.minorStars),
      adjectiveStars: mapStars(palace.adjectiveStars),
      isBodyPalace: palace.isBodyPalace,
      changsheng12: palace.changsheng12,
      decadal: {
        range: palace.decadal?.range?.length === 2 ? palace.decadal.range : [0, 0],
        heavenlyStem: palace.decadal?.heavenlyStem || '',
        earthlyBranch: palace.decadal?.earthlyBranch || '',
      },
      ages: palace.ages || [],
    }
  })

  // Extract 四化 (Four Transformations)
  const siHua: { star: string; type: string; palace: string }[] = []
  for (const palace of palaces) {
    for (const starList of [palace.majorStars, palace.minorStars, palace.adjectiveStars]) {
      for (const star of starList) {
        if (star.mutagen) {
          siHua.push({ star: star.name, type: star.mutagen, palace: palace.name })
        }
      }
    }
  }

  // Compute 大限四化 per decade
  const decadalSiHua: ZiweiDecadalSiHua[] = palaces.map(p => {
    const stem = p.decadal.heavenlyStem
    const table = SIHUA_TABLE[stem]
    return {
      heavenlyStem: stem,
      earthlyBranch: p.decadal.earthlyBranch,
      range: p.decadal.range,
      mutagen: table || ['', '', '', ''],
    }
  }).filter(d => d.range[0] > 0 || d.range[1] > 0) // filter out invalid decades
    .sort((a, b) => a.range[0] - b.range[0])

  // Compute 流年 directly from year ganzhi. The previous implementation
  // called chart.horoscope() per year — 80 heavy computations per chart —
  // only to read back data derivable from the year stem/branch: the mutagen
  // table below is the same standard 禄权科忌 table iztro uses, and the old
  // code sampled mid-year (June) dates which never cross the 立春 boundary,
  // so (year - 4) modular arithmetic is exactly equivalent.
  const birthYear = y
  const liuNian: ZiweiLiuNianEntry[] = []
  const YEAR_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const YEAR_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  // Compute 80 years for UI timeline
  for (let i = 0; i < 80; i++) {
    const targetYear = birthYear + 1 + i  // age 1 to 80
    const age = targetYear - birthYear
    const yearStem = YEAR_STEMS[(targetYear - 4) % 10]
    const earthlyBranch = YEAR_BRANCHES[(targetYear - 4) % 12]
    const table = SIHUA_TABLE[yearStem]

    // Determine which palaces get 化禄 and 化忌
    let huaLuPalace = ''
    let huaJiPalace = ''

    if (table) {
      // Find which natal palace the 化禄星 and 化忌星 sit in
      const luStar = table[0]
      const jiStar = table[3]
      for (const p of palaces) {
        const allNames = [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].map(s => s.name)
        if (allNames.includes(luStar) && !huaLuPalace) huaLuPalace = p.name
        if (allNames.includes(jiStar) && !huaJiPalace) huaJiPalace = p.name
      }
    }

    // isLucky: green if 化禄 hits key palace, red if 化忌 hits key palace
    let isLucky: boolean | null = null
    if (KEY_PALACES.includes(huaJiPalace)) isLucky = false
    else if (KEY_PALACES.includes(huaLuPalace)) isLucky = true

    liuNian.push({
      year: targetYear,
      age,
      earthlyBranch,
      yearlyMutagen: table ?? [],
      huaLuPalace,
      huaJiPalace,
      isLucky,
    })
  }

  return {
    solarDate: chart.solarDate,
    lunarDate: chart.lunarDate,
    time: chart.time,
    timeRange: chart.timeRange,
    zodiac: chart.zodiac,
    sign: chart.sign,
    gender: chart.gender,
    fiveElementsClass: chart.fiveElementsClass,
    soul: chart.soul,
    body: chart.body,
    earthlyBranchOfSoulPalace: chart.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: chart.earthlyBranchOfBodyPalace,
    palaces,
    siHua,
    decadalSiHua,
    liuNian,
  }
}
