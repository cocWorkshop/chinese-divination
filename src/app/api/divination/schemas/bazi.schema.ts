import { z } from 'zod'

const pillarSchema = z.object({
  stem: z.string().describe('天干'),
  branch: z.string().describe('地支'),
  element: z.string().describe('五行属性(金/木/水/火/土)'),
  nayin: z.string().describe('纳音'),
})

export const baziSchema = z.object({
  type: z.literal('bazi'),
  pillars: z.object({
    year: pillarSchema,
    month: z.object({
      stem: z.string().describe('天干'),
      branch: z.string().describe('地支'),
      element: z.string().describe('五行属性'),
      nayin: z.string().describe('纳音'),
    }),
    day: z.object({
      stem: z.string().describe('天干'),
      branch: z.string().describe('地支'),
      element: z.string().describe('五行属性'),
      nayin: z.string().describe('纳音'),
    }),
    hour: z.object({
      stem: z.string().describe('天干'),
      branch: z.string().describe('地支'),
      element: z.string().describe('五行属性'),
      nayin: z.string().describe('纳音'),
    }),
  }),
  dayMaster: z.object({
    stem: z.string().describe('日主天干'),
    element: z.string().describe('五行属性'),
    strength: z.string().describe('strong|weak|neutral'),
    strengthLabel: z.string().describe('身强/身弱/中和'),
  }),
  fiveElements: z.object({
    metal: z.number().default(0),
    wood: z.number().default(0),
    water: z.number().default(0),
    fire: z.number().default(0),
    earth: z.number().default(0),
  }),
  luckyElements: z.array(z.string()).default(['喜用五行']),
  avoidElements: z.array(z.string()).default(['忌神五行']),
  sections: z.object({
    overview: z.string().describe('命主性格与出身分析(200+字)：日主强弱、性格特征、家庭出身、六亲关系'),
    career: z.string().describe('事业官运分析(150+字)：适合行业、发展方向、贵人运'),
    marriage: z.string().describe('婚姻感情分析(150+字)：配偶特征、婚姻质量、感情运势'),
    wealth: z.string().describe('财运分析(150+字)：正财偏财、理财建议、财运高峰期'),
    health: z.string().describe('健康分析(100+字)：易患疾病、养生建议'),
    daYunDetail: z.string().describe('大运精批(300+字)：逐个分析每步大运（共8步），点出每步大运的重点领域和需注意的流年。格式：每步大运单独一段，标注起止年份'),
  }),
  keyAdvice: z.array(z.string()).default(['建议一', '建议二', '建议三']),
  luckyInfo: z.object({
    numbers: z.array(z.number()).default([1, 2]),
    colors: z.array(z.string()).default(['颜色']),
    directions: z.array(z.string()).default(['方位']),
  }),
})

export type BaziResult = z.infer<typeof baziSchema>
