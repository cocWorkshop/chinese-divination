import { z } from 'zod'

export const fallbackSchema = z.object({
  type: z.literal('other'),
  sections: z.object({
    overview: z.string().describe('整体分析(150+字)'),
    key: z.string().describe('关键要点(100+字)'),
    advice: z.string().describe('建议(100+字)'),
  }),
  keyAdvice: z.array(z.string()).default(['建议一', '建议二', '建议三']),
  outcome: z.string().describe('吉/凶/中'),
})

export type FallbackResult = z.infer<typeof fallbackSchema>
