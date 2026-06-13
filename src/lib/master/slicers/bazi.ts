/**
 * BaZi slicer — progressive disclosure for 八字 readings.
 *
 * Header includes: pillars (4 pillars compact), dayMaster + strength,
 * fiveElements weighted counts, lucky/avoid elements, formation name + analysis,
 * and seasonalNote. Excludes: daYun, liuNian, branchRelationships, per-pillar
 * shenSha, hideHeavenStemDay — all fetchable on demand via getSection.
 */

import { asObject, asString, type ReadingSlicer } from './_types'

const BAZI_SECTION_KEYS = [
  // LLM narrative sections (sections.*)
  'personality',
  'career',
  'marriage',
  'wealth',
  'health',
  // Chart + LLM chunks fetchable independently
  'daYunAnalysis',      // V2 LLM structured per-decade analysis
  'daYun',              // chart 大運 periods (no narrative, compact)
  'liuNian',            // chart 流年 annual pillars
  'branchAnalysis',     // LLM string on branch interactions
  'branchRelationships',// chart 冲/合/害/刑
  'shenSha',            // chart 神煞 per pillar (collected)
  'keyAdvice',          // LLM tips list
  'luckyInfo',          // colors/directions
  'formation',          // full formation detail (re-fetchable even though name is in header)
] as const

function compactPillar(p: unknown): Record<string, unknown> | null {
  const obj = asObject(p)
  if (!obj) return null
  return {
    stem: obj.stem ?? null,
    branch: obj.branch ?? null,
    element: obj.element ?? null,
    nayin: obj.nayin ?? null,
  }
}

function collectShenSha(pillars: Record<string, unknown> | null): unknown[] | null {
  if (!pillars) return null
  const result: unknown[] = []
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = asObject(pillars[key])
    if (p && Array.isArray(p.shenSha)) {
      for (const s of p.shenSha) {
        result.push({ pillar: key, ...(asObject(s) ?? {}) })
      }
    }
  }
  return result.length > 0 ? result : null
}

export const baziSlicer: ReadingSlicer = {
  type: 'bazi',

  sliceHeader(result) {
    const pillars = asObject(result.pillars)
    const dayMaster = asObject(result.dayMaster)
    const fiveElements = asObject(result.fiveElements)
    const formation = asObject(result.formation)
    return {
      version: result.version ?? 1,
      pillars: pillars
        ? {
            year: compactPillar(pillars.year),
            month: compactPillar(pillars.month),
            day: compactPillar(pillars.day),
            hour: compactPillar(pillars.hour),
          }
        : null,
      dayMaster: dayMaster
        ? {
            stem: dayMaster.stem ?? null,
            element: dayMaster.element ?? null,
            yinYang: dayMaster.yinYang ?? null,
            strength: dayMaster.strength ?? null,
            strengthLabel: dayMaster.strengthLabel ?? null,
          }
        : null,
      fiveElements: fiveElements
        ? {
            metal: Number(fiveElements.metal ?? 0),
            wood: Number(fiveElements.wood ?? 0),
            water: Number(fiveElements.water ?? 0),
            fire: Number(fiveElements.fire ?? 0),
            earth: Number(fiveElements.earth ?? 0),
          }
        : null,
      luckyElements: Array.isArray(result.luckyElements) ? result.luckyElements : [],
      avoidElements: Array.isArray(result.avoidElements) ? result.avoidElements : [],
      formation: formation
        ? {
            name: formation.name ?? null,
            analysis: formation.analysis ?? null,
          }
        : null,
      seasonalNote: asString(result.seasonalNote),
      trueSolarTime: asObject(result.trueSolarTime) ?? null,
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
    for (const key of BAZI_SECTION_KEYS) {
      switch (key) {
        case 'personality':
        case 'career':
        case 'marriage':
        case 'wealth':
        case 'health':
          if (sections && typeof sections[key] === 'string') out.push(key)
          break
        case 'daYunAnalysis':
          if (Array.isArray(result.daYunAnalysis) && result.daYunAnalysis.length > 0) out.push(key)
          break
        case 'daYun':
          if (Array.isArray(result.daYun) && result.daYun.length > 0) out.push(key)
          break
        case 'liuNian':
          if (Array.isArray(result.liuNian) && result.liuNian.length > 0) out.push(key)
          break
        case 'branchAnalysis':
          if (typeof result.branchAnalysis === 'string') out.push(key)
          break
        case 'branchRelationships':
          if (asObject(result.branchRelationships)) out.push(key)
          break
        case 'shenSha': {
          const ss = collectShenSha(asObject(result.pillars))
          if (ss && ss.length > 0) out.push(key)
          break
        }
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
        return sections && typeof sections[section] === 'string' ? sections[section] : null
      case 'daYunAnalysis':
        return Array.isArray(result.daYunAnalysis) ? result.daYunAnalysis : null
      case 'daYun':
        return Array.isArray(result.daYun) ? result.daYun : null
      case 'liuNian':
        return Array.isArray(result.liuNian) ? result.liuNian : null
      case 'branchAnalysis':
        return typeof result.branchAnalysis === 'string' ? result.branchAnalysis : null
      case 'branchRelationships':
        return asObject(result.branchRelationships)
      case 'shenSha':
        return collectShenSha(asObject(result.pillars))
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
