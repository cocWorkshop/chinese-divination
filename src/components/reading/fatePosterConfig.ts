/**
 * Configuration and classical motto mappings for Fate Poster cards
 */

export interface DivinationTypePosterConfig {
  zh: string
  en: string
  motto: string
}

export const typeMap: Record<string, DivinationTypePosterConfig> = {
  bazi: { zh: '四柱命局', en: 'Four Pillars Chart', motto: '逢凶化吉 · 貴人照臨' },
  ziwei: { zh: '紫微斗數', en: 'Zi Wei Constellation', motto: '洞見星機 · 趨吉避凶' },
  liuyao: { zh: '六爻神課', en: 'Liu Yao Oracle', motto: '動靜相生 · 先機在握' },
  meihua: { zh: '梅花易數', en: 'Plum Blossom Numerology', motto: '萬物皆數 · 體用相合' },
  qimen: { zh: '奇門遁甲', en: 'Qi Men Strategy', motto: '急則從神 · 緩則從門' },
  fengshui: { zh: '風水宅運', en: 'Feng Shui Harmony', motto: '藏風聚氣 · 宅運亨通' },
  iching: { zh: '易經象數', en: 'I Ching Hexagram', motto: '自強不息 · 順天應人' },
}

export const defaultPosterConfig: DivinationTypePosterConfig = {
  zh: '東方命理',
  en: 'Chinese Divination',
  motto: '天道酬勤 · 順應時機',
}

export function getPosterConfig(divinationType: string): DivinationTypePosterConfig {
  return typeMap[divinationType] || defaultPosterConfig
}
