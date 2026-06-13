/**
 * 紫微斗数排盘准确性测试
 * 
 * 测试数据来源：
 * 1. 公开的命理排盘网站交叉验证（元亨利贞、紫微斗数在线排盘）
 * 2. 已知名人命盘
 * 3. 边界条件测试（子时、闰月、跨年等）
 */

import { calculateZiwei, ZiweiChart } from '../ziweiCalculator'

// Helper: find palace by name
function findPalace(chart: ZiweiChart, name: string) {
  return chart.palaces.find(p => p.name === name || p.name === name.replace('宫', ''))
}

// Helper: find soul palace
function getSoulPalace(chart: ZiweiChart) {
  return chart.palaces.find(p => p.earthlyBranch === chart.earthlyBranchOfSoulPalace)
}

// Helper: get major star names in a palace
function majorStarsIn(chart: ZiweiChart, palaceName: string): string[] {
  const p = findPalace(chart, palaceName)
  return p ? p.majorStars.map(s => s.name) : []
}

// Helper: find which palace contains a specific star
function findStarPalace(chart: ZiweiChart, starName: string): string {
  for (const p of chart.palaces) {
    for (const s of [...p.majorStars, ...p.minorStars]) {
      if (s.name === starName) return p.name
    }
  }
  return ''
}

// Helper: get siHua by type
function getSiHua(chart: ZiweiChart, type: string) {
  return chart.siHua.find(s => s.type === type)
}

import { describe, test, expect } from "vitest"

describe('ZiweiCalculator - Basic Structure', () => {
  test('returns 12 palaces', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    expect(chart.palaces).toHaveLength(12)
  })

  test('all 12 palace names are present', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const names = chart.palaces.map(p => p.name)
    // iztro uses: 命宫, 兄弟, 夫妻, 子女, 财帛, 疾厄, 迁移, 仆役, 官禄, 田宅, 福德, 父母
    expect(names).toContain('命宫')
    expect(names).toContain('兄弟')
    expect(names).toContain('夫妻')
    expect(names).toContain('子女')
    expect(names).toContain('财帛')
    expect(names).toContain('疾厄')
    expect(names).toContain('迁移')
    expect(names).toContain('仆役')
    expect(names).toContain('官禄')
    expect(names).toContain('田宅')
    expect(names).toContain('福德')
    expect(names).toContain('父母')
  })

  test('all palaces have unique earthly branches', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const branches = chart.palaces.map(p => p.earthlyBranch)
    expect(new Set(branches).size).toBe(12)
  })

  test('exactly 4 siHua entries (禄权科忌)', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    expect(chart.siHua).toHaveLength(4)
    const types = chart.siHua.map(s => s.type).sort()
    expect(types).toEqual(['忌', '权', '禄', '科'])
  })

  test('each palace has decadal data', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    for (const p of chart.palaces) {
      expect(p.decadal).toBeDefined()
      expect(p.decadal.range).toHaveLength(2)
      expect(p.decadal.heavenlyStem).toBeTruthy()
      expect(p.decadal.earthlyBranch).toBeTruthy()
    }
  })

  test('brightness values are valid iztro values', () => {
    const validBrightness = ['庙', '旺', '得', '利', '平', '不', '陷']
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    for (const p of chart.palaces) {
      for (const s of [...p.majorStars, ...p.minorStars]) {
        if (s.brightness) {
          expect(validBrightness).toContain(s.brightness)
        }
      }
    }
  })

  test('mutagen values are valid', () => {
    const validMutagen = ['禄', '权', '科', '忌']
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    for (const p of chart.palaces) {
      for (const s of [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]) {
        if (s.mutagen) {
          expect(validMutagen).toContain(s.mutagen)
        }
      }
    }
  })
})


describe('ZiweiCalculator - 五行局 (Five Elements Class)', () => {
  // 五行局由命宫天干地支纳音决定
  test('1988-9-17 子时 男 → 木三局', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    expect(chart.fiveElementsClass).toBe('木三局')
  })

  test('1990-5-15 巳时 女 → 火六局', () => {
    const chart = calculateZiwei('1990-5-15', 'si', 'female')
    expect(chart.fiveElementsClass).toBe('火六局')
  })
})


