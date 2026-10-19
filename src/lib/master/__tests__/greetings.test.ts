import { describe, it, expect } from 'vitest'
import {
  renderGreeting,
  computeTemporalInsight,
  formatDayMaster,
  formatRecentTopic,
} from '../greetings'

const TEMPORAL = {
  dayGanZhi: '癸亥',
  jieQi: '清明',
  yearGanZhi: '丙午',
}

describe('renderGreeting — State 1 (first-time user)', () => {
  it('returns State 1 when user has no readings (zh-TW)', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: false,
    })
    expect(result.state).toBe(1)
    // Hook line draws the user in before the master introduces themselves;
    // the hook references 玄機 reflexively so it ties to the next line.
    expect(result.text).toContain('一念既起，玄機已現')
    expect(result.text).toContain('吾名玄機')
    expect(result.text).toContain('八字或紫微')
    expect(result.text).toContain('起一卦')
    // Two-path closer ends in a question mark
    expect(result.text.trimEnd().endsWith('？')).toBe(true)
    // Forbidden anti-patterns
    expect(result.text).not.toContain('您好')
    expect(result.text).not.toContain('歡迎')
    expect(result.text).not.toContain('很高興')
    expect(result.text).not.toContain('星辰')
    // Suggestions present
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions.length).toBeLessThanOrEqual(4)
  })

  it('returns State 1 when user has no readings (en)', () => {
    const result = renderGreeting({
      lang: 'en',
      hasReadings: false,
    })
    expect(result.state).toBe(1)
    expect(result.text).toContain('My name is Xuanji')
    expect(result.text.toLowerCase()).toContain('thought')
    expect(result.text).toMatch(/BaZi or Zi Wei/i)
    expect(result.text).toContain('hexagram')
    // Forbidden anti-patterns
    expect(result.text.toLowerCase()).not.toContain('welcome to')
    expect(result.text.toLowerCase()).not.toContain('happy to help')
    expect(result.text.toLowerCase()).not.toContain('let me know')
  })
})

describe('renderGreeting — State 2 (returning user)', () => {
  it('renders the agent-dashboard opener + destiny charts + temporal context (zh-TW)', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
      readingTypeCounts: { bazi: 22, ziwei: 20, qimen: 11 },
      temporalContext: TEMPORAL,
    })
    expect(result.state).toBe(2)
    // Self-introduction opener — one of five randomized variants. All start
    // with the same self-naming clause.
    expect(result.text).toMatch(/^吾名玄機/)
    // Destiny charts shown under 命盤
    expect(result.text).toContain('· 命盤')
    expect(result.text).toContain('八字')
    expect(result.text).toContain('紫微')
    // Oracle cast types (奇門) must be filtered OUT — they're events, not state
    expect(result.text).not.toContain('奇門')
    // Temporal context bullets
    expect(result.text).toContain('· 今日')
    expect(result.text).toContain('癸亥日')
    expect(result.text).toContain('清明')
    expect(result.text).toContain('· 流年')
    expect(result.text).toContain('丙午')
    // Legacy "last cast" line must be gone
    expect(result.text).not.toContain('· 最近')
    expect(result.text).not.toContain('4月8日')
    // Closing CTA — one of six randomized variants. All end with a Chinese
    // question mark and either name 命/命理 or 卦. Just check the trailing
    // punctuation is the question form, not the old fixed text.
    expect(result.text.trimEnd().endsWith('？')).toBe(true)
  })

  it('renders en version with temporal context', () => {
    const result = renderGreeting({
      lang: 'en',
      hasReadings: true,
      lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
      readingTypeCounts: { bazi: 22, ziwei: 20 },
      temporalContext: TEMPORAL,
    })
    expect(result.state).toBe(2)
    expect(result.text).toMatch(/^My name is Xuanji/)
    expect(result.text).toContain('· Charts')
    expect(result.text).toContain('BaZi')
    expect(result.text).toContain('Zi Wei')
    expect(result.text).toContain('and')
    // Temporal context uses hanzi (not pinyin) by design
    expect(result.text).toContain('· Today')
    expect(result.text).toContain('癸亥日')
    expect(result.text).toContain('清明')
    expect(result.text).toContain('· Annual')
    expect(result.text).toContain('丙午')
  })

  it('omits 命盤 bullet when user has no destiny charts (only oracle casts)', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: { type: 'iching', createdAt: '2026-04-08T10:00:00Z' },
      readingTypeCounts: { iching: 3, meihua: 2 },
      temporalContext: TEMPORAL,
    })
    expect(result.state).toBe(2)
    expect(result.text).toMatch(/^吾名玄機/)
    // No 命盤 bullet because user has no destiny charts on file
    expect(result.text).not.toContain('· 命盤')
    // Oracle types never leak into the 命盤 line
    expect(result.text).not.toContain('易經')
    expect(result.text).not.toContain('梅花')
    // Temporal block still shows — it's global state, not user-specific
    expect(result.text).toContain('· 今日')
    expect(result.text).toContain('· 流年')
  })

  it('falls back to opener + CTA when nothing populates (edge case)', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: null,
      readingTypeCounts: {},
      temporalContext: null,
    })
    expect(result.state).toBe(2)
    expect(result.text).toMatch(/^吾名玄機/)
    expect(result.text.trimEnd().endsWith('？')).toBe(true)
    // No status bullets when neither charts nor temporal context is available
    expect(result.text).not.toContain('· 命盤')
    expect(result.text).not.toContain('· 今日')
    expect(result.text).not.toContain('· 流年')
  })

  it('orders destiny types by descending count', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: null,
      readingTypeCounts: { ziwei: 5, bazi: 50 },
      temporalContext: null,
    })
    const baziIdx = result.text.indexOf('八字')
    const ziweiIdx = result.text.indexOf('紫微')
    expect(baziIdx).toBeGreaterThanOrEqual(0)
    expect(ziweiIdx).toBeGreaterThan(baziIdx)
  })
})

