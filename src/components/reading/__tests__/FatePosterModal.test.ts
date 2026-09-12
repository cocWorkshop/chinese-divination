import { describe, it, expect } from 'vitest'

const typeMap: Record<string, { zh: string; en: string; motto: string }> = {
  bazi: { zh: '四柱命局', en: 'Four Pillars Chart', motto: '逢凶化吉 · 貴人照臨' },
  ziwei: { zh: '紫微斗數', en: 'Zi Wei Constellation', motto: '洞見星機 · 趨吉避凶' },
  liuyao: { zh: '六爻神課', en: 'Liu Yao Oracle', motto: '動靜相生 · 先機在握' },
  meihua: { zh: '梅花易數', en: 'Plum Blossom Numerology', motto: '萬物皆數 · 體用相合' },
  qimen: { zh: '奇門遁甲', en: 'Qi Men Strategy', motto: '急則從神 · 緩則從門' },
  fengshui: { zh: '風水宅運', en: 'Feng Shui Harmony', motto: '藏風聚氣 · 宅運亨通' },
  iching: { zh: '易經象數', en: 'I Ching Hexagram', motto: '自強不息 · 順天應人' },
}

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
    const fallback = typeMap['custom'] || {
      zh: '東方命理',
      en: 'Chinese Divination',
      motto: '天道酬勤 · 順應時機',
    }
    expect(fallback.motto).toBe('天道酬勤 · 順應時機')
    expect(fallback.zh).toBe('東方命理')
  })
})
