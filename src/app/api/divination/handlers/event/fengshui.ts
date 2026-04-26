/**
 * Feng Shui (風水 / 玄空飛星) handler — event-based, deterministic chart.
 *
 * The local calculator (`calculateFlyingStars`) produces the 9-palace
 * flying-star grid + structural format flags (旺山旺向 / 上山下水 /
 * 雙星到向 / 伏吟 / 反吟). The LLM's job is interpretation only —
 * "given this specific palace combination, what does it mean for the
 * occupant" — not chart construction. Treating the chart as
 * deterministic input prevents the LLM from hallucinating star numbers
 * or claiming patterns that aren't actually on the board.
 *
 * Falls back to generic-prompt mode if the user didn't supply a
 * parseable direction or year (free-form question only).
 */

import { calculateFlyingStars, type FlyingStarChart } from '@/lib/fengshuiCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { buildGenericUserMessage } from '../_fallback'
import { fengshuiSchema } from '../../schemas/fengshui.schema'

export const fengshuiHandler: DivinationHandler<FlyingStarChart> = {
  chartKey: 'fengshui',
  schema: fengshuiSchema,
  canHandle: () => true,

  calculate(ctx: DivinationContext): CalculationResult<FlyingStarChart> {
    const direction = (ctx.inputData.direction as string | undefined) ?? ''
    const yearBuiltRaw = ctx.inputData.yearBuilt
    const yearBuilt =
      typeof yearBuiltRaw === 'number'
        ? yearBuiltRaw
        : typeof yearBuiltRaw === 'string' && yearBuiltRaw.trim().length > 0
          ? parseInt(yearBuiltRaw, 10)
          : NaN

    if (!direction || !Number.isFinite(yearBuilt)) {
      // Required inputs missing — fall back to free-form analysis.
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }

    let chart: FlyingStarChart
    try {
      chart = calculateFlyingStars({ year: yearBuilt, facing: direction })
    } catch (e) {
      console.error('Feng shui calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }

    // Patterns the calculator could detect (used in prompt as cite hints).
    const detectedPatterns: string[] = []
    if (chart.analysis.shuangWang) detectedPatterns.push('雙星到向（旺山旺向）')
    else {
      if (chart.analysis.wangShan) detectedPatterns.push('旺山')
      if (chart.analysis.wangXiang) detectedPatterns.push('旺向')
    }
    if (chart.analysis.shanShuiTong) detectedPatterns.push('上山下水（凶格）')
    if (chart.analysis.fuYin) detectedPatterns.push('伏吟（凶格）')
    if (chart.analysis.fanYin) detectedPatterns.push('反吟（凶格）')
    const ownerInfo = (ctx.inputData.ownerInfo as string | undefined)?.trim()

    const userMessage = `请为我进行玄空飞星风水排盘分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序预计算的玄空飞星盘（已验证准确，请直接使用，不要重新推算飞星数字）
${JSON.stringify({
  运期: chart.periodLabel,
  坐: chart.sitting,
  向: chart.facing,
  九宫飞星: chart.palaces.map(p => ({
    宫位: `${p.positionZh}（${p.gua}）`,
    五行: p.element,
    运盘星: p.baseStar,
    山星: p.mountainStar,
    向星: p.waterStar,
  })),
  已识别格局: detectedPatterns.length > 0 ? detectedPatterns : ['普通格局，未触发特殊格局'],
}, null, 2)}

## 用户输入
- 入伙年份：${yearBuilt}（${chart.periodLabel}）
- 朝向：${chart.facing}（坐${chart.sitting}）
${ownerInfo ? `- 居住者：${ownerInfo}` : ''}
${ctx.question ? `- 求测问题：${ctx.question}` : '- 求测问题：综合宅运分析'}

## 引用规则（每段分析至少引用 2 条结构性证据）
> **不要**笼统说"格局好/不好"。每条结论必须附上**具体出处**（哪个宫位、哪颗飞星组合、哪个已识别格局）。
> 程序给出的飞星数字是权威，**不要**自己重新排盘或修改星位。

- **格局判定**：必须引用「已识别格局」字段。${chart.analysis.shuangWang ? '本盘已识别为雙星到向（旺山旺向，上格），主人丁财两旺，分析时应该明确说出。' : ''}${chart.analysis.shanShuiTong ? '本盘为上山下水（凶格），主财丁两败，必须明确指出。' : ''}${chart.analysis.fuYin ? '本盘有伏吟，主长期不利，必须指出化解之道。' : ''}${chart.analysis.fanYin ? '本盘有反吟，主反复无常，必须指出。' : ''}
- **方位分析**：每个方位的判断必须落到具体的「山星-向星」组合，例如"东南宫山星 4 配向星 8，木生土泄"。不要只说"东南方位旺"。
- **财位**：必须指向具体宫位（向星为当令旺星 = ${chart.period} 的位置），不能笼统说"财位在某方"。
- **健康**：从坐山一边的山星组合分析（山主人丁），结合宫位五行。
- **化解**：针对凶位（向星 = 5 黄、2 黑、伏吟、反吟）给出具体的方位 + 五行化解物品。

## 输出要求
- **flyingStar**: facing/period/mountainStar/waterStar 四个字段（程序已计算，引用即可）
- **sections**: overall(100+字) wealth(100+字) health(100+字) relationships(100+字) — 每段必须按上面引用规则
- **rooms**: 主要房间能量评估数组（卧室/客厅/厨房/书房等），每条含 room/energy(旺/平/衰/煞)/suggestion
- **remedies**: 凶位 + 具体化解方案
- **keyAdvice**: 3-5 条核心建议`

    return { chart, userMessage }
  },

  merge(llmResult, chart) {
    // Inject the calculator's authoritative flying-star chart.
    // Pattern mirrors qimen / ziwei: rich chart object on `<chartKey>Chart`,
    // narrow summary on the field the schema declared.
    llmResult.fengshuiChart = chart
    llmResult.flyingStar = {
      facing: chart.facing,
      period: chart.periodLabel,
      mountainStar: String(chart.palaces.find(p => p.position === chart.sitting.split('/')[1])?.mountainStar ?? ''),
      waterStar: String(chart.palaces.find(p => p.position === chart.facing.split('/')[1])?.waterStar ?? ''),
    }
  },
}
