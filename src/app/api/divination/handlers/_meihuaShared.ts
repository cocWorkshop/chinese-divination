/**
 * Shared schema + merge logic for both Meihua handlers:
 *   - personal/other.ts (birth-date based)
 *   - event/meihua.ts (readingDateTime based)
 *
 * Both produce the same chart shape and merge the same way.
 */

import type { MeihuaChart } from '@/lib/meihuaCalculator'

export function mergeMeihuaChart(
  llmResult: Record<string, unknown>,
  chart: MeihuaChart
): void {
  llmResult.meihuaChart = {
    lunarYear: chart.lunarYear,
    lunarMonth: chart.lunarMonth,
    lunarDay: chart.lunarDay,
    shichen: chart.shichen,
    yearBranch: chart.yearBranch,
    yearNum: chart.yearNum,
    monthNum: chart.monthNum,
    dayNum: chart.dayNum,
    hourNum: chart.hourNum,
    upperNum: chart.upperNum,
    lowerNum: chart.lowerNum,
    changingLine: chart.changingLine,
    benGua: chart.benGua,
    huGua: chart.huGua,
    bianGua: chart.bianGua,
    tiGua: chart.tiGua,
    yongGua: chart.yongGua,
    tiYongRelation: chart.tiYongRelation,
    tiYongAnalysis: chart.tiYongAnalysis,
  }
  llmResult.trigrams = {
    upper: { name: chart.benGua.upper.name, symbol: chart.benGua.upper.symbol, element: chart.benGua.upper.element },
    lower: { name: chart.benGua.lower.name, symbol: chart.benGua.lower.symbol, element: chart.benGua.lower.element },
    transformed: { name: chart.bianGua.upper.name, symbol: chart.bianGua.upper.symbol, element: chart.bianGua.upper.element },
  }
  if (!llmResult.subType) {
    llmResult.subType = 'meihua'
  }
}

/** Shared meihua user-message body (after the calculation JSON). */
export function meihuaChartJson(chart: MeihuaChart): string {
  return JSON.stringify({
    timeNumbers: {
      lunarYear: chart.lunarYear,
      lunarMonth: chart.lunarMonth,
      lunarDay: chart.lunarDay,
      yearBranch: chart.yearBranch,
      yearNum: chart.yearNum,
      monthNum: chart.monthNum,
      dayNum: chart.dayNum,
      hourNum: chart.hourNum,
    },
    calculation: {
      upperSum: `${chart.yearNum}+${chart.monthNum}+${chart.dayNum}=${chart.yearNum + chart.monthNum + chart.dayNum}, %8=${chart.upperNum}`,
      lowerSum: `${chart.yearNum}+${chart.monthNum}+${chart.dayNum}+${chart.hourNum}=${chart.yearNum + chart.monthNum + chart.dayNum + chart.hourNum}, %8=${chart.lowerNum}`,
      changingLine: chart.changingLine,
    },
    benGua: { name: chart.benGua.name, upper: chart.benGua.upper.name, lower: chart.benGua.lower.name, lines: chart.benGua.lines },
    huGua: { name: chart.huGua.name, upper: chart.huGua.upper.name, lower: chart.huGua.lower.name },
    bianGua: { name: chart.bianGua.name, upper: chart.bianGua.upper.name, lower: chart.bianGua.lower.name },
    tiYong: {
      tiGua: `${chart.tiGua.name}(${chart.tiGua.element})`,
      yongGua: `${chart.yongGua.name}(${chart.yongGua.element})`,
      relation: chart.tiYongRelation,
      analysis: chart.tiYongAnalysis,
    },
  }, null, 2)
}

/** Shared "解卦要求" block referencing the chart's gua names. */
export function meihuaAnalysisInstructions(chart: MeihuaChart): string {
  return `## 解卦要求
你是资深梅花易数术数师，请基于以上程序排出的卦象进行分析。重点：
1. **situation**：本卦（${chart.benGua.name}）的卦象含义和当前处境分析（100字以上）
2. **inquiry**：用卦分析，以动爻变化论述所问之事（100字以上）
3. **interaction**：体用生克关系详析（${chart.tiYongRelation}），结合互卦（${chart.huGua.name}）论中期发展（100字以上）
4. **timeline**：结合变卦（${chart.bianGua.name}）推断事物最终走向和应期（100字以上）

同时设置subType为"meihua"。卦象数据以程序计算结果为准，你只负责解卦分析。
关于trigrams字段：upper对应体卦，lower对应用卦，transformed对应变卦。`
}
