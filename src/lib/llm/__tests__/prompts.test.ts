import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import { loadDivinationPrompt, __clearPromptCache } from '../prompts'

beforeEach(() => {
  __clearPromptCache()
  vi.restoreAllMocks()
})

describe('loadDivinationPrompt', () => {
  it('loads each divination type from divination-refs/', () => {
    const types = ['bazi', 'iching', 'liuyao', 'ziwei', 'qimen', 'fengshui', 'meihua', 'other'] as const
    for (const t of types) {
      const content = loadDivinationPrompt(t)
      expect(content).toBeTypeOf('string')
      expect(content.length).toBeGreaterThan(0)
    }
  })

  it('caches content — second call does not hit fs', () => {
    const spy = vi.spyOn(fs, 'readFileSync')
    loadDivinationPrompt('bazi')
    expect(spy).toHaveBeenCalledTimes(1)
    loadDivinationPrompt('bazi')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('maps meihua and other to the same underlying file', () => {
    const a = loadDivinationPrompt('meihua')
    const b = loadDivinationPrompt('other')
    expect(a).toBe(b)
  })

  it('falls back to "other" for unknown types', () => {
    const unknown = loadDivinationPrompt('mysterious' as never)
    const other = loadDivinationPrompt('other')
    expect(unknown).toBe(other)
  })

  it('returns placeholder (and does not cache it) when file missing', () => {
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT')
    })
    const content = loadDivinationPrompt('bazi')
    expect(content).toContain('参考资料')
    expect(spy).toHaveBeenCalledTimes(1)
    // Uncached fallback — next call still hits fs.
    loadDivinationPrompt('bazi')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
