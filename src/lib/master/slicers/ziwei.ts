/**
 * Zi Wei Dou Shu slicer — progressive disclosure for 紫微斗數 readings.
 *
 * Header: ziweiChart metadata (fiveElementsClass, zodiac, soul, body),
 * formation, and the命宫 palace core. Excludes the other 11 palaces
 * (huge) and all LLM sections beyond overview — all fetchable on demand.
 */

import { asObject, asString, type ReadingSlicer } from './_types'

const ZIWEI_SECTION_KEYS = [
  'personality',
  'career',
  'marriage',
  'wealth',
  'health',
  'family',
  'palaces',           // full 12-palace detail
  'daYunAnalysis',     // V2 LLM structured per-decade analysis
  'keyPredictions',    // LLM key life events list
  'liuNian',           // chart-merged annual fortune (if present)
  'branchAnalysis',    // LLM branch interactions if ziwei V2 includes it
  'keyAdvice',
  'luckyInfo',
  'formation',
] as const

const PALACE_KEYS = [
  '命宫', '财帛', '官禄', '夫妻', '兄弟', '子女',
  '疾厄', '迁移', '仆役', '田宅', '福德', '父母',
] as const

function compactPalace(p: unknown): Record<string, unknown> | null {
  const obj = asObject(p)
  if (!obj) return null
  return {
    stars: Array.isArray(obj.stars) ? obj.stars : [],
    // Strip heavy analysis text from the header variant; full text fetchable via getSection('palaces').
  }
}

export const ziweiSlicer: ReadingSlicer = {
  type: 'ziwei',

  sliceHeader(result) {
    const chart = asObject(result.ziweiChart)
    const formation = asObject(result.formation)
    const palaces = asObject(result.palaces)
    return {
      version: result.version ?? 1,
      chart: chart
        ? {
            fiveElementsClass: chart.fiveElementsClass ?? null,
            zodiac: chart.zodiac ?? null,
            soul: chart.soul ?? null,
            body: chart.body ?? null,
            yearStem: chart.yearStem ?? null,
            yearBranch: chart.yearBranch ?? null,
          }
        : null,
      formation: formation
        ? {
            name: formation.name ?? null,
            level: formation.level ?? null,
            analysis: formation.analysis ?? null,
          }
        : null,
      mainStars: Array.isArray(result.mainStars) ? result.mainStars : [],
      palacesPreview: palaces
        ? Object.fromEntries(
            PALACE_KEYS.filter((k) => palaces[k]).map((k) => [k, compactPalace(palaces[k])])
          )
        : null,
      mingGong: asObject(palaces?.['命宫']),
    }
  },

  getOverview(result) {
    const sections = asObject(result.sections)
    if (!sections) return null
    return asString(sections.overview)
  },

  listSections(result) {
    const sections = asObject(result.sections)
    const out: string[] = []
    for (const key of ZIWEI_SECTION_KEYS) {
      switch (key) {
        case 'personality':
        case 'career':
        case 'marriage':
        case 'wealth':
        case 'health':
        case 'family':
          if (sections && typeof sections[key] === 'string') out.push(key)
          break
        case 'palaces':
          if (asObject(result.palaces)) out.push(key)
          break
        case 'daYunAnalysis':
          if (Array.isArray(result.daYunAnalysis) && result.daYunAnalysis.length > 0) out.push(key)
          break
        case 'keyPredictions':
          if (Array.isArray(result.keyPredictions) && result.keyPredictions.length > 0) out.push(key)
          break
        case 'liuNian':
          if (Array.isArray(result.liuNian) && result.liuNian.length > 0) out.push(key)
          break
        case 'branchAnalysis':
          if (typeof result.branchAnalysis === 'string') out.push(key)
          break
        case 'keyAdvice':
          if (Array.isArray(result.keyAdvice) && result.keyAdvice.length > 0) out.push(key)
          break
        case 'luckyInfo':
          if (asObject(result.luckyInfo)) out.push(key)
          break
        case 'formation':
          if (asObject(result.formation)) out.push(key)
          break
      }
    }
    return out
  },

  getSection(result, section) {
    const sections = asObject(result.sections)
    switch (section) {
      case 'personality':
      case 'career':
      case 'marriage':
      case 'wealth':
      case 'health':
      case 'family':
        return sections && typeof sections[section] === 'string' ? sections[section] : null
      case 'palaces':
        return asObject(result.palaces)
      case 'daYunAnalysis':
        return Array.isArray(result.daYunAnalysis) ? result.daYunAnalysis : null
      case 'keyPredictions':
        return Array.isArray(result.keyPredictions) ? result.keyPredictions : null
      case 'liuNian':
        return Array.isArray(result.liuNian) ? result.liuNian : null
      case 'branchAnalysis':
        return typeof result.branchAnalysis === 'string' ? result.branchAnalysis : null
      case 'keyAdvice':
        return Array.isArray(result.keyAdvice) ? result.keyAdvice : null
      case 'luckyInfo':
        return asObject(result.luckyInfo)
      case 'formation':
        return asObject(result.formation)
      default:
        return null
    }
  },
}