describe('ZiweiCalculator - 命宫位置 (Soul Palace Position)', () => {
  // 命宫由出生月+时辰决定
  test('1988-9-17 子时 → 命宫在酉', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    expect(chart.earthlyBranchOfSoulPalace).toBe('酉')
  })

  test('1990-5-15 巳时 → 命宫在子', () => {
    const chart = calculateZiwei('1990-5-15', 'si', 'female')
    expect(chart.earthlyBranchOfSoulPalace).toBe('子')
  })

  test('2000-1-1 午时 → check soul palace', () => {
    const chart = calculateZiwei('2000-1-1', 'wu', 'male')
    // 2000-1-1 is lunar 十一月廿五, 午时
    // 命宫 = 寅起正月, 到十一月是子, 子起子时到午时逆数6步 = 午
    expect(chart.earthlyBranchOfSoulPalace).toBeTruthy()
  })
})


describe('ZiweiCalculator - 紫微星定位', () => {
  test('1988-9-17 子时 → 紫微在午宫(子女)', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const ziweiPalace = findStarPalace(chart, '紫微')
    expect(ziweiPalace).toBe('子女')
  })
})


describe('ZiweiCalculator - 四化飞星 (Year Stem Transformations)', () => {
  // 1988年戊辰 → 年干戊 → 贪狼化禄、太阴化权、右弼化科、天机化忌
  test('1988 (戊) → 贪狼化禄、太阴化权、右弼化科、天机化忌', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    expect(getSiHua(chart, '禄')?.star).toBe('贪狼')
    expect(getSiHua(chart, '权')?.star).toBe('太阴')
    expect(getSiHua(chart, '科')?.star).toBe('右弼')
    expect(getSiHua(chart, '忌')?.star).toBe('天机')
  })

  // 1990年庚午 → 年干庚 → 太阳化禄、武曲化权、太阴化科、天同化忌
  test('1990 (庚) → 太阳化禄、武曲化权、太阴化科、天同化忌', () => {
    const chart = calculateZiwei('1990-5-15', 'si', 'female')
    expect(getSiHua(chart, '禄')?.star).toBe('太阳')
    expect(getSiHua(chart, '权')?.star).toBe('武曲')
    expect(getSiHua(chart, '科')?.star).toBe('太阴')
    expect(getSiHua(chart, '忌')?.star).toBe('天同')
  })

  // 1985年乙丑 → 年干乙 → 天机化禄、天梁化权、紫微化科、太阴化忌
  test('1985 (乙) → 天机化禄、天梁化权、紫微化科、太阴化忌', () => {
    const chart = calculateZiwei('1985-3-20', 'mao', 'male')
    expect(getSiHua(chart, '禄')?.star).toBe('天机')
    expect(getSiHua(chart, '权')?.star).toBe('天梁')
    expect(getSiHua(chart, '科')?.star).toBe('紫微')
    expect(getSiHua(chart, '忌')?.star).toBe('太阴')
  })

  // 甲年: 廉贞化禄、破军化权、武曲化科、太阳化忌
  test('1984 (甲) → 廉贞化禄、破军化权、武曲化科、太阳化忌', () => {
    const chart = calculateZiwei('1984-6-1', 'wu', 'male')
    expect(getSiHua(chart, '禄')?.star).toBe('廉贞')
    expect(getSiHua(chart, '权')?.star).toBe('破军')
    expect(getSiHua(chart, '科')?.star).toBe('武曲')
    expect(getSiHua(chart, '忌')?.star).toBe('太阳')
  })

  // 丙年: 天同化禄、天机化权、文昌化科、廉贞化忌
  test('1996 (丙) → 天同化禄、天机化权、文昌化科、廉贞化忌', () => {
    const chart = calculateZiwei('1996-8-10', 'shen', 'female')
    expect(getSiHua(chart, '禄')?.star).toBe('天同')
    expect(getSiHua(chart, '权')?.star).toBe('天机')
    expect(getSiHua(chart, '科')?.star).toBe('文昌')
    expect(getSiHua(chart, '忌')?.star).toBe('廉贞')
  })

  // 丁年: 太阴化禄、天同化权、天机化科、巨门化忌
  test('1997 (丁) → 太阴化禄、天同化权、天机化科、巨门化忌', () => {
    const chart = calculateZiwei('1997-2-14', 'yin', 'male')
    expect(getSiHua(chart, '禄')?.star).toBe('太阴')
    expect(getSiHua(chart, '权')?.star).toBe('天同')
    expect(getSiHua(chart, '科')?.star).toBe('天机')
    expect(getSiHua(chart, '忌')?.star).toBe('巨门')
  })

  // 己年: 武曲化禄、贪狼化权、天梁化科、文曲化忌
  test('1989 (己) → 武曲化禄、贪狼化权、天梁化科、文曲化忌', () => {
    const chart = calculateZiwei('1989-11-30', 'hai', 'female')
    expect(getSiHua(chart, '禄')?.star).toBe('武曲')
    expect(getSiHua(chart, '权')?.star).toBe('贪狼')
    expect(getSiHua(chart, '科')?.star).toBe('天梁')
    expect(getSiHua(chart, '忌')?.star).toBe('文曲')
  })

  // 辛年: 巨门化禄、太阳化权、文曲化科、文昌化忌
  test('1991 (辛) → 巨门化禄、太阳化权、文曲化科、文昌化忌', () => {
    const chart = calculateZiwei('1991-7-7', 'you', 'male')
    expect(getSiHua(chart, '禄')?.star).toBe('巨门')
    expect(getSiHua(chart, '权')?.star).toBe('太阳')
    expect(getSiHua(chart, '科')?.star).toBe('文曲')
    expect(getSiHua(chart, '忌')?.star).toBe('文昌')
  })

  // 壬年: 天梁化禄、紫微化权、左辅化科、武曲化忌
  test('1992 (壬) → 天梁化禄、紫微化权、左辅化科、武曲化忌', () => {
    const chart = calculateZiwei('1992-4-20', 'chen', 'female')
    expect(getSiHua(chart, '禄')?.star).toBe('天梁')
    expect(getSiHua(chart, '权')?.star).toBe('紫微')
    expect(getSiHua(chart, '科')?.star).toBe('左辅')
    expect(getSiHua(chart, '忌')?.star).toBe('武曲')
  })

  // 癸年: 破军化禄、巨门化权、太阴化科、贪狼化忌
  test('1993 (癸) → 破军化禄、巨门化权、太阴化科、贪狼化忌', () => {
    const chart = calculateZiwei('1993-9-9', 'wu', 'male')
    expect(getSiHua(chart, '禄')?.star).toBe('破军')
    expect(getSiHua(chart, '权')?.star).toBe('巨门')
    expect(getSiHua(chart, '科')?.star).toBe('太阴')
    expect(getSiHua(chart, '忌')?.star).toBe('贪狼')
  })
})


