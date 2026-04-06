import { z } from 'zod'

export const ichingSchema = z.object({
  type: z.literal('iching'),
  hexagram: z.object({
    number: z.number().default(1),
    name: z.string().describe('卦名(单字)'),
    chineseName: z.string().describe('卦全名如风雷益'),
    upperTrigram: z.object({
      name: z.string().describe('上卦名'),
      symbol: z.string().describe('☰'),
      element: z.string().describe('风/雷/水/火/山/泽/天/地'),
    }),
    lowerTrigram: z.object({
      name: z.string().describe('下卦名'),
      symbol: z.string().describe('☷'),
      element: z.string().describe('五行'),
    }),
    lines: z.array(z.number()).default([1, 0, 1, 1, 0, 1]),
  }),
  judgment: z.string().describe('卦辞原文'),
  image: z.string().describe('象辞解析'),
  interpretation: z.string().describe('针对问题的解读(100+字)'),
  changingLines: z.array(z.object({
    position: z.number().default(3),
    text: z.string().describe('变爻说明'),
  })).default([{ position: 3, text: '变爻说明' }]),
  advice: z.string().describe('具体建议(100+字)'),
  outcome: z.string().describe('吉/凶/中/大吉/小凶'),
  keyPoints: z.array(z.string()).default(['要点一', '要点二', '要点三']),
})

export type IChingResult = z.infer<typeof ichingSchema>
