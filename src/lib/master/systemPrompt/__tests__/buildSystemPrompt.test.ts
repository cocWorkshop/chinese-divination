import { describe, it, expect, beforeEach } from 'vitest'
import { buildMasterSystemPrompt } from '../buildSystemPrompt'
import { clearMasterPersonaCache } from '../persona'
import { buildCapabilityCatalog } from '../capabilityCatalog'

describe('buildMasterSystemPrompt', () => {
  beforeEach(() => {
    clearMasterPersonaCache()
  })

  it('loads persona, catalog, skills, and context in order', () => {
    const prompt = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
    })
    expect(prompt).toContain('玄機大師') // persona
    expect(prompt).toContain('Available tools') // catalog
    expect(prompt).toContain('Available skills') // skills catalog
    expect(prompt).toContain('bazi_hepan') // a skill id
    expect(prompt).toContain('Current moment') // context block
    expect(prompt).toContain('Language: zh-TW')
  })

  it('includes the 6 tool names in catalog', () => {
    const prompt = buildMasterSystemPrompt({ lang: 'en', currentDateTime: '2026-04-11T00:00:00Z' })
    expect(prompt).toContain('get_user_profile')
    expect(prompt).toContain('list_family_members')
    expect(prompt).toContain('list_readings')
    expect(prompt).toContain('get_reading')
    expect(prompt).toContain('get_reading_detail')
    expect(prompt).toContain('prefill_divination_form')
  })

  it('includes the personalized prompt block when provided', () => {
    const prompt = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
      personalizedPrompt: 'User focuses on career in Q1 2026; prefers concise replies.',
    })
    expect(prompt).toContain('focuses on career')
  })

  it('omits the personalized block when it is empty or null', () => {
    const a = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
      personalizedPrompt: '',
    })
    const b = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
    })
    expect(a).toBe(b)
  })

  it('renders skills catalog in English when lang=en', () => {
    const prompt = buildMasterSystemPrompt({ lang: 'en', currentDateTime: '2026-04-11T00:00:00Z' })
    expect(prompt).toContain('BaZi Compatibility')
    expect(prompt).toContain('Oracle anchored to destiny chart')
  })

  it('renders skills catalog in Chinese when lang=zh-TW', () => {
    const prompt = buildMasterSystemPrompt({ lang: 'zh-TW', currentDateTime: '2026-04-11T00:00:00Z' })
    expect(prompt).toContain('八字合盘')
    expect(prompt).toContain('卦命互參')
  })

  it('injects session budget note when approaching or at max turns', () => {
    // 50 max turns, threshold is 5 turns remaining (Math.round(50*0.1) = 5)
    const early = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
      sessionBudget: { turn: 20, maxTurns: 50 },
    })
    expect(early).not.toContain('Session budget')

    const near = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
      sessionBudget: { turn: 47, maxTurns: 50 },
    })
    expect(near).toContain('Session budget — 3 turn(s) left')
    expect(near).toContain('Steer toward a natural resting point')

    const last = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
      sessionBudget: { turn: 50, maxTurns: 50 },
    })
    expect(last).toContain('Session budget — this is the LAST turn')
    expect(last).toContain('close naturally in the same reply')
  })
})

describe('buildCapabilityCatalog', () => {
  it('produces one bullet per tool', () => {
    const catalog = buildCapabilityCatalog()
    const bullets = catalog.split('\n').filter((l) => l.startsWith('- **'))
    expect(bullets.length).toBe(7)
  })
})
