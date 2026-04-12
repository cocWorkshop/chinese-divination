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
    expect(prompt).toContain('Current session') // context block
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

  it('includes the user portrait when provided', () => {
    const prompt = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
      portrait: 'User is a software engineer, bazi day master 戊土, focused on career Q1 2026.',
    })
    expect(prompt).toContain('User portrait')
    expect(prompt).toContain('戊土')
  })

  it('omits portrait section when portrait is empty or null', () => {
    const prompt = buildMasterSystemPrompt({
      lang: 'zh-TW',
      currentDateTime: '2026-04-11T00:00:00Z',
      portrait: '',
    })
    expect(prompt).not.toContain('User portrait')
  })

  it('renders skills catalog in English when lang=en', () => {
    const prompt = buildMasterSystemPrompt({ lang: 'en', currentDateTime: '2026-04-11T00:00:00Z' })
    expect(prompt).toContain('BaZi Compatibility')
    expect(prompt).toContain('Hexagram × Destiny')
  })

  it('renders skills catalog in Chinese when lang=zh-TW', () => {
    const prompt = buildMasterSystemPrompt({ lang: 'zh-TW', currentDateTime: '2026-04-11T00:00:00Z' })
    expect(prompt).toContain('八字合盘')
    expect(prompt).toContain('卦命互参')
  })
})

describe('buildCapabilityCatalog', () => {
  it('produces one bullet per tool', () => {
    const catalog = buildCapabilityCatalog()
    const bullets = catalog.split('\n').filter((l) => l.startsWith('- **'))
    expect(bullets.length).toBe(7)
  })
})