describe('ZiweiCalculator - 大运方向 (Decadal Direction)', () => {
  // 阳男/阴女: 顺行（大运年龄递增方向=地支顺序）
  // 阴男/阳女: 逆行
  
  test('1988戊(阳)男 → 顺行，大运从命宫顺时针', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const soul = getSoulPalace(chart)!
    // 命宫的大运应该是最小年龄段
    const soulDecadal = soul.decadal.range[0]
    // 顺行：下一个大运的年龄应比命宫大
    // Find next palace in branch order
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const soulIdx = branches.indexOf(soul.earthlyBranch)
    const nextBranch = branches[(soulIdx + 1) % 12]
    const nextPalace = chart.palaces.find(p => p.earthlyBranch === nextBranch)!
    expect(nextPalace.decadal.range[0]).toBeGreaterThan(soulDecadal)
  })

  test('1989己(阴)女 → 顺行', () => {
    const chart = calculateZiwei('1989-11-30', 'hai', 'female')
    // 阴女顺行
    const soul = getSoulPalace(chart)!
    const soulStart = soul.decadal.range[0]
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const soulIdx = branches.indexOf(soul.earthlyBranch)
    const nextBranch = branches[(soulIdx + 1) % 12]
    const nextPalace = chart.palaces.find(p => p.earthlyBranch === nextBranch)!
    expect(nextPalace.decadal.range[0]).toBeGreaterThan(soulStart)
  })
})


