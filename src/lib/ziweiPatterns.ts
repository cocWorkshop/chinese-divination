/**
 * 紫微斗数格局程序化检测
 * 基于命盘数据自动识别格局，保证每次结果一致
 */

import type { ZiweiChart, ZiweiPalace } from './ziweiCalculator'

export interface DetectedPattern {
  name: string
  level: '上格' | '中格' | '下格' | '凶格'
  description: string
  involvedStars: string[]
  involvedPalaces: string[]
}

// 十二地支顺序（用于计算相邻宫位）
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 十四主星名
const MAJOR_14 = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
  '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
]

// 六煞星名
const SHA_STARS = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']

// Helper: get palace by name
function getPalace(palaces: ZiweiPalace[], name: string): ZiweiPalace | undefined {
  return palaces.find(p => p.name === name)
}

// Helper: get palace by earthly branch
function getPalaceByBranch(palaces: ZiweiPalace[], branch: string): ZiweiPalace | undefined {
  return palaces.find(p => p.earthlyBranch === branch)
}

// Helper: get the 命宫
function getSoulPalace(chart: ZiweiChart): ZiweiPalace | undefined {
  return getPalaceByBranch(chart.palaces, chart.earthlyBranchOfSoulPalace)
}

// Helper: get all star names in a palace (major + minor + adjective)
function allStarNames(palace: ZiweiPalace): string[] {
  return [
    ...palace.majorStars.map(s => s.name),
    ...palace.minorStars.map(s => s.name),
    ...palace.adjectiveStars.map(s => s.name),
  ]
}

// Helper: get major star names in a palace
function majorStarNames(palace: ZiweiPalace): string[] {
  return palace.majorStars.map(s => s.name)
}

// Helper: check if a star exists in a palace
function hasStar(palace: ZiweiPalace, starName: string): boolean {
  return allStarNames(palace).includes(starName)
}

// Helper: check if a major star exists in a palace
function hasMajorStar(palace: ZiweiPalace, starName: string): boolean {
  return majorStarNames(palace).includes(starName)
}

// Helper: find which palace a star is in
function findStarPalace(palaces: ZiweiPalace[], starName: string): ZiweiPalace | undefined {
  return palaces.find(p => allStarNames(p).includes(starName))
}

// Helper: get star brightness
function getStarBrightness(palaces: ZiweiPalace[], starName: string): string | undefined {
  for (const p of palaces) {
    for (const list of [p.majorStars, p.minorStars, p.adjectiveStars]) {
      const s = list.find(s => s.name === starName)
      if (s) return s.brightness
    }
  }
  return undefined
}

// Helper: is star bright (庙 or 旺)
function isStarBright(palaces: ZiweiPalace[], starName: string): boolean {
  const b = getStarBrightness(palaces, starName)
  return b === '庙' || b === '旺'
}

// Helper: is star dim (落陷 or 不得地)
// iztro brightness values: 庙|旺|得|利|平|不|陷 (不=不得地)
function isStarDim(palaces: ZiweiPalace[], starName: string): boolean {
  const b = getStarBrightness(palaces, starName)
  return b === '陷' || b === '不' || b === '不得地' || b === '闲'
}

// Helper: get adjacent branches (for "夹" patterns)
function getAdjacentBranches(branch: string): [string, string] {
  const idx = BRANCHES.indexOf(branch)
  if (idx < 0) return ['', '']
  const prev = BRANCHES[(idx - 1 + 12) % 12]
  const next = BRANCHES[(idx + 1) % 12]
  return [prev, next]
}

// Helper: get 三方四正 palaces (三合 + 对宫)
// 三合: same element group in 地支 (寅午戌, 申子辰, 巳酉丑, 亥卯未)
function getSanFangSiZheng(palaces: ZiweiPalace[], centerBranch: string): ZiweiPalace[] {
  const idx = BRANCHES.indexOf(centerBranch)
  if (idx < 0) return []
  // 三合位: +4, +8 (mod 12)
  const tri1 = BRANCHES[(idx + 4) % 12]
  const tri2 = BRANCHES[(idx + 8) % 12]
  // 对宫: +6
  const opp = BRANCHES[(idx + 6) % 12]
  const result: ZiweiPalace[] = []
  for (const b of [centerBranch, tri1, tri2, opp]) {
    const p = getPalaceByBranch(palaces, b)
    if (p) result.push(p)
  }
  return result
}

