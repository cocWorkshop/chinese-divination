import { z } from 'zod'

export const liuyaoSchema = z.object({
  type: z.literal('liuyao'),
  guaCi: z.string().describe('卦辞原文及解析(100字以上)'),
  yaoCi: z.string().describe('相关爻辞解析(100字以上，重点变爻)'),
  interpretation: z.string().describe('针对问题的综合解读(200字以上)'),
  sixRelativeAnalysis: z.string().describe('六亲分析：用神、原神、忌神、仇神关系(150字以上)'),
  shiYingAnalysis: z.string().describe('世应分析(100字以上)'),
  changingAnalysis: z.string().describe('变卦分析(若有变爻，100字以上)'),
  timing: z.string().describe('应期判断：事情可能发生的时间(50字以上)'),
  advice: z.string().describe('具体建议(100字以上)'),
  outcome: z.string().describe('吉/凶/中/大吉/小凶'),
  keyPoints: z.array(z.string()).default(['要点一', '要点二', '要点三']),
})

export type LiuyaoResult = z.infer<typeof liuyaoSchema>
