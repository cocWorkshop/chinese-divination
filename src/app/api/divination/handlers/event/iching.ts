/**
 * I Ching (易經) handler — event-based, deterministic cast.
 *
 * Was previously LLM-only — the frontend rolled `Math.random()*64` and
 * the server told the LLM "interpret hexagram N", which produced two
 * recurring failure modes:
 *   1. Wrong-hexagram drift — the LLM occasionally describes the wrong
 *      hexagram with details from N±1.
 *   2. 卦辭 / 象辭 / 爻辭 cross-mixing.
 *
 * The calculator owns the cast (proper three-coin method, 6 lines,
 * changing lines, variant hexagram) plus canonical 卦辭 + 大象 lookup.
 * The LLM only interprets.
 *
 * Input shapes the handler accepts on `inputData`:
 *   - `ichingLines`: JSON string of 6 line values, each ∈ {6,7,8,9}
 *     (bottom-to-top). Preferred — supports changing lines + variant.
 *   - `hexagram`: legacy single number 1-64 — synthesized into a no-
 *     changes cast for backward compat with old frontends.
 */

import { interpretCast, castFromNumber, type CastResult } from '@/lib/ichingCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { buildGenericUserMessage } from '../_fallback'
import { ichingSchema } from '../../schemas/iching.schema'

function parseLineValues(raw: unknown): number[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length !== 6) return null
    // Frontend stores either [{coins, value}, ...] or [6,7,8,9,...].
    const values: number[] = parsed.map((entry: unknown) => {
      if (typeof entry === 'number') return entry
      if (entry && typeof entry === 'object' && typeof (entry as { value?: unknown }).value === 'number') {
        return (entry as { value: number }).value
      }
      return NaN
    })
    if (values.some((v) => !Number.isFinite(v) || v < 6 || v > 9)) return null
    return values
  } catch {
    return null
  }
}

function buildCast(ctx: DivinationContext): CastResult | null {
  const lineValues = parseLineValues(ctx.inputData.ichingLines)
  if (lineValues) {
    try { return interpretCast(lineValues) } catch { return null }
  }
  // Legacy: numeric `hexagram` field — synthesize a no-changes cast.
  const raw = ctx.inputData.hexagram
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 1 && n <= 64) {
    try { return castFromNumber(n) } catch { return null }
  }
  return null
}