describe('renderGreeting — anti-pattern guards', () => {
  it('never includes mystical-fake language in any state', () => {
    const states = [
      renderGreeting({ lang: 'zh-TW', hasReadings: false }),
      renderGreeting({
        lang: 'zh-TW',
        hasReadings: true,
        lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
        readingTypeCounts: { bazi: 5 },
        temporalContext: TEMPORAL,
      }),
    ]
    for (const s of states) {
      expect(s.text).not.toContain('星辰')
      expect(s.text).not.toContain('指引')
      expect(s.text).not.toContain('神秘')
      expect(s.text).not.toContain('命運的')
    }
  })

  it('never references tool names', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
      readingTypeCounts: { bazi: 5 },
      temporalContext: TEMPORAL,
    })
    expect(result.text).not.toContain('get_reading')
    expect(result.text).not.toContain('list_readings')
    expect(result.text).not.toContain('tool')
    expect(result.text).not.toContain('工具')
  })
})

describe('computeTemporalInsight', () => {
  it('maps wood stems (甲, 乙) to wood insight', () => {
    expect(computeTemporalInsight('甲子', '春分', 'zh-TW')).toContain('青陽敷榮')
    expect(computeTemporalInsight('乙丑', '春分', 'en')).toContain('Wood Qi')
  })

  it('maps fire stems (丙, 丁) to fire insight', () => {
    expect(computeTemporalInsight('丙寅', '夏至', 'zh-TW')).toContain('離明當運')
    expect(computeTemporalInsight('丁卯', '夏至', 'en')).toContain('Fire Qi')
  })

  it('maps earth stems (戊, 己) to earth insight', () => {
    expect(computeTemporalInsight('戊辰', '立夏', 'zh-TW')).toContain('土厚德聚')
    expect(computeTemporalInsight('己巳', '立夏', 'en')).toContain('Earth Qi')
  })

  it('maps metal stems (庚, 辛) to metal insight', () => {
    expect(computeTemporalInsight('庚午', '秋分', 'zh-TW')).toContain('秋氣肅成')
    expect(computeTemporalInsight('辛未', '秋分', 'en')).toContain('Metal Qi')
  })

  it('maps water stems (壬, 癸) to water insight', () => {
    expect(computeTemporalInsight('壬申', '冬至', 'zh-TW')).toContain('水德善柔')
    expect(computeTemporalInsight('癸酉', '冬至', 'en')).toContain('Water Qi')
  })

  it('returns harmonious cosmic fallback when dayGanZhi is empty or unknown', () => {
    expect(computeTemporalInsight('', '清明', 'zh-TW')).toContain('四時循序')
    expect(computeTemporalInsight(null, '清明', 'en')).toContain('cosmic seasons')
  })
})

describe('formatDayMaster', () => {
  it('formats single-character stems to five-element day master badge', () => {
    expect(formatDayMaster('庚', 'zh-TW')).toBe('庚金')
    expect(formatDayMaster('庚', 'en')).toBe('Geng Metal')
    expect(formatDayMaster('甲', 'zh-TW')).toBe('甲木')
    expect(formatDayMaster('癸', 'zh-TW')).toBe('癸水')
  })

  it('preserves multi-character strings when passed', () => {
    expect(formatDayMaster('庚金', 'zh-TW')).toBe('庚金')
  })
})

describe('formatRecentTopic', () => {
  it('formats topic keys into dignified metaphysical domain titles', () => {
    expect(formatRecentTopic('career', 'zh-TW')).toBe('事業轉機')
    expect(formatRecentTopic('career', 'en')).toBe('Career & Ambition')
    expect(formatRecentTopic('wealth', 'zh-TW')).toBe('財富運勢')
    expect(formatRecentTopic('marriage', 'zh-TW')).toBe('婚姻感情')
  })
})