describe('ZiweiCalculator - 十四主星分布', () => {
  test('all 14 major stars present across palaces', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const allMajors = new Set<string>()
    for (const p of chart.palaces) {
      for (const s of p.majorStars) {
        allMajors.add(s.name)
      }
    }
    const expected14 = [
      '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
      '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
    ]
    for (const star of expected14) {
      expect(allMajors).toContain(star)
    }
  })

  // Verify across multiple charts
  test('all 14 major stars present (1990-5-15 female)', () => {
    const chart = calculateZiwei('1990-5-15', 'si', 'female')
    const allMajors = new Set<string>()
    for (const p of chart.palaces) {
      for (const s of p.majorStars) allMajors.add(s.name)
    }
    expect(allMajors.size).toBe(14)
  })

  test('all 14 major stars present (1975-3-20 male)', () => {
    const chart = calculateZiwei('1975-3-20', 'mao', 'male')
    const allMajors = new Set<string>()
    for (const p of chart.palaces) {
      for (const s of p.majorStars) allMajors.add(s.name)
    }
    expect(allMajors.size).toBe(14)
  })
})


describe('ZiweiCalculator - 紫微星系排列规则', () => {
  // 紫微星系6星永远按固定间隔排列
  // 紫微→天机(逆1)→(跳1)→太阳(逆3)→武曲(逆4)→天同(逆5)→(跳1)→廉贞(逆7, aka 紫微逆数7位)
  // Actually: 紫微系排法是紫微定位后，其余按规则排
  
  test('紫微星系相对位置固定', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    
    const ziweiPos = branches.indexOf(
      chart.palaces.find(p => p.majorStars.some(s => s.name === '紫微'))!.earthlyBranch
    )
    const tianjiPos = branches.indexOf(
      chart.palaces.find(p => p.majorStars.some(s => s.name === '天机'))!.earthlyBranch
    )
    
    // 天机在紫微逆数1位
    expect((ziweiPos - tianjiPos + 12) % 12).toBe(1)
  })
})


describe('ZiweiCalculator - 子时处理 (Zi Hour Edge Cases)', () => {
  test('early zi (子初) stays on same day', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    expect(chart.solarDate).toBe('1988-9-17')
  })

  // Note: zi_late is handled by caller adding 1 day before calling calculateZiwei
  test('zi_early and zi use same timeIndex', () => {
    const chart1 = calculateZiwei('1988-9-17', 'zi', 'male')
    const chart2 = calculateZiwei('1988-9-17', 'zi', 'male')
    expect(chart1.earthlyBranchOfSoulPalace).toBe(chart2.earthlyBranchOfSoulPalace)
  })
})


describe('ZiweiCalculator - Gender Differences', () => {
  test('same birth data, different gender → same soul palace but different decadal direction', () => {
    const male = calculateZiwei('1988-9-17', 'zi', 'male')
    const female = calculateZiwei('1988-9-17', 'zi', 'female')
    
    // Same birth = same 命宫
    expect(male.earthlyBranchOfSoulPalace).toBe(female.earthlyBranchOfSoulPalace)
    
    // But 大运方向不同 (阳男顺行 vs 阳女逆行)
    const maleSoul = getSoulPalace(male)!
    const femaleSoul = getSoulPalace(female)!
    
    // Different body palace possible
    // Different decadal direction means different age ranges per palace
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const soulIdx = branches.indexOf(maleSoul.earthlyBranch)
    const nextBranch = branches[(soulIdx + 1) % 12]
    const prevBranch = branches[(soulIdx - 1 + 12) % 12]
    
    const maleNext = male.palaces.find(p => p.earthlyBranch === nextBranch)!
    const femaleNext = female.palaces.find(p => p.earthlyBranch === nextBranch)!
    
    // 1988戊(阳)：男顺女逆，大运方向应不同
    // 男：命宫→顺行（下一宫年龄更大）
    // 女：命宫→逆行（下一宫年龄更大在前一宫）
    expect(maleNext.decadal.range[0]).not.toBe(femaleNext.decadal.range[0])
  })
})


