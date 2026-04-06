import { z } from 'zod'

const palaceAnalysis = z.object({
  stars: z.array(z.string()).default(['星名']),
  analysis: z.string().describe('分析(80-120字)'),
})

const emptyPalace = z.object({
  stars: z.array(z.string()).default([]),
  analysis: z.string().describe(''),
})

export const ziweiSchema = z.object({
  type: z.literal('ziwei'),
  mainStars: z.array(z.object({
    name: z.string().describe('紫微'),
    palace: z.string().describe('命宫'),
    element: z.string().describe('土'),
  })).default([{ name: '紫微', palace: '命宫', element: '土' }]),
  patterns: z.array(z.object({
    name: z.string().describe('格局名'),
    level: z.string().describe('上格/中格/下格'),
    description: z.string().describe('格局说明'),
  })).default([{ name: '格局名', level: '上格/中格/下格', description: '格局说明' }]),
  palaces: z.object({
    '命宫': palaceAnalysis,
    '财帛': emptyPalace,
    '官禄': emptyPalace,
    '夫妻': emptyPalace,
    '兄弟': emptyPalace,
    '子女': emptyPalace,
    '疾厄': emptyPalace,
    '迁移': emptyPalace,
    '仆役': emptyPalace,
    '田宅': emptyPalace,
    '福德': emptyPalace,
    '父母': emptyPalace,
  }),
  sections: z.object({
    overview: z.string().describe('命盘总论：格局判定+命宫主星+身宫+五行局'),
    personality: z.string().describe('性格深析：命宫(外在)vs福德宫(内在)对比'),
    career: z.string().describe('事业分析：官禄宫+三方四正+适合行业'),
    marriage: z.string().describe('婚姻分析：配偶特征推断+婚姻模式+最佳婚期'),
    wealth: z.string().describe('财运分析：正财偏财+理财方式+财运高峰低谷期'),
    health: z.string().describe('健康分析：疾厄宫主星对应身体系统+注意年龄段'),
    family: z.string().describe('六亲分析：父母/兄弟/子女特征推断'),
    dayun: z.string().describe('大运精批：逐个大运分析，标注当前大运'),
  }),
  keyPredictions: z.array(z.object({
    age: z.string().describe('28岁'),
    event: z.string().describe('事件描述'),
    basis: z.string().describe('命理依据'),
  })).default([{ age: '28岁', event: '事件描述', basis: '命理依据' }]),
  keyAdvice: z.array(z.string()).default(['建议一', '建议二']),
  luckyInfo: z.object({
    numbers: z.array(z.number()).default([]),
    colors: z.array(z.string()).default([]),
    directions: z.array(z.string()).default([]),
  }),
})

export type ZiweiResult = z.infer<typeof ziweiSchema>
