import { z } from 'zod'

// Trigram shape — shared between original/variant hexagrams.
const trigramSchema = z.object({
  name: z.string().describe('卦名（乾/坤/震/巽/坎/離/艮/兌）'),
  symbol: z.string().describe('☰/☷/...'),
  element: z.string().describe('五行/自然象'),
})

// Hexagram shape — used for both original and variant. Lines are
// bottom-to-top; 1 = yang (solid), 0 = yin (broken). Numbers are King Wen
// 1-64. The backend overrides these via merge() — the LLM should only
// describe meaning, not invent line patterns.
const hexagramSchema = z.object({
  number: z.number().default(1).describe('卦序 1-64'),
  name: z.string().describe('卦名(单字)'),
  chineseName: z.string().describe('卦全名如风雷益'),
  upperTrigram: trigramSchema,
  lowerTrigram: trigramSchema,
  lines: z.array(z.number()).default([1, 0, 1, 1, 0, 1]),
})

// Field order matches streaming render order:
//   ① Chart drawer: outcome → hexagram → variant → judgment → image
//   ② Overview: interpretation
//   ③ Analysis: changingLines → variantInsight → advice
//   ④ Footer: keyPoints
export const ichingSchema = z.object({
  type: z.literal('iching'),
  outcome: z.string().describe('吉/凶/中/大吉/小凶'),
  hexagram: hexagramSchema,
  /** 之卦 — only present when changing lines exist. */
  variant: hexagramSchema.optional(),
  /** Raw 6/7/8/9 line values from the cast (bottom-to-top). */
  lineValues: z.array(z.number()).optional(),
  /** Position numbers (1-6) of changing lines. */
  changingLineNumbers: z.array(z.number()).optional(),
  judgment: z.string().describe('卦辞原文（直接引用程序提供的本卦卦辞）'),
  image: z.string().describe('象辞解析（结合大象传与问题展开）'),
  interpretation: z.string().describe('针对问题的解读(150+字，须先引用本卦卦辞，再点出关键意象)'),
  /** Per-changing-line analysis. Keep position aligned with `changingLineNumbers`. */
  changingLines: z.array(z.object({
    position: z.number().default(3),
    text: z.string().describe('该爻的具体含义与对问题的提示（80+字）'),
  })).default([]),
  /** 之卦综合启示 — only required when variant exists. */
  variantInsight: z.string().optional().describe('之卦走向：当前局势演变到哪里，下一步重点（80+字）'),
  advice: z.string().describe('具体建议(150+字，紧贴卦象，避免空泛口号)'),
  keyPoints: z.array(z.string()).default(['要点一', '要点二', '要点三']),
})

export type IChingResult = z.infer<typeof ichingSchema>
