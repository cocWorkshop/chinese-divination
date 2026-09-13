import { describe, it, expect } from 'vitest'
import { typeMap, getPosterConfig } from '../fatePosterConfig'
import { POSTER_RATIOS } from '@/lib/share/socialShare'

describe('FatePosterModal configuration and aesthetics', () => {
  it('maps all primary systems to classical 8-character mottos', () => {
    expect(typeMap.bazi.motto).toBe('逢凶化吉 · 貴人照臨')
    expect(typeMap.ziwei.motto).toBe('洞見星機 · 趨吉避凶')
    expect(typeMap.liuyao.motto).toBe('動靜相生 · 先機在握')
    expect(typeMap.meihua.motto).toBe('萬物皆數 · 體用相合')
    expect(typeMap.qimen.motto).toBe('急則從神 · 緩則從門')
    expect(typeMap.fengshui.motto).toBe('藏風聚氣 · 宅運亨通')
    expect(typeMap.iching.motto).toBe('自強不息 · 順天應人')
  })

  it('provides dignified fallback for custom or new systems', () => {
    const fallback = getPosterConfig('custom_divination')
    expect(fallback.motto).toBe('天道酬勤 · 順應時機')
    expect(fallback.zh).toBe('東方命理')
    expect(fallback.en).toBe('Chinese Divination')
  })

  it('integrates 3:4 and 9:16 aspect ratios for cross-platform posting', () => {
    expect(POSTER_RATIOS['3:4'].width).toBe(1080)
    expect(POSTER_RATIOS['3:4'].height).toBe(1440)
    expect(POSTER_RATIOS['9:16'].width).toBe(1080)
    expect(POSTER_RATIOS['9:16'].height).toBe(1920)
  })
})