// Helper: get all major stars in 三方四正
function getMajorStarsInSFSZ(palaces: ZiweiPalace[], centerBranch: string): string[] {
  const sfszPalaces = getSanFangSiZheng(palaces, centerBranch)
  const stars: string[] = []
  for (const p of sfszPalaces) {
    stars.push(...majorStarNames(p))
  }
  return stars
}

// Helper: check if star has specific mutagen
function starHasMutagen(palaces: ZiweiPalace[], starName: string, mutagen: string): boolean {
  for (const p of palaces) {
    for (const list of [p.majorStars, p.minorStars, p.adjectiveStars]) {
      const s = list.find(s => s.name === starName)
      if (s && s.mutagen === mutagen) return true
    }
  }
  return false
}

// ==================== Pattern Detection Functions ====================

function detect紫府同宫(chart: ZiweiChart): DetectedPattern | null {
  for (const p of chart.palaces) {
    const majors = majorStarNames(p)
    if (majors.includes('紫微') && majors.includes('天府')) {
      return {
        name: '紫府同宫',
        level: '上格',
        description: '紫微天府同坐' + p.name + '，帝星财库同宫，极贵之格，一生资源丰厚',
        involvedStars: ['紫微', '天府'],
        involvedPalaces: [p.name],
      }
    }
  }
  return null
}

function detect日月并明(chart: ZiweiChart): DetectedPattern | null {
  const sunPalace = findStarPalace(chart.palaces, '太阳')
  const moonPalace = findStarPalace(chart.palaces, '太阴')
  if (!sunPalace || !moonPalace) return null

  // 太阳在巳午为庙旺，太阴在酉戌为庙旺
  const sunBright = ['巳', '午'].includes(sunPalace.earthlyBranch)
  const moonBright = ['酉', '戌'].includes(moonPalace.earthlyBranch)

  if (sunBright && moonBright) {
    return {
      name: '日月并明',
      level: '上格',
      description: '太阳在' + sunPalace.earthlyBranch + '宫庙旺，太阴在' + moonPalace.earthlyBranch + '宫庙旺，日月各居旺地，文武双全',
      involvedStars: ['太阳', '太阴'],
      involvedPalaces: [sunPalace.name, moonPalace.name],
    }
  }
  return null
}

function detect明珠出海(chart: ZiweiChart): DetectedPattern | null {
  const sunPalace = findStarPalace(chart.palaces, '太阳')
  const moonPalace = findStarPalace(chart.palaces, '太阴')
  if (!sunPalace || !moonPalace) return null

  if (sunPalace.earthlyBranch === '辰' && moonPalace.earthlyBranch === '戌') {
    return {
      name: '明珠出海',
      level: '上格',
      description: '太阳在辰宫、太阴在戌宫，日月各安其位，光辉照命，大吉之格',
      involvedStars: ['太阳', '太阴'],
      involvedPalaces: [sunPalace.name, moonPalace.name],
    }
  }
  return null
}

function detect府相朝垣(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  // 府相朝垣: 天府和天相都在命宫三方四正会照（不要求同宫）
  const sfszPalaces = getSanFangSiZheng(chart.palaces, soul.earthlyBranch)
  const fuPalace = sfszPalaces.find(p => majorStarNames(p).includes('天府'))
  const xiangPalace = sfszPalaces.find(p => majorStarNames(p).includes('天相'))
  if (fuPalace && xiangPalace) {
    return {
      name: '府相朝垣',
      level: '上格',
      description: '天府天相在命宫三方四正会照，财库印星拱命，富贵可期',
      involvedStars: ['天府', '天相'],
      involvedPalaces: [fuPalace.name, xiangPalace.name],
    }
  }
  return null
}

function detect禄马交驰(chart: ZiweiChart): DetectedPattern | null {
  for (const p of chart.palaces) {
    const stars = allStarNames(p)
    if (stars.includes('禄存') && stars.includes('天马')) {
      return {
        name: '禄马交驰',
        level: '上格',
        description: '禄存天马同在' + p.name + '，财星驿马同宫，动中取财，财运极佳',
        involvedStars: ['禄存', '天马'],
        involvedPalaces: [p.name],
      }
    }
  }
  return null
}