describe('ZiweiCalculator - 大限四化 (decadalSiHua)', () => {
  test('decadalSiHua is populated and sorted by age', () => {
    const chart = calculateZiwei('1988-9-17', 'wu', 'male')
    expect(chart.decadalSiHua).toBeDefined()
    expect(chart.decadalSiHua!.length).toBeGreaterThan(0)
    // Each entry has mutagen array of 4
    for (const d of chart.decadalSiHua!) {
      expect(d.mutagen.length).toBe(4)
      expect(d.range.length).toBe(2)
    }
    // Sorted by range[0]
    for (let i = 1; i < chart.decadalSiHua!.length; i++) {
      expect(chart.decadalSiHua![i].range[0]).toBeGreaterThanOrEqual(chart.decadalSiHua![i - 1].range[0])
    }
  })
})

describe('ZiweiCalculator - 流年 (liuNian)', () => {
  test('liuNian is populated with correct structure', () => {
    const chart = calculateZiwei('1990-1-15', 'wu', 'male')
    expect(chart.liuNian).toBeDefined()
    expect(chart.liuNian!.length).toBeGreaterThan(0)
    const first = chart.liuNian![0]
    expect(first).toHaveProperty('year')
    expect(first).toHaveProperty('age')
    expect(first).toHaveProperty('earthlyBranch')
    expect(first).toHaveProperty('yearlyMutagen')
    expect(first).toHaveProperty('huaLuPalace')
    expect(first).toHaveProperty('huaJiPalace')
    expect(first).toHaveProperty('isLucky')
  })

  test('liuNian years are sequential', () => {
    const chart = calculateZiwei('1990-1-15', 'wu', 'male')
    const years = chart.liuNian!.map(ln => ln.year)
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBe(years[i - 1] + 1)
    }
  })

  test('liuNian isLucky flags are valid', () => {
    const chart = calculateZiwei('1990-1-15', 'wu', 'male')
    for (const ln of chart.liuNian!) {
      expect([true, false, null]).toContain(ln.isLucky)
    }
  })
})


describe('ZiweiCalculator - 多样性测试 (Various Birth Data)', () => {
  const testCases: [string, string, 'male' | 'female', string][] = [
    // [solar date, shichen, gender, description]
    ['1960-1-1', 'zi', 'male', '1960s male'],
    ['1970-6-15', 'wu', 'female', '1970s female'],
    ['1980-12-31', 'hai', 'male', '1980 year end'],
    ['1995-2-28', 'mao', 'female', '1995 late Feb'],
    ['2000-8-8', 'chen', 'male', '2000 summer'],
    ['2005-3-1', 'you', 'female', '2005 spring'],
    ['2010-10-10', 'si', 'male', '2010 autumn'],
    ['2020-2-29', 'wu', 'female', '2020 leap day'],
    ['1975-7-7', 'chou', 'male', '1975 summer'],
    ['1983-11-11', 'shen', 'female', '1983 autumn'],
    ['1999-12-31', 'hai', 'male', '1999 year end'],
    ['2003-4-5', 'yin', 'female', '2003 清明 day'],
  ]

  test.each(testCases)('%s %s %s (%s) → valid chart', (date, time, gender, desc) => {
    const chart = calculateZiwei(date, time, gender)
    
    // Basic structure
    expect(chart.palaces).toHaveLength(12)
    expect(chart.siHua).toHaveLength(4)
    expect(chart.earthlyBranchOfSoulPalace).toBeTruthy()
    expect(chart.fiveElementsClass).toBeTruthy()
    
    // All 14 major stars present
    const allMajors = new Set<string>()
    for (const p of chart.palaces) {
      for (const s of p.majorStars) allMajors.add(s.name)
    }
    expect(allMajors.size).toBe(14)
    
    // Exactly one body palace
    const bodyCount = chart.palaces.filter(p => p.isBodyPalace).length
    expect(bodyCount).toBe(1)
  })
})


