/**
 * ZiWei Dou Shu (紫微斗數) handler — personal birth-profile type.
 *
 * Uses V2 schema with structured da yun analysis, formation, 流年 data.
 * Applies true-solar-time + DST correction before calling calculateZiwei.
 */

import { calculateZiwei, type ZiweiChart } from '@/lib/ziweiCalculator'
import { detectPatterns, type DetectedPattern } from '@/lib/ziweiPatterns'
import { trueSolarTime, getTrueSolarTimeCorrection, getShichen } from '@/lib/trueSolarTime'
import { getTimezoneOffset } from '@/lib/dstDetection'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { extractBirthInputs, hasBirthDateTime, type BirthInputs } from '../_birthProfile'
import { buildGenericUserMessage } from '../_fallback'
import { getSuggestedQuestionsPrompt } from '../_suggestedQuestions'
import { ziweiSchemaV2 } from '../../schemas/ziwei.schema'
import { schemaToLLMTemplate } from '../../schemas/_toLLMTemplate'

interface ZiweiChartWithPatterns {
  chart: ZiweiChart
  patterns: DetectedPattern[]
}

/**
 * Apply true-solar-time + DST correction to a precise birth time.
 */
function applyTrueSolarCorrection(birth: BirthInputs): {
  shichen: string
  adjustedDate: string
  ziweiTrueSolarInfo: string
} {
  const solarBirthDate = birth.solarBirthDate!
  const [zy, zm, zd] = solarBirthDate.split('-').map(Number)
  let shichen = birth.birthTime || ''
  let adjustedDate = solarBirthDate
  let ziweiTrueSolarInfo = ''

  if (birth.timeMode === 'precise' && birth.exactTime) {
    const longitude = birth.birthLng ?? 120.0
    const [exactHour, exactMinute] = birth.exactTime.split(':').map(Number)
    const tzResult = getTimezoneOffset(zy, zm, zd, exactHour, longitude, birth.birthLat)
    const timezone = tzResult.offset

    // DST adjustment: subtract 1h, may roll back by a day.
    let adjHour = exactHour
    let adjDay = zd, adjMonth = zm, adjYear = zy
    if (tzResult.isDST) {
      adjHour -= 1
      if (adjHour < 0) {
        adjHour += 24
        const prevDate = new Date(zy, zm - 1, zd - 1)
        adjYear = prevDate.getFullYear()
        adjMonth = prevDate.getMonth() + 1
        adjDay = prevDate.getDate()
      }
    }

    const standardDate = new Date(adjYear, adjMonth - 1, adjDay, adjHour, exactMinute, 0)
    const correctedDate = trueSolarTime(standardDate, longitude, tzResult.isDST ? timezone - 1 : timezone)
    const correctedShichen = getShichen(correctedDate)
    const correctedHour = correctedDate.getHours()

    shichen = correctedShichen.name
    if (correctedHour >= 23) shichen = 'zi_late'

    const originalDate = new Date(zy, zm - 1, zd, exactHour, exactMinute, 0)
    const originalShichen = getShichen(originalDate)
    const correctionMinutes = getTrueSolarTimeCorrection(standardDate, longitude, tzResult.isDST ? timezone - 1 : timezone)
    const shichenChanged = correctedShichen.branch !== originalShichen.branch
    const formatT = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    ziweiTrueSolarInfo = `（精确时间，已真太阳时校正：${formatT(originalDate)} → ${formatT(correctedDate)}，校正${Math.round(correctionMinutes * 10) / 10}分钟${shichenChanged ? '，时辰已变更' : ''}${tzResult.isDST ? '，已扣除夏令时' : ''}）`
  } else {
    shichen = birth.birthTime || 'zi'
  }

  // zi_late → push date forward by one day (with proper padding)
  if (shichen === 'zi_late') {
    const nextDay = new Date(zy, zm - 1, zd + 1)
    adjustedDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
  }

  return { shichen, adjustedDate, ziweiTrueSolarInfo }
}