function detect三奇嘉会(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const sfszPalaces = getSanFangSiZheng(chart.palaces, soul.earthlyBranch)
  let hasLu = false, hasQuan = false, hasKe = false
  const involvedPalaces: string[] = []

  for (const p of sfszPalaces) {
    for (const list of [p.majorStars, p.minorStars, p.adjectiveStars]) {
      for (const s of list) {
        if (s.mutagen === '禄') { hasLu = true; if (!involvedPalaces.includes(p.name)) involvedPalaces.push(p.name) }
        if (s.mutagen === '权') { hasQuan = true; if (!involvedPalaces.includes(p.name)) involvedPalaces.push(p.name) }
        if (s.mutagen === '科') { hasKe = true; if (!involvedPalaces.includes(p.name)) involvedPalaces.push(p.name) }
      }
    }
  }

  if (hasLu && hasQuan && hasKe) {
    // Build involvedStars from actual 三方四正 palaces, not global siHua
    const starsInSFSZ: string[] = []
    for (const p of sfszPalaces) {
      for (const list of [p.majorStars, p.minorStars, p.adjectiveStars]) {
        for (const s of list) {
          if (s.mutagen && ['禄', '权', '科'].includes(s.mutagen)) {
            starsInSFSZ.push(s.name)
          }
        }
      }
    }
    return {
      name: '三奇嘉会',
      level: '上格',
      description: '化禄、化权、化科三化齐聚命宫三方四正，大贵之格',
      involvedStars: starsInSFSZ,
      involvedPalaces,
    }
  }
  return null
}

function detect机月同梁(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const sfszStars = getMajorStarsInSFSZ(chart.palaces, soul.earthlyBranch)
  const targets = ['天机', '太阴', '天同', '天梁']
  const found = targets.filter(t => sfszStars.includes(t))

  // 经典定义要求4颗（天机太阴天同天梁）全在三方四正。
  // 放宽为3颗：实际星盘中4颗齐聚较少见，3颗已有此格特征。
  if (found.length >= 3) {
    return {
      name: '机月同梁',
      level: '中格',
      description: found.join('、') + '在命宫三方四正会照，适合文职公务、技术研究型工作',
      involvedStars: found,
      involvedPalaces: found.map(s => findStarPalace(chart.palaces, s)?.name || '').filter(Boolean),
    }
  }
  return null
}

function detect杀破狼(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const soulMajors = majorStarNames(soul)
  const target = ['七杀', '破军', '贪狼'].find(s => soulMajors.includes(s))
  if (!target) return null

  // 确认三方四正有其余两颗
  const sfszStars = getMajorStarsInSFSZ(chart.palaces, soul.earthlyBranch)
  const allThree = ['七杀', '破军', '贪狼'].filter(s => sfszStars.includes(s))

  // 经典定义要求七杀破军贪狼全在三方四正。实际上其中一颗必在命宫（已检查），
  // 放宽为2颗（含命宫那颗）：因三星必然相隔4位，命宫有1颗则三方四正至少有2颗。
  if (allThree.length >= 2) {
    return {
      name: '杀破狼格',
      level: '中格',
      description: target + '坐命宫，' + allThree.join('、') + '在三方四正，白手起家型，一生多变动但有大成就',
      involvedStars: allThree,
      involvedPalaces: allThree.map(s => findStarPalace(chart.palaces, s)?.name || '').filter(Boolean),
    }
  }
  return null
}

function detect石中隐玉(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  if (hasMajorStar(soul, '巨门') && starHasMutagen(chart.palaces, '巨门', '禄')) {
    return {
      name: '石中隐玉',
      level: '中格',
      description: '巨门化禄坐命宫，表面平凡实有大才，口才生财',
      involvedStars: ['巨门'],
      involvedPalaces: [soul.name],
    }
  }
  if (hasMajorStar(soul, '巨门') && starHasMutagen(chart.palaces, '巨门', '权')) {
    return {
      name: '石中隐玉',
      level: '中格',
      description: '巨门化权坐命宫，表面平凡实有大才，善于争辩掌权',
      involvedStars: ['巨门'],
      involvedPalaces: [soul.name],
    }
  }
  return null
}

