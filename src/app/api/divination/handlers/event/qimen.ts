/**
 * Qi Men Dun Jia (奇門遁甲) handler — event-based type.
 *
 * Uses a moment in time (readingDateTime | dateTime | clientDate) to cast
 * the 9-palace chart. No birth-profile inputs.
 */

import { calculateQimen, type QimenChart } from '@/lib/qimenCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { buildGenericUserMessage } from '../_fallback'
import { qimenSchema } from '../../schemas/qimen.schema'

export const qimenHandler: DivinationHandler<QimenChart> = {
  chartKey: 'qimen',
  schema: qimenSchema,

  canHandle: () => true, // qimen always usable — falls back to current time.

  calculate(ctx): CalculationResult<QimenChart> {
    try {
      const qimenTime = ctx.inputData.readingDateTime
        ? new Date(ctx.inputData.readingDateTime as string)
        : (ctx.inputData.dateTime ? new Date(ctx.inputData.dateTime as string) : ctx.clientDate)
      const chart = calculateQimen(qimenTime)

      const userMessage = `请为我进行奇门遁甲排盘分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序预计算的奇门遁甲盘（已验证准确，请直接使用）
${JSON.stringify({
  timeInfo: {
    year: chart.year,
    month: chart.month,
    day: chart.day,
    hour: chart.hour,
    solarTerm: chart.solarTerm,
    roundLabel: chart.roundLabel,
  },
  zhiFu: chart.zhiFu,
  zhiShi: chart.zhiShi,
  palaces: chart.palaces.map(p => ({
    name: p.name,
    direction: p.direction,
    star: p.star,
    door: p.door,
    divinity: p.divinity,
    heavenStem: p.heavenStem,
    earthStem: p.earthStem,
  })),
  patterns: chart.patterns.map(p => ({
    name: p.name,
    type: p.type,
    palace: p.palace,
    description: p.description,
  })),
}, null, 2)}

## 用户输入
- 起局时间：${chart.year}年 ${chart.month}月 ${chart.day}日 ${chart.hour}时
- 节气：${chart.solarTerm}
- 局数：${chart.roundLabel}
${ctx.question ? `- 求测问题：${ctx.question}` : '- 求测问题：综合运势'}

## 解盘要求
你是资深奇门遁甲术数师，请基于以上程序排出的奇门盘进行分析。重点：
1. **situation**：分析当前格局，值符${chart.zhiFu}和值使${chart.zhiShi}的含义${chart.patterns.length > 0 ? `，重点分析已检测到的格局：${chart.patterns.map(p => p.name).join('、')}` : ''}（100字以上）
2. **trend**：从九宫格局分析事态走向，特别关注天盘与地盘天干的关系（100字以上）
3. **timing**：根据八门旺衰判断最佳时机（100字以上）
4. **strategy**：综合星、门、神给出行动策略（100字以上）

同时请判断整体吉凶(outcome字段)，并确定palace字段中的inquiry(问事宫)、outcome(结果宫)、god(值符神)、star(值符星)、door(当值门)。
九宫数据以程序计算结果为准，你只负责解盘分析。`
      return { chart, userMessage }
    } catch (e) {
      console.error('Qimen calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
  },

  merge(llmResult, chart) {
    llmResult.qimenChart = {
      year: chart.year,
      month: chart.month,
      day: chart.day,
      hour: chart.hour,
      solarTerm: chart.solarTerm,
      round: chart.round,
      roundLabel: chart.roundLabel,
      zhiFu: chart.zhiFu,
      zhiShi: chart.zhiShi,
      palaces: chart.palaces,
      grid: chart.grid,
      patterns: chart.patterns,
    }
  },

}
