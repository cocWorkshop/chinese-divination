/**
 * BaZi (八字) handler — personal birth-profile type.
 *
 * Requires: solarBirthDate + (birthTime || exactTime).
 * Uses V2 schema with structured da yun analysis, formation, seasonal note.
 */

import { calculateBazi, type BaziChart } from '@/lib/baziCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { extractBirthInputs, hasBirthDateTime } from '../_birthProfile'
import { buildGenericUserMessage } from '../_fallback'
import { getSuggestedQuestionsPrompt } from '../_suggestedQuestions'
import { baziSchemaV2 } from '../../schemas/bazi.schema'
import { schemaToLLMTemplate } from '../../schemas/_toLLMTemplate'

export const baziHandler: DivinationHandler<BaziChart> = {
  chartKey: 'bazi',
  schema: baziSchemaV2,

  canHandle(ctx) {
    const birth = extractBirthInputs(ctx.inputData)
    return hasBirthDateTime(birth)
  },

  calculate(ctx): CalculationResult<BaziChart> {
    const birth = extractBirthInputs(ctx.inputData)
    if (!birth.solarBirthDate) {
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
    try {
      const chart = calculateBazi(
        birth.solarBirthDate,
        birth.timeMode === 'precise' ? '' : (birth.birthTime || ''),
        birth.birthPlace,
        birth.gender === 'female' ? 'female' : 'male',
        birth.timeMode === 'precise' ? birth.exactTime : undefined,
        birth.birthLng,
        birth.birthLat
      )
      // Pass the FULL 流年 timeline to the LLM (not a windowed slice). The
      // earlier ±10y window was an optimization that hurt long-arc analysis
      // — the master needs to see late-life and early-life liu nian to
      // identify cross-decade themes and the 起運 → 終運 trajectory.
      const fullLiuNian = chart.liuNian || []

      // Build structured da yun data for LLM to fill theme/interactions/keyYears/advice
      const daYunForPrompt = chart.daYun.map(dy => ({
        天干: dy.stem, 地支: dy.branch, 纳音: dy.nayin,
        起始年龄: dy.startAge, 结束年龄: dy.endAge,
        起始年份: dy.startYear, 结束年份: dy.endYear,
      }))

      const userMessage = `请为我进行八字命理精批。请按照系统指南中的六步推理框架（定格局→判旺衰→论调候→析十神→查关系→排大运）进行分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 命盘数据（程序预计算，直接使用，不要重新推算）
${JSON.stringify({
  四柱: (() => {
    const mapPillar = (p: typeof chart.yearPillar) => ({
      天干: p.stem, 地支: p.branch, 纳音: p.nayin,
      藏干: p.hiddenStems,
      十神: p.tenGods?.map(tg => `${tg.stem}(${tg.god})`),
      长生: p.changSheng, 空亡: p.kongWang,
      神煞: p.shenSha?.map(s => s.name),
    })
    return { 年柱: mapPillar(chart.yearPillar), 月柱: mapPillar(chart.monthPillar), 日柱: mapPillar(chart.dayPillar), 时柱: mapPillar(chart.hourPillar) }
  })(),
  日主: { 天干: chart.dayMaster.stem, 五行: chart.dayMaster.element, 阴阳: chart.dayMaster.yinYang },
  五行: chart.fiveElements,
  旺衰: chart.strength,
  旺衰标签: chart.strengthLabel,
  喜用神: chart.luckyElements,
  忌神: chart.avoidElements,
  起运: chart.qiYun,
  大运: daYunForPrompt,
  地支关系: chart.branchRelationships ? {
    六冲: (chart.branchRelationships.clashes || []).map(c => `${c.branch1}(${c.pillar1})冲${c.branch2}(${c.pillar2})`),
    六合: (chart.branchRelationships.combines || []).map(c => `${c.branch1}(${c.pillar1})合${c.branch2}(${c.pillar2})→${c.result}`),
    六害: (chart.branchRelationships.harms || []).map(c => `${c.branch1}(${c.pillar1})害${c.branch2}(${c.pillar2})`),
    三刑: (chart.branchRelationships.punishments || []).map(c => `${c.branches.join('')}(${c.pillars.join('/')}) ${c.type}`),
    三合: ((chart.branchRelationships as unknown as Record<string, unknown>).triCombines as Array<{branches: string[]; pillars: string[]; element: string; kind: string}> || []).map(c => `${c.branches.join('')}(${c.pillars.join('/')})→${c.element} [${c.kind}]`),
    三會: ((chart.branchRelationships as unknown as Record<string, unknown>).threeWayMeets as Array<{branches: string[]; pillars: string[]; element: string; direction: string; kind: string}> || []).map(c => `${c.branches.join('')}(${c.pillars.join('/')})→${c.element}/${c.direction} [${c.kind}]`),
  } : null,
  流年: fullLiuNian.map(ln => ({
    干: ln.stem, 支: ln.branch, 纳音: ln.nayin, 年龄: ln.age, 年份: ln.year,
    十神: ln.tenGod, 吉凶: ln.isLucky === true ? '喜用' : ln.isLucky === false ? '忌神' : '中性',
  })),
  人元司令分野: chart.hideHeavenStemDay,
  十神力量: (chart.tenGodStrength || []).map(tg => ({
    十神: tg.god,
    結構: [tg.transparent ? '透干' : '不透', tg.rooted ? '通根' : '無根', tg.inSeason ? '得令' : '失令'].join('、'),
    数量: tg.count,
  })),
  截路空亡: chart.jieLu,
  胎元: chart.fetalOrigin,
  命宫: chart.ownSign,
  身宫: chart.bodySign,
}, null, 2)}

## 用户信息
- 出生：${birth.solarBirthDate}（公历）${birth.lunarOriginal ? `/ 农历 ${birth.lunarOriginal}` : ''} ${birth.timeMode === 'precise' ? birth.exactTime + '（真太阳时校正）' : birth.birthTime + '（模糊时辰）'}
- 出生地：${birth.birthPlace || '未提供'} | 性别：${birth.gender}
${birth.birthEnvironment ? `- 出生环境：${birth.birthEnvironment}` : ''}`

      return { chart, userMessage }
    } catch (e) {
      console.error('BaZi calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
  },

  merge(llmResult, chart) {
    // Version tag
    llmResult.version = 2

    // Merge pillar data from calculator
    llmResult.pillars = {
      year: chart.yearPillar,
      month: chart.monthPillar,
      day: chart.dayPillar,
      hour: chart.hourPillar,
    }
    llmResult.dayMaster = {
      ...((llmResult.dayMaster as object | undefined) || {}),
      stem: chart.dayMaster.stem,
      element: chart.dayMaster.element,
      yinYang: chart.dayMaster.yinYang,
      strength: chart.strength,
      strengthLabel: chart.strengthLabel,
    }
    llmResult.fiveElements = chart.fiveElements
    if (chart.trueSolarTime) {
      llmResult.trueSolarTime = chart.trueSolarTime
    }
    llmResult.daYun = chart.daYun
    llmResult.xiaoYun = chart.xiaoYun
    llmResult.qiYun = chart.qiYun
    if (!llmResult.luckyElements || (llmResult.luckyElements as string[]).length === 0) {
      llmResult.luckyElements = chart.luckyElements
    }
    if (!llmResult.avoidElements || (llmResult.avoidElements as string[]).length === 0) {
      llmResult.avoidElements = chart.avoidElements
    }

    // Merge da yun stem/branch/age/year into daYunAnalysis if LLM provided it
    if (Array.isArray(llmResult.daYunAnalysis)) {
      const daYunAnalysis = llmResult.daYunAnalysis as Record<string, unknown>[]
      for (let i = 0; i < daYunAnalysis.length && i < chart.daYun.length; i++) {
        daYunAnalysis[i].stem = chart.daYun[i].stem
        daYunAnalysis[i].branch = chart.daYun[i].branch
        daYunAnalysis[i].startAge = chart.daYun[i].startAge
        daYunAnalysis[i].endAge = chart.daYun[i].endAge
        daYunAnalysis[i].startYear = chart.daYun[i].startYear
        daYunAnalysis[i].endYear = chart.daYun[i].endYear
      }
    }

    // V2 fields
    if (chart.liuNian) llmResult.liuNian = chart.liuNian
    if (chart.branchRelationships) llmResult.branchRelationships = chart.branchRelationships
    if (chart.hideHeavenStemDay) llmResult.hideHeavenStemDay = chart.hideHeavenStemDay
    if (chart.fetalOrigin) llmResult.fetalOrigin = chart.fetalOrigin
    if (chart.ownSign) llmResult.ownSign = chart.ownSign
    if (chart.bodySign) llmResult.bodySign = chart.bodySign
    if (chart.ownSignPillar) llmResult.ownSignPillar = chart.ownSignPillar
    if (chart.bodySignPillar) llmResult.bodySignPillar = chart.bodySignPillar
    if (chart.fetalOriginPillar) llmResult.fetalOriginPillar = chart.fetalOriginPillar
  },

  buildSchema(ctx) {
    return {
      ...(schemaToLLMTemplate(baziSchemaV2) as Record<string, unknown>),
      suggestedQuestions: getSuggestedQuestionsPrompt('bazi', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