function detect火贪格(chart: ZiweiChart): DetectedPattern | null {
  // 火星或铃星与贪狼同宫在命宫或财帛宫或官禄宫
  // iztro palace names: 命宫, 财帛, 官禄 (no 宫 suffix except 命宫)
  const soul = getSoulPalace(chart)
  const targetPalaces = [
    soul,
    getPalace(chart.palaces, '财帛'),
    getPalace(chart.palaces, '官禄'),
  ].filter((p): p is ZiweiPalace => !!p)
  for (const p of targetPalaces) {
    const stars = allStarNames(p)
    // 贪狼化禄时不构成火贪/铃贪格（化禄改变了贪狼的性质）
    const tanLangHasLu = p.majorStars.some(s => s.name === '贪狼' && s.mutagen === '禄')
    if (tanLangHasLu) continue

    if (stars.includes('贪狼') && stars.includes('火星')) {
      return {
        name: '火贪格',
        level: '中格',
        description: '火星贪狼同在' + p.name + '，暴发型格局，可突然致富，但来得快去得也快',
        involvedStars: ['火星', '贪狼'],
        involvedPalaces: [p.name],
      }
    }
    if (stars.includes('贪狼') && stars.includes('铃星')) {
      return {
        name: '铃贪格',
        level: '中格',
        description: '铃星贪狼同在' + p.name + '，暴发型格局，可突然致富，但需防横破',
        involvedStars: ['铃星', '贪狼'],
        involvedPalaces: [p.name],
      }
    }
  }
  return null
}

function detect日照雷门(chart: ZiweiChart): DetectedPattern | null {
  // 太阳在午宫坐命
  const soul = getSoulPalace(chart)
  if (!soul) return null
  if (hasMajorStar(soul, '太阳') && soul.earthlyBranch === '午') {
    return {
      name: '日照雷门',
      level: '上格',
      description: '太阳在午宫坐命，日居正位，光辉万丈，贵显之格',
      involvedStars: ['太阳'],
      involvedPalaces: [soul.name],
    }
  }
  return null
}

function detect月朗天门(chart: ZiweiChart): DetectedPattern | null {
  // 太阴在亥宫坐命
  const soul = getSoulPalace(chart)
  if (!soul) return null
  if (hasMajorStar(soul, '太阴') && soul.earthlyBranch === '亥') {
    return {
      name: '月朗天门',
      level: '上格',
      description: '太阴在亥宫坐命，月居旺地，富贵清秀，女命尤佳',
      involvedStars: ['太阴'],
      involvedPalaces: [soul.name],
    }
  }
  return null
}

function detect紫微在午(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null
  if (hasMajorStar(soul, '紫微') && soul.earthlyBranch === '午' && !hasMajorStar(soul, '天府')) {
    return {
      name: '极向离明',
      level: '上格',
      description: '紫微在午宫坐命，帝星居正位，极贵之格，宜从政掌权',
      involvedStars: ['紫微'],
      involvedPalaces: [soul.name],
    }
  }
  return null
}

// ==================== 凶格检测 ====================

function detect羊陀夹命(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const [prev, next] = getAdjacentBranches(soul.earthlyBranch)
  const prevPalace = getPalaceByBranch(chart.palaces, prev)
  const nextPalace = getPalaceByBranch(chart.palaces, next)
  if (!prevPalace || !nextPalace) return null

  const prevHasYang = hasStar(prevPalace, '擎羊')
  const prevHasTuo = hasStar(prevPalace, '陀罗')
  const nextHasYang = hasStar(nextPalace, '擎羊')
  const nextHasTuo = hasStar(nextPalace, '陀罗')

  if ((prevHasYang && nextHasTuo) || (prevHasTuo && nextHasYang)) {
    return {
      name: '羊陀夹命',
      level: '凶格',
      description: '擎羊陀罗夹命宫，人生多刑克磨难，做事阻碍重重',
      involvedStars: ['擎羊', '陀罗'],
      involvedPalaces: [prevPalace.name, soul.name, nextPalace.name],
    }
  }
  return null
}

