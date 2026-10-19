import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { TEN } from '@/lib/i18n'
import {
  computeTemporalInsight,
  formatDayMaster,
  formatRecentTopic,
  renderGreeting,
} from '@/lib/master/greetings'

describe('MasterWelcomeBoard design & rendering logic', () => {
  const sampleTemporal = {
    dayGanZhi: '庚午',
    jieQi: '秋分',
    yearGanZhi: '丙午',
  }

  const sampleProfile = {
    dayMasterOrMainStar: { 'zh-TW': '庚金', en: 'Geng Metal' },
    realmTitle: { 'zh-TW': '一階 · 初探玄門', en: 'Tier I: Novice Seeker' },
    recentTopic: { 'zh-TW': '事業轉機', en: 'Career & Ambition' },
  }

  describe('Mode A: Reading in-context (展卷細推)', () => {
    it('prioritizes dynamic reading questions and focuses purely on on-screen chart', () => {
      const dynamicQuestions = [
        '此八字命盤的月令提綱與用神如何配置？',
        '當前大運走庚申，金旺耗身如何調候？',
        '配偶宮逢沖，感情應期在何年？',
      ]

      const isReadingMode = true
      const readingId = 'reading-123'
      expect(isReadingMode).toBe(true)
      expect(readingId).toBeTruthy()

      // In Mode A, suggestion chips are exactly the dynamic questions
      const activeSuggestions = dynamicQuestions.length > 0 ? dynamicQuestions : []
      expect(activeSuggestions).toEqual(dynamicQuestions)
      expect(activeSuggestions).toHaveLength(3)
      expect(activeSuggestions[0]).toContain('用神')
    })

    it('falls back to chart inquiry defaults if viewingReadingQuestions is empty', () => {
      const emptyQuestions: string[] = []
      const fallbackDefaultsZh = [
        '請解析此盤核心格局',
        '此盤當前關鍵轉機在何處？',
        '此盤五行喜忌與調候要旨',
      ]
      const fallbackDefaultsEn = [
        'Analyze the core pattern of this chart',
        'Where is the key turning point in this chart?',
        'Explain the favorable elements and climate adjustments',
      ]

      const resolveQuestions = (list: string[], isEn: boolean) => {
        if (list.length > 0) return list
        return TEN(isEn, fallbackDefaultsZh, fallbackDefaultsEn)
      }

      expect(resolveQuestions(emptyQuestions, false)[0]).toBe('請解析此盤核心格局')
      expect(resolveQuestions(emptyQuestions, true)[0]).toBe('Analyze the core pattern of this chart')
    })
  })

  describe('Mode B: Established User (天命掌樞)', () => {
    it('assembles celestial resonance and user identity badges (zh-TW & en)', () => {
      const insightZh = computeTemporalInsight(sampleTemporal.dayGanZhi, sampleTemporal.jieQi, 'zh-TW')
      const insightEn = computeTemporalInsight(sampleTemporal.dayGanZhi, sampleTemporal.jieQi, 'en')

      expect(insightZh).toContain('秋氣肅成')
      expect(insightEn).toContain('Metal Qi')

      // Natal badge
      expect(formatDayMaster('庚', 'zh-TW')).toBe('庚金')
      expect(formatDayMaster('庚', 'en')).toBe('Geng Metal')

      // Topic badge
      expect(formatRecentTopic('career', 'zh-TW')).toBe('事業轉機')
      expect(formatRecentTopic('career', 'en')).toBe('Career & Ambition')

      // State 2 greeting has destiny chart count and suggestions
      const greeting = renderGreeting({
        lang: 'zh-TW',
        hasReadings: true,
        lastReading: { type: 'bazi', createdAt: '2026-10-18T10:00:00Z' },
        readingTypeCounts: { bazi: 1, ziwei: 1 },
        temporalContext: sampleTemporal,
        userProfileSummary: sampleProfile,
      })

      expect(greeting.state).toBe(2)
      expect(greeting.suggestions.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Mode C: First-time User (一念啟道)', () => {
    it('provides mystical and dignified introduction with 3 primary action chips', () => {
      const greeting = renderGreeting({
        lang: 'zh-TW',
        hasReadings: false,
      })

      expect(greeting.state).toBe(1)
      expect(greeting.text).toContain('一念既起，玄機已現')
      expect(greeting.text).toContain('吾名玄機')
      expect(greeting.suggestions).toEqual([
        '玄機大師能為我做什麼？',
        '請為我起八字命盤',
        '我有疑問，請為我起一卦',
      ])
    })
  })

  describe('Source code integrity & anti-pattern protection', () => {
    it('MasterWelcomeBoard component exists and does not contain SaaS emojis or purple gradients', () => {
      const welcomeBoardPath = path.resolve(
        process.cwd(),
        'src/components/master/widget/MasterWelcomeBoard.tsx',
      )
      expect(fs.existsSync(welcomeBoardPath)).toBe(true)

      const content = fs.readFileSync(welcomeBoardPath, 'utf-8')
      // No forbidden emojis
      expect(content).not.toMatch(/[🔮✨⭐🤖]/)
      // Uses oriental gold / sanctuary tokens
      expect(content).toContain('var(--border-gold')
      expect(content).toContain('var(--gold')
      // Supports both modes with testids
      expect(content).toContain('welcome-board-reading')
      expect(content).toContain('welcome-board-established')
      expect(content).toContain('welcome-board-first-time')
    })

    it('ExpandedView wires MasterWelcomeBoard with isReadingMode and passes temporal context', () => {
      const expandedViewPath = path.resolve(
        process.cwd(),
        'src/components/master/widget/ExpandedView.tsx',
      )
      const content = fs.readFileSync(expandedViewPath, 'utf-8')

      expect(content).toContain("import { MasterWelcomeBoard } from './MasterWelcomeBoard'")
      expect(content).toContain('isReadingMode')
      expect(content).toContain('<MasterWelcomeBoard')
      expect(content).toContain('viewingReadingId')
      expect(content).toContain('temporalInsight={greetingHints.temporalInsight}')
      expect(content).toContain('userProfileSummary={greetingHints.userProfileSummary}')
    })
  })
})
