import { z } from 'zod'

const trigramSchema = z.object({
  name: z.string().describe('卦名'),
  symbol: z.string().describe('☰'),
  element: z.string().describe('五行'),
})

export const meihuaSchema = z.object({
  subType: z.string().describe('meihua'),
  trigrams: z.object({
    upper: trigramSchema,
    lower: z.object({
      name: z.string().describe('卦名'),
      symbol: z.string().describe('☷'),
      element: z.string().describe('五行'),
    }),
    transformed: z.object({
      name: z.string().describe('卦名'),
      symbol: z.string().describe('☵'),
      element: z.string().describe('五行'),
    }),
  }),
  sections: z.object({
    situation: z.string().describe('体卦分析(100+字)'),
    inquiry: z.string().describe('用卦分析(100+字)'),
    interaction: z.string().describe('体用关系(100+字)'),
    timeline: z.string().describe('时间推断(100+字)'),
  }),
  outcome: z.string().describe('吉/凶/中'),
  keyAdvice: z.array(z.string()).default(['建议一', '建议二', '建议三']),
})

export type MeihuaResult = z.infer<typeof meihuaSchema>