function detect空劫夹命(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const [prev, next] = getAdjacentBranches(soul.earthlyBranch)
  const prevPalace = getPalaceByBranch(chart.palaces, prev)
  const nextPalace = getPalaceByBranch(chart.palaces, next)
  if (!prevPalace || !nextPalace) return null

  const prevHasKong = hasStar(prevPalace, '地空')
  const prevHasJie = hasStar(prevPalace, '地劫')
  const nextHasKong = hasStar(nextPalace, '地空')
  const nextHasJie = hasStar(nextPalace, '地劫')

  if ((prevHasKong && nextHasJie) || (prevHasJie && nextHasKong)) {
    return {
      name: '空劫夹命',
      level: '凶格',
      description: '地空地劫夹命宫，钱财难聚，精神世界丰富但物质匮乏',
      involvedStars: ['地空', '地劫'],
      involvedPalaces: [prevPalace.name, soul.name, nextPalace.name],
    }
  }
  return null
}

function detect火铃夹命(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const [prev, next] = getAdjacentBranches(soul.earthlyBranch)
  const prevPalace = getPalaceByBranch(chart.palaces, prev)
  const nextPalace = getPalaceByBranch(chart.palaces, next)
  if (!prevPalace || !nextPalace) return null

  const prevHasHuo = hasStar(prevPalace, '火星')
  const prevHasLing = hasStar(prevPalace, '铃星')
  const nextHasHuo = hasStar(nextPalace, '火星')
  const nextHasLing = hasStar(nextPalace, '铃星')

  if ((prevHasHuo && nextHasLing) || (prevHasLing && nextHasHuo)) {
    return {
      name: '火铃夹命',
      level: '凶格',
      description: '火星铃星夹命宫，多灾多难，性格急躁易冲动',
      involvedStars: ['火星', '铃星'],
      involvedPalaces: [prevPalace.name, soul.name, nextPalace.name],
    }
  }
  return null
}

function detect命无正曜(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const hasMajor14 = soul.majorStars.some(s => MAJOR_14.includes(s.name))
  if (!hasMajor14) {
    // 对宫借星
    const oppBranch = BRANCHES[(BRANCHES.indexOf(soul.earthlyBranch) + 6) % 12]
    const oppPalace = getPalaceByBranch(chart.palaces, oppBranch)
    const borrowedStars = oppPalace ? majorStarNames(oppPalace).filter(s => MAJOR_14.includes(s)) : []

    return {
      name: '命无正曜',
      level: '下格',
      description: '命宫无十四主星，借对宫' + (borrowedStars.length ? borrowedStars.join('、') : '星') + '，性格多变不稳定，受环境影响大',
      involvedStars: borrowedStars,
      involvedPalaces: [soul.name, oppPalace?.name || ''].filter(Boolean),
    }
  }
  return null
}

function detect命里逢空(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const stars = allStarNames(soul)
  const hasKong = stars.includes('地空')
  const hasJie = stars.includes('地劫')

  if (hasKong && hasJie) {
    return {
      name: '命逢空劫',
      level: '凶格',
      description: '地空地劫同入命宫，钱财难守，但利于宗教哲学艺术',
      involvedStars: ['地空', '地劫'],
      involvedPalaces: [soul.name],
    }
  }
  return null
}

function detect马头带箭(chart: ZiweiChart): DetectedPattern | null {
  // 擎羊在午宫坐命（或天马+擎羊同宫坐命）
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const stars = allStarNames(soul)
  if (stars.includes('擎羊') && soul.earthlyBranch === '午') {
    return {
      name: '马头带箭',
      level: '中格',
      description: '擎羊在午宫坐命，武职贵格，军警法律界可大发，文人则多刑克',
      involvedStars: ['擎羊'],
      involvedPalaces: [soul.name],
    }
  }
  return null
}

function detect文星拱命(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const sfszPalaces = getSanFangSiZheng(chart.palaces, soul.earthlyBranch)
  const allStars: string[] = []
  for (const p of sfszPalaces) {
    allStars.push(...allStarNames(p))
  }

  const hasWenChang = allStars.includes('文昌')
  const hasWenQu = allStars.includes('文曲')

  if (hasWenChang && hasWenQu) {
    return {
      name: '文星拱命',
      level: '中格',
      description: '文昌文曲在命宫三方四正，聪明好学，利考试文艺',
      involvedStars: ['文昌', '文曲'],
      involvedPalaces: sfszPalaces.filter(p => hasStar(p, '文昌') || hasStar(p, '文曲')).map(p => p.name),
    }
  }
  return null
}

