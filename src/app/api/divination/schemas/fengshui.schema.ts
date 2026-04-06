import { z } from 'zod'

export const fengshuiSchema = z.object({
  type: z.literal('fengshui'),
  flyingStar: z.object({
    facing: z.string().describe('坐向如坐北朝南'),
    period: z.string().describe('一运到九运'),
    mountainStar: z.string().describe('山星数字'),
    waterStar: z.string().describe('向星数字'),
  }),
  rooms: z.array(z.object({
    room: z.string().describe('房间名'),
    energy: z.string().describe('旺/平/衰/煞'),
    suggestion: z.string().describe('建议'),
  })).default([{ room: '房间名', energy: '旺/平/衰/煞', suggestion: '建议' }]),
  sections: z.object({
    overall: z.string().describe('整体格局(100+字)'),
    wealth: z.string().describe('财位(100+字)'),
    health: z.string().describe('健康(100+字)'),
    relationships: z.string().describe('人际感情(100+字)'),
  }),
  remedies: z.array(z.object({
    issue: z.string().describe('问题'),
    solution: z.string().describe('解决方案'),
  })).default([{ issue: '问题', solution: '解决方案' }]),
  keyAdvice: z.array(z.string()).default(['建议一', '建议二']),
})

export type FengshuiResult = z.infer<typeof fengshuiSchema>