export const ichingHandler: DivinationHandler<CastResult> = {
  chartKey: 'iching',
  schema: ichingSchema,
  canHandle: () => true,

  calculate(ctx: DivinationContext): CalculationResult<CastResult> {
    const cast = buildCast(ctx)
    if (!cast) {
      // No usable cast input — fall back to generic prompt.
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }

    const { original, variant, changingLines, lineValues } = cast
    const yaoLabels = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
    const valueMeaning: Record<number, string> = {
      6: '老陰（變爻，由陰轉陽）',
      7: '少陽（不變）',
      8: '少陰（不變）',
      9: '老陽（變爻，由陽轉陰）',
    }

    const linesDetail = lineValues.map((v, i) => ({
      位置: yaoLabels[i],
      值: v,
      含義: valueMeaning[v],
    }))

    const chartBlock = {
      本卦: {
        卦序: original.number,
        卦名: original.name,
        全名: original.fullName,
        上卦: `${original.upper.name}（${original.upper.symbol} ${original.upper.nature}）`,
        下卦: `${original.lower.name}（${original.lower.symbol} ${original.lower.nature}）`,
        卦辭: original.judgment,
        大象: original.image,
      },
      變爻: changingLines.length > 0
        ? changingLines.map((p) => `${yaoLabels[p - 1]}（位置${p}）`)
        : ['無變爻（六爻皆靜）'],
      之卦: variant
        ? {
            卦序: variant.number,
            卦名: variant.name,
            全名: variant.fullName,
            卦辭: variant.judgment,
            大象: variant.image,
          }
        : '無之卦',
      六爻組成: linesDetail,
    }

    const userMessage = `请为我进行《易经》卦象解读。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序起卦結果（三枚銅錢法，已驗證準確，請直接使用，不要重新起卦）
${JSON.stringify(chartBlock, null, 2)}

## 用戶問題
${ctx.question ? ctx.question : '（用戶未填寫具體問題，請就本卦象徵作综合解讀）'}

## 引用规则（每段解读至少引用 2 条结构性证据）
> **不要**笼统说"这卦不错/不好"。每条结论必须附上**具体出处**（卦辞原文、大象传、上下卦象、变爻位置、之卦走向）。
> 程序给出的卦序/卦名/卦辞/大象/变爻/之卦是权威，**不要**自己重新推算或修改。
> 若无变爻，则以本卦卦辞 + 大象为主；若有变爻，必须解释变爻含义并引用之卦走向。

- **卦象解读 (interpretation)**：先**直接引用本卦卦辭原文**，再用 1-2 句拆解关键字（如"利涉大川"、"亨"），最后落到用户问题。
- **变爻分析 (changingLines.text)**：${changingLines.length > 0 ? `本卦有${changingLines.length}个变爻——必须逐爻解释，包括位置（${changingLines.map(p => yaoLabels[p - 1]).join('、')}）的传统含义、与问题的关联、以及变爻指向之卦的暗示。` : '本卦六爻皆静，**不要**编造变爻——changingLines 字段返回空数组 []。'}
- **之卦走向 (variantInsight)**：${variant ? `必须引用之卦${variant.fullName}（${variant.name}）的卦辭，并说明从本卦演化到之卦意味着什么。` : '无变爻则**省略** variantInsight 字段。'}
- **建议 (advice)**：紧贴卦象元素（上下卦自然象、五行）。例如本卦上${original.upper.name}（${original.upper.nature}）下${original.lower.name}（${original.lower.nature}），${original.upper.element}${original.lower.element}相互作用，建议应顺势而为。**不要**写"保持积极心态"这类空泛口号。
- **吉凶判定 (outcome)**：综合本卦+变爻+之卦——若本卦凶但之卦吉，可标"中"；若变爻多且方向冲突，标"中"。

## 输出要求
- **hexagram**: 本卦完整字段（程序已计算，直接复用）
- **variant**: ${variant ? '之卦完整字段（程序已计算，直接复用）' : '省略本字段'}
- **lineValues**: ${JSON.stringify(lineValues)}（程序已计算）
- **changingLineNumbers**: ${JSON.stringify(changingLines)}（程序已计算）
- **judgment**: 直接复用程序提供的本卦卦辞原文：「${original.judgment}」
- **image**: 结合大象传「${original.image}」展开 50+ 字解析
- **interpretation**: 150+ 字，按引用规则
- **changingLines**: ${changingLines.length > 0 ? `${changingLines.length} 条，每条 80+ 字` : '空数组'}
- **variantInsight**: ${variant ? '80+ 字，按引用规则' : '省略'}
- **advice**: 150+ 字，紧贴卦象
- **outcome**: 吉 / 凶 / 中 / 大吉 / 小凶 之一
- **keyPoints**: 3-5 条核心要点，每条一句话`

    return { chart: cast, userMessage }
  },

  merge(llmResult, cast) {
    // Inject the calculator's authoritative hexagram(s). The LLM's
    // hexagram structure (number/name/lines) gets overwritten — only
    // the prose fields (interpretation/advice/keyPoints) are kept from
    // the LLM. This eliminates the wrong-hexagram drift that was the
    // top failure mode of the LLM-only version.
    const { original, variant, lineValues, changingLines } = cast
    llmResult.hexagram = {
      number: original.number,
      name: original.name,
      chineseName: original.fullName,
      upperTrigram: {
        name: original.upper.name,
        symbol: original.upper.symbol,
        element: original.upper.element,
      },
      lowerTrigram: {
        name: original.lower.name,
        symbol: original.lower.symbol,
        element: original.lower.element,
      },
      lines: original.lines,
    }
    if (variant) {
      llmResult.variant = {
        number: variant.number,
        name: variant.name,
        chineseName: variant.fullName,
        upperTrigram: {
          name: variant.upper.name,
          symbol: variant.upper.symbol,
          element: variant.upper.element,
        },
        lowerTrigram: {
          name: variant.lower.name,
          symbol: variant.lower.symbol,
          element: variant.lower.element,
        },
        lines: variant.lines,
      }
    }
    llmResult.lineValues = lineValues
    llmResult.changingLineNumbers = changingLines
    // Enforce canonical 卦辭 — guard against LLM rewriting it.
    llmResult.judgment = original.judgment
  },
}