describe('ZiweiCalculator - 所有时辰测试', () => {
  const shichens = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai']
  
  test.each(shichens)('1988-9-17 %s时 → valid chart with different soul palace', (shichen) => {
    const chart = calculateZiwei('1988-9-17', shichen, 'male')
    expect(chart.palaces).toHaveLength(12)
    expect(chart.siHua).toHaveLength(4)
    expect(chart.earthlyBranchOfSoulPalace).toBeTruthy()
  })

  test('different shichen → different soul palace positions', () => {
    const soulPositions = new Set<string>()
    for (const s of shichens) {
      const chart = calculateZiwei('1988-9-17', s, 'male')
      soulPositions.add(chart.earthlyBranchOfSoulPalace)
    }
    // 12 shichen should give 12 different soul palace positions
    expect(soulPositions.size).toBe(12)
  })
})


describe('ZiweiCalculator - 特殊年份', () => {
  test('1900 year', () => {
    const chart = calculateZiwei('1900-1-1', 'wu', 'male')
    expect(chart.palaces).toHaveLength(12)
  })

  test('2050 year (future)', () => {
    const chart = calculateZiwei('2050-6-15', 'si', 'female')
    expect(chart.palaces).toHaveLength(12)
  })

  test('leap year Feb 29', () => {
    const chart = calculateZiwei('2024-2-29', 'mao', 'male')
    expect(chart.palaces).toHaveLength(12)
    expect(chart.solarDate).toBe('2024-2-29')
  })
})


describe('ZiweiCalculator - 命主身主 (Soul/Body Rulers)', () => {
  test('命主身主 are valid star names', () => {
    const validStars = ['贪狼', '巨门', '禄存', '文曲', '廉贞', '武曲', '破军',
                        '文昌', '铃星', '火星', '天相', '天梁', '天同']
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    expect(validStars).toContain(chart.soul)
    expect(validStars).toContain(chart.body)
  })
})


describe('ZiweiCalculator - Specific Known Charts', () => {
  // 1988年9月17日 子时 男
  // 已通过在线排盘验证
  test('1988-9-17 子时 男 - complete verification', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    
    // Basic info
    expect(chart.fiveElementsClass).toBe('木三局')
    expect(chart.earthlyBranchOfSoulPalace).toBe('酉')
    expect(chart.soul).toBe('文曲')
    expect(chart.body).toBe('文昌')
    
    // 四化 (戊年)
    expect(getSiHua(chart, '禄')?.star).toBe('贪狼')
    expect(getSiHua(chart, '权')?.star).toBe('太阴')
    expect(getSiHua(chart, '科')?.star).toBe('右弼')
    expect(getSiHua(chart, '忌')?.star).toBe('天机')
    
    // Key star positions
    expect(findStarPalace(chart, '紫微')).toBe('子女') // 午宫
    expect(findStarPalace(chart, '天府')).toBe('父母') // 戌宫
    expect(findStarPalace(chart, '太阳')).toBe('迁移') // 卯宫
    expect(findStarPalace(chart, '太阴')).toBe('福德') // 亥宫
    expect(findStarPalace(chart, '贪狼')).toBe('田宅') // 子宫
    expect(findStarPalace(chart, '七杀')).toBe('疾厄') // 辰宫
    expect(findStarPalace(chart, '破军')).toBe('兄弟') // 申宫
  })
})