function detect左右夹命(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const [prev, next] = getAdjacentBranches(soul.earthlyBranch)
  const prevPalace = getPalaceByBranch(chart.palaces, prev)
  const nextPalace = getPalaceByBranch(chart.palaces, next)
  if (!prevPalace || !nextPalace) return null

  const hasZuoYou =
    (hasStar(prevPalace, '左辅') && hasStar(nextPalace, '右弼')) ||
    (hasStar(prevPalace, '右弼') && hasStar(nextPalace, '左辅'))

  if (hasZuoYou) {
    return {
      name: '左右夹命',
      level: '上格',
      description: '左辅右弼夹命宫，一生贵人相助，人缘极佳',
      involvedStars: ['左辅', '右弼'],
      involvedPalaces: [prevPalace.name, soul.name, nextPalace.name],
    }
  }
  return null
}

function detect昌曲夹命(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const [prev, next] = getAdjacentBranches(soul.earthlyBranch)
  const prevPalace = getPalaceByBranch(chart.palaces, prev)
  const nextPalace = getPalaceByBranch(chart.palaces, next)
  if (!prevPalace || !nextPalace) return null

  const hasCQ =
    (hasStar(prevPalace, '文昌') && hasStar(nextPalace, '文曲')) ||
    (hasStar(prevPalace, '文曲') && hasStar(nextPalace, '文昌'))

  if (hasCQ) {
    return {
      name: '昌曲夹命',
      level: '上格',
      description: '文昌文曲夹命宫，文采出众，利学业考试',
      involvedStars: ['文昌', '文曲'],
      involvedPalaces: [prevPalace.name, soul.name, nextPalace.name],
    }
  }
  return null
}

function detect日月反背(chart: ZiweiChart): DetectedPattern | null {
  const sunPalace = findStarPalace(chart.palaces, '太阳')
  const moonPalace = findStarPalace(chart.palaces, '太阴')
  if (!sunPalace || !moonPalace) return null

  // 太阳在夜间位（戌亥子，太阳失辉），太阴在日间位（辰巳午，太阴失辉）
  const sunInNight = ['戌', '亥', '子'].includes(sunPalace.earthlyBranch)
  const moonInDay = ['辰', '巳', '午'].includes(moonPalace.earthlyBranch)

  if (sunInNight && moonInDay) {
    return {
      name: '日月反背',
      level: '下格',
      description: '太阳在夜间位、太阴在日间位，日月皆失辉，一生辛劳，成就较难',
      involvedStars: ['太阳', '太阴'],
      involvedPalaces: [sunPalace.name, moonPalace.name],
    }
  }
  return null
}

function detect煞聚命宫(chart: ZiweiChart): DetectedPattern | null {
  const soul = getSoulPalace(chart)
  if (!soul) return null

  const stars = allStarNames(soul)
  const shaInSoul = SHA_STARS.filter(s => stars.includes(s))

  if (shaInSoul.length >= 2) {
    return {
      name: '煞聚命宫',
      level: '凶格',
      description: shaInSoul.join('、') + '聚于命宫，人生多灾厄磨难，需注意健康安全',
      involvedStars: shaInSoul,
      involvedPalaces: [soul.name],
    }
  }
  return null
}

// ==================== Main Detection Function ====================

export function detectPatterns(chart: ZiweiChart): DetectedPattern[] {
  const detectors = [
    // 上格
    detect紫府同宫,
    detect日月并明,
    detect明珠出海,
    detect府相朝垣,
    detect禄马交驰,
    detect三奇嘉会,
    detect日照雷门,
    detect月朗天门,
    detect紫微在午,
    detect左右夹命,
    detect昌曲夹命,
    // 中格
    detect机月同梁,
    detect杀破狼,
    detect石中隐玉,
    detect火贪格,
    detect马头带箭,
    detect文星拱命,
    // 下格/凶格
    detect命无正曜,
    detect日月反背,
    detect羊陀夹命,
    detect空劫夹命,
    detect火铃夹命,
    detect命里逢空,
    detect煞聚命宫,
  ]

  const patterns: DetectedPattern[] = []
  for (const detect of detectors) {
    const result = detect(chart)
    if (result) patterns.push(result)
  }

  // Sort: 上格 first, then 中格, 下格, 凶格
  const levelOrder: Record<string, number> = { '上格': 0, '中格': 1, '下格': 2, '凶格': 3 }
  patterns.sort((a, b) => (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99))

  return patterns
}
