import { z } from 'zod'

export const qimenSchema = z.object({
  type: z.literal('qimen'),
  palace: z.object({
    inquiry: z.string().describe('问事宫'),
    outcome: z.string().describe('结果宫'),
    god: z.string().describe('值符神'),
    star: z.string().describe('值符星'),
    door: z.string().describe('当值门'),
  }),
  sections: z.object({
    situation: z.string().describe('当前局势(100+字)'),
    trend: z.string().describe('事态走向(100+字)'),
    timing: z.string().describe('最佳时机(100+字)'),
    strategy: z.string().describe('行动策略(100+字)'),
  }),
  outcome: z.string().describe('吉/凶/中'),
  keyAdvice: z.array(z.string()).default(['建议一', '建议二']),
  luckyInfo: z.object({
    timing: z.string().describe('宜在...'),
    direction: z.string().describe('向...方行动'),
  }),
})

export type QimenResult = z.infer<typeof qimenSchema>
