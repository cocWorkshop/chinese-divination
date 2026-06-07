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
${birth.birthEnvironment ? `- 出生环境：${birth.birthEnvironment}` : ''}

## 引用规则（每段分析至少引用 2 条结构性证据）
> **不要**只用"日主强/弱"这种笼统结论。每条结论必须附上**具体出处**（哪一柱、哪个十神、哪个神煞、哪个三合）。
> **输出中不要出现英文字段名、true/false 或任何布尔值/原始数据字段**，全部用中文命理术语自然表述。

- **神煞**：每柱的神煞列表是关键证据。
  - 婚姻段：必查日支（夫妻宫）的桃花/红鸾/孤鸾/天喜
  - 事业段：必查官星柱+将星/华盖/驿马
  - 财运段：必查财星柱+偏财/驿马
  - 健康段：必查羊刃/血刃
  - 引用要写出具体名称，不要笼统说"有神煞"
- **透干 / 藏干十神**：每柱十神列出该柱透干与藏支的十神。"丙日生人月柱七杀透出，年支寅木藏甲偏印"是合格论断；"七杀重"不行。
- **十神力量**：每个十神的「結構」字段以中文标明透干/不透、通根/无根、得令/失令，配合数量，是论命快速依据。引用时务必用自然语言（如「正财通根但不透」「七杀得令通根」），**切勿照抄字段名或写出 true/false**。
- **空亡**：**六亲分析必查** —— 年柱空亡论父母缘，月柱空亡论兄弟，日支空亡论配偶，时柱空亡论子女。命中即论。
- **三合 / 半合 / 拱合**：原局地支三合局是"已成的力量"。全三合最强，半合次之，拱合最弱但流年填实可触发。务必点出。
- **三會 / 方局**：地支同方局是"势"，比三合更纯。三會主整体气场倾向。
- **截路空亡**：若存在，相关柱位时机/晚年表达受阻，结合该柱神煞综合论。

## 输出要求
- **formation**: 格局名称 + 50+字分析（参照《子平真诠》，用人元司令分野确定月令司令；必须引用十神力量中「得令、通根、透干」三者俱全的十神作为格局支撑）
- **seasonalNote**: 调候分析（参照《穷通宝鉴》），点出寒暖燥湿与喜用神的关系
- **sections**：
  - **overview**(200+字)：日主性格 + 命主出身 + 六亲位置概观，**必须引用日柱与年柱的神煞 + 十神力量中得令的十神**
  - **career**(150+字)：**必须引用**官杀星的十神力量 + 月柱/时柱神煞（将星/华盖/驿马等）
  - **marriage**(150+字)：**必须引用**夫妻宫（日支）的神煞（桃花/红鸾/孤鸾/天喜）+ 配偶星（男看财星 / 女看官星）的十神力量 + 日支是否空亡或受冲
  - **wealth**(150+字)：**必须引用**财星十神力量 + 财星位置 + 相关神煞（驿马/天财等）
  - **health**(100+字)：**必须引用**五行偏颇 + 受伤地支（被冲/被刑/空亡）+ 健康相关神煞（羊刃/血刃等）
- **daYunAnalysis**: 8步大运数组，每步含 theme(必引该大运对原局的冲合关系) / interactions(必查与原局是否成三合/三會/六合/六冲) / keyYears(2-3个，从流年中选喜用年或天干透出格局用神的年份) / advice
- **keyPredictions**: 从大运/流年中提炼3-5个最关键的人生转折点，每个含年龄段、事件描述、命理依据
- **branchAnalysis**: 原局地支关系解读，**必须按顺序覆盖**六冲/六合/六害/三刑/三合/三會，每项有命中即解读；截路空亡若存在也要点出
- **keyAdvice**: 3-5条具体建议 | **luckyInfo**: colors + directions`

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
  },

  buildSchema(ctx) {
    return {
      ...(schemaToLLMTemplate(baziSchemaV2) as Record<string, unknown>),
      suggestedQuestions: getSuggestedQuestionsPrompt('bazi', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