export const ziweiHandler: DivinationHandler<ZiweiChartWithPatterns> = {
  chartKey: 'ziwei',
  schema: ziweiSchemaV2,

  canHandle(ctx) {
    const birth = extractBirthInputs(ctx.inputData)
    return hasBirthDateTime(birth)
  },

  calculate(ctx): CalculationResult<ZiweiChartWithPatterns> {
    const birth = extractBirthInputs(ctx.inputData)
    if (!birth.solarBirthDate) {
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
    try {
      const { shichen, adjustedDate, ziweiTrueSolarInfo } = applyTrueSolarCorrection(birth)
      const chart = calculateZiwei(
        adjustedDate,
        shichen === 'zi_late' ? 'zi' : shichen,
        birth.gender === 'female' ? 'female' : 'male'
      )
      const patterns = detectPatterns(chart)

      const palaceSummary = chart.palaces.map(p => ({
        宫名: p.name,
        天干: p.heavenlyStem,
        地支: p.earthlyBranch,
        主星: p.majorStars.map(s => ({ 星名: s.name, 亮度: s.brightness, 四化: s.mutagen })),
        辅星: p.minorStars.map(s => ({ 星名: s.name, 亮度: s.brightness, 四化: s.mutagen })),
        是否身宫: p.isBodyPalace,
        大限: p.decadal,
        长生十二宫: p.changsheng12,
      }))

      const birthYear = parseInt(birth.solarBirthDate.split('-')[0])
      const currentYear = new Date().getFullYear()
      const currentAge = currentYear - birthYear

      // Dayun timeline for prompt
      const dayunSorted = chart.palaces
        .filter(p => p.decadal && p.decadal.range.length === 2 && (p.decadal.range[0] > 0 || p.decadal.range[1] > 0))
        .map(p => ({
          年龄范围: `${p.decadal.range[0]}-${p.decadal.range[1]}`,
          宫位: p.name,
          天干: p.decadal.heavenlyStem,
          地支: p.decadal.earthlyBranch,
          主星: p.majorStars.map(s => s.name + (s.brightness ? `(${s.brightness})` : '') + (s.mutagen ? `[${s.mutagen}]` : '')).join('、') || '无正曜',
          当前大限: currentAge >= p.decadal.range[0] && currentAge <= p.decadal.range[1],
        }))
        .sort((a, b) => parseInt(a.年龄范围) - parseInt(b.年龄范围))

      // Pass the FULL 流年 timeline (not a windowed slice). The previous
      // ±10y window prevented long-arc and retrospective analysis — for
      // ziwei the master should see early-life palaces' liu nian to
      // explain personality formation, and late-life liu nian to project
      // long-term trajectories. Full timeline is small enough (~80 entries
      // of compact records) to fit comfortably in the prompt budget.
      const fullLiuNian = chart.liuNian || []

      const userMessage = `请为我进行紫微斗数命盘精批。请按照系统指南中的六步推理框架（定格局→看四化→析三方四正→断六亲→排大运→综合预测）进行分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 命盘数据（程序预计算，直接使用）
${JSON.stringify({
  基本信息: {
    公历: chart.solarDate,
    农历: chart.lunarDate,
    时辰: chart.time,
    生肖: chart.zodiac,
    性别: chart.gender,
    五行局: chart.fiveElementsClass,
    命主: chart.soul,
    身主: chart.body,
    命宫地支: chart.earthlyBranchOfSoulPalace,
    身宫地支: chart.earthlyBranchOfBodyPalace,
  },
  本命四化: (chart.siHua || []).map((s: Record<string, string>) => `${s.star}化${s.type}入${s.palace}`),
  大限四化: (chart.decadalSiHua || []).map((d: { heavenlyStem: string; earthlyBranch: string; range: number[]; mutagen: string[] }) =>
    `${d.range[0]}-${d.range[1]}歲 ${d.heavenlyStem}${d.earthlyBranch} 四化:${d.mutagen.join('/')}`
  ),
  已识别格局: patterns.map(p => ({ 格局名: p.name, 等级: p.level, 描述: p.description, 涉及星曜: p.involvedStars, 涉及宫位: p.involvedPalaces })),
  大限时间线: dayunSorted,
  流年: fullLiuNian.map(ln => ({
    年份: ln.year, 年龄: ln.age, 地支: ln.earthlyBranch,
    流年四化: ln.yearlyMutagen, 化禄宫: ln.huaLuPalace, 化忌宫: ln.huaJiPalace,
    吉凶: ln.isLucky === true ? '吉' : ln.isLucky === false ? '凶' : '中性',
  })),
  十二宫: palaceSummary,
}, null, 2)}

## 用户信息
- 出生：${birth.solarBirthDate}（公历）${birth.lunarOriginal ? `/ 农历 ${birth.lunarOriginal}` : ''} ${birth.timeMode === 'precise' ? birth.exactTime + ziweiTrueSolarInfo : birth.birthTime + '（模糊时辰）'}
- 出生地：${birth.birthPlace || '未提供'} | 性别：${birth.gender} | 当前约${currentAge}岁（${currentYear}年）
${birth.birthEnvironment ? `- 出生环境：${birth.birthEnvironment}` : ''}

## 引用规则（每段分析至少引用 2 条结构性证据）
> **不要**只用"命宫紫微好"这种笼统结论。每条结论必须附上**具体出处**（哪一宫、哪颗星、哪个四化、哪个已识别格局）。
> **输出中不要出现英文字段名**，全部用中文命理术语。

- **十二宫星曜**：每宫的星曜组合是核心论据。每颗星都带亮度（庙旺/平和/落陷）和四化（化禄/化权/化科/化忌）。
  - **六煞星必查**（擎羊、陀羅、火星、鈴星、地空、地劫）：落入哪宫即影响该宫主题，不可忽略
  - **桃花星组**（紅鸞、天喜、咸池、沐浴）：婚姻段必引
  - **吉星**（左輔、右弼、文昌、文曲、天魁、天鉞、化祿、化權、化科）：注意是否成对出现（左右、昌曲、魁鉞）
- **本命四化** + **大限四化**：四化是紫微的灵魂。大限四化叠加本命四化形成的"双化"现象务必点出（例如：本命武曲化忌+大限武曲化禄＝财运由凶转吉的关键节点）。
- **已识别格局**：程序已识别的格局（如紫府同宫、机月同梁、杀破狼、火铃贪格、刑忌夹印等），按等级影响整体格局判断。
- **身宫所在**：身宫主中年后人生重点，必须在总覽或性格段说明。
- **三方四正**：每宫看本宫 + 对宫（迁移/夫妻/财帛/官禄）+ 三合宫位的星曜叠加。论命时引用三方四正的关键星曜。

## 输出要求
- **formation**: 格局名称 + level(上格/中格/下格/凶格/普通) + 50+字分析（**必须引用**已识别格局中至少 1 个程序识别的格局作为支撑）
- **sections**：
  - **overview**(200+字)：紫微整体气象 + 命宫主星组合 + 身宫位置，**必须引用**命宫主星 + 亮度 + 本命四化中落入命宫的星曜
  - **personality**(100+字)：**必须引用**命宫主星性格特征 + 命宫六煞星（如有）影响 + 三方四正的辅助星
  - **career**(150+字)：**必须引用**官禄宫的主星 + 亮度 + 四化 + 该宫六煞星情况
  - **marriage**(150+字)：**必须引用**夫妻宫主星 + 亮度 + 桃花星组 + 化忌/化禄 + 该宫六煞星
  - **wealth**(150+字)：**必须引用**财帛宫主星 + 化禄/化忌的位置 + 武曲/天府/太阴等财星状态
  - **health**(100+字)：**必须引用**疾厄宫主星 + 该宫六煞星 + 三方四正不利组合
  - **family**(100+字)：**必须引用**父母宫 / 兄弟宫 / 子女宫的主星 + 该宫是否被六煞星占据或被四化忌冲击
- **daYunAnalysis**: 按大限逐步分析数组，**从第一个大限开始连续输出 8 步（共8步，覆盖约前80年），不可中途省略**，每步含年龄范围、天干、地支、主题(30+字)、四化叠加(30+字，**必须引用大限四化中该大限的四化叠加本命四化的具体结果**)、关键事件(2-3个)、建议
- **keyPredictions**: 3-5个具体可验证的人生事件预测（含年龄、事件、命理依据），依据必须引用具体宫位主星 + 大限四化叠加结果
- **keyAdvice**: 3-5条 | **luckyInfo**: 开运颜色 + 方位

数据以程序计算结果为准。请使用流年数据中的吉凶标记辅助识别关键流年。**禁止**笼统说"命宫好/不好"，必须落到具体星曜与四化。`

      return { chart: { chart, patterns }, userMessage }
    } catch (e) {
      console.error('Ziwei calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
  },

  merge(llmResult, { chart, patterns }) {
    // Version tag
    llmResult.version = 2

    llmResult.ziweiChart = {
      solarDate: chart.solarDate,
      lunarDate: chart.lunarDate,
      time: chart.time,
      timeRange: chart.timeRange,
      zodiac: chart.zodiac,
      sign: chart.sign,
      gender: chart.gender,
      fiveElementsClass: chart.fiveElementsClass,
      soul: chart.soul,
      body: chart.body,
      earthlyBranchOfSoulPalace: chart.earthlyBranchOfSoulPalace,
      earthlyBranchOfBodyPalace: chart.earthlyBranchOfBodyPalace,
      siHua: chart.siHua,
      detectedPatterns: patterns,
    }
    // Override palaces with programmatic star data, preserving LLM analysis.
    const llmPalaces = (llmResult.palaces || {}) as Record<string, { stars?: string[]; analysis?: string }>
    const mergedPalaces: Record<string, unknown> = {}
    for (const palace of chart.palaces) {
      const llmPalace = llmPalaces[palace.name] || {}
      mergedPalaces[palace.name] = {
        stars: [
          ...palace.majorStars.map(s => s.mutagen ? `${s.name}(${s.mutagen})` : s.name),
          ...palace.minorStars.map(s => s.mutagen ? `${s.name}(${s.mutagen})` : s.name),
        ],
        majorStars: palace.majorStars,
        minorStars: palace.minorStars,
        adjectiveStars: palace.adjectiveStars,
        heavenlyStem: palace.heavenlyStem,
        earthlyBranch: palace.earthlyBranch,
        isBodyPalace: palace.isBodyPalace,
        changsheng12: palace.changsheng12,
        decadal: palace.decadal,
        ages: palace.ages,
        analysis: llmPalace.analysis || '',
      }
    }
    llmResult.palaces = mergedPalaces
    // Rebuild mainStars from programmatic data.
    const mainStars: { name: string; palace: string; brightness?: string; mutagen?: string }[] = []
    for (const palace of chart.palaces) {
      for (const star of palace.majorStars) {
        mainStars.push({ name: star.name, palace: palace.name, brightness: star.brightness, mutagen: star.mutagen })
      }
    }
    llmResult.mainStars = mainStars

    // V2 fields
    if (chart.liuNian) llmResult.liuNian = chart.liuNian
    if (chart.decadalSiHua) llmResult.decadalSiHua = chart.decadalSiHua

    // Merge da yun stem/branch into daYunAnalysis if LLM provided it
    if (Array.isArray(llmResult.daYunAnalysis) && chart.decadalSiHua) {
      const analysis = llmResult.daYunAnalysis as Record<string, unknown>[]
      for (let i = 0; i < analysis.length && i < chart.decadalSiHua.length; i++) {
        analysis[i].heavenlyStem = chart.decadalSiHua[i].heavenlyStem
        analysis[i].earthlyBranch = chart.decadalSiHua[i].earthlyBranch
        analysis[i].ageRange = `${chart.decadalSiHua[i].range[0]}-${chart.decadalSiHua[i].range[1]}`
      }
    }
  },

  buildSchema(ctx) {
    return {
      ...(schemaToLLMTemplate(ziweiSchemaV2) as Record<string, unknown>),
      suggestedQuestions: getSuggestedQuestionsPrompt('ziwei', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
