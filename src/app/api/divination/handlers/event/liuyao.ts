/**
 * Liu Yao (六爻) handler — event-based type.
 *
 * Requires: inputData.liuyaoLines (JSON-stringified array of 6 line values).
 */

import { calculateLiuYao, type LiuYaoChart } from '@/lib/liuyaoCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { buildGenericUserMessage } from '../_fallback'
import { liuyaoSchema } from '../../schemas/liuyao.schema'

export const liuyaoHandler: DivinationHandler<LiuYaoChart> = {
  chartKey: 'liuyao',
  schema: liuyaoSchema,

  canHandle(ctx) {
    return !!ctx.inputData.liuyaoLines
  },

  calculate(ctx): CalculationResult<LiuYaoChart> {
    try {
      const rawLines = JSON.parse(ctx.inputData.liuyaoLines as string)
      const chart = calculateLiuYao(rawLines)
      const orig = chart.originalHexagram
      const changed = chart.changedHexagram

      const userMessage = `请为我进行六爻占卜解卦。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序预计算的六爻卦象（已验证准确，请直接使用）
${JSON.stringify({
  originalHexagram: {
    name: orig.name,
    fullName: orig.fullName,
    number: orig.number,
    palace: orig.palace,
    palaceElement: orig.palaceElement,
    upperTrigram: { name: orig.upperTrigram.name, symbol: orig.upperTrigram.symbol, element: orig.upperTrigram.element, nature: orig.upperTrigram.nature },
    lowerTrigram: { name: orig.lowerTrigram.name, symbol: orig.lowerTrigram.symbol, element: orig.lowerTrigram.element, nature: orig.lowerTrigram.nature },
    lines: orig.lines.map(l => ({
      position: l.position,
      yaoName: l.yaoName,
      value: l.value,
      isYang: l.isYang,
      isChanging: l.isChanging,
      branch: l.branch,
      element: l.element,
      sixRelative: l.sixRelative,
      isShiYao: l.isShiYao,
      isYingYao: l.isYingYao,
    })),
  },
  changedHexagram: changed ? {
    name: changed.name,
    fullName: changed.fullName,
    number: changed.number,
    lines: changed.lines.map(l => ({
      position: l.position,
      branch: l.branch,
      element: l.element,
      sixRelative: l.sixRelative,
    })),
  } : null,
  changingLines: chart.changingLines,
  castTime: chart.castTime,
}, null, 2)}

## 用户问题
${ctx.question || '综合问事'}

## 解卦要求
你是资深六爻术数师，请基于以上程序排出的卦象进行断卦。重点：
1. **guaCi**：本卦（${orig.fullName}）卦辞及解析（100字以上）
2. **yaoCi**：相关爻辞解析，重点变爻（100字以上）
3. **interpretation**：针对问题的综合解读，结合六亲、世应、用神分析（200字以上）
4. **sixRelativeAnalysis**：六亲关系分析——确定用神、原神、忌神、仇神（150字以上）
5. **shiYingAnalysis**：世应分析——世爻代表求卦人，应爻代表对方/事物（100字以上）
${changed ? `6. **changingAnalysis**：变卦（${changed.fullName}）分析——事物最终走向（100字以上）` : ''}
7. **timing**：应期判断——事情可能发生的时间（50字以上）
8. **advice**：具体建议（100字以上）

卦象数据以程序计算结果为准，你只负责解卦分析。`

      return { chart, userMessage }
    } catch (e) {
      console.error('LiuYao calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx, '进行六爻占卜分析') }
    }
  },

  // Inject the deterministic hexagram into the result at the root level the
  // renderer reads (originalHexagram / changedHexagram / changingLines).
  // Without this the chart only lived in Reading.calculationData and never
  // reached Reading.result, so saved/shared/streamed readings rendered the
  // prose but no hexagram at all. (Mirrors the iching handler's merge.)
  // NOTE: do NOT tag version:2 — that flag routes bazi/ziwei to their V2
  // components; liuyao must stay on its own renderer.
  merge(llmResult, chart) {
    const mapHex = (h: LiuYaoChart['originalHexagram']) => ({
      name: h.name,
      fullName: h.fullName,
      number: h.number,
      palace: h.palace,
      palaceElement: h.palaceElement,
      upperTrigram: { name: h.upperTrigram.name, symbol: h.upperTrigram.symbol, element: h.upperTrigram.element, nature: h.upperTrigram.nature },
      lowerTrigram: { name: h.lowerTrigram.name, symbol: h.lowerTrigram.symbol, element: h.lowerTrigram.element, nature: h.lowerTrigram.nature },
      lines: h.lines,
    })
    llmResult.originalHexagram = mapHex(chart.originalHexagram)
    llmResult.changedHexagram = chart.changedHexagram ? mapHex(chart.changedHexagram) : null
    llmResult.changingLines = chart.changingLines
  },
}
