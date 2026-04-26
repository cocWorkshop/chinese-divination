import { z } from 'zod'

// ─── V1 Schema (kept for old readings compatibility) ────────────────────────

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

// ─── V2 Schema ──────────────────────────────────────────────────────────────

const pillarSchemaV2 = z.object({
  stem: z.string().describe('天干'),
  branch: z.string().describe('地支'),
  element: z.string().describe('五行属性(金/木/水/火/土)'),
  nayin: z.string().describe('纳音'),
})

const daYunEntrySchema = z.object({
  stem: z.string().describe('大运天干'),
  branch: z.string().describe('大运地支'),
  startAge: z.number().describe('起始年龄'),
  endAge: z.number().describe('结束年龄'),
  startYear: z.number().describe('起始公历年'),
  endYear: z.number().describe('结束公历年'),
  theme: z.string().describe('该步大运核心主题(30+字)：十神定性+对命局影响'),
  interactions: z.string().describe('与原局互动(30+字)：合/冲/刑影响哪柱哪领域'),
  keyYears: z.array(z.object({
    year: z.number().describe('公历年'),
    ganZhi: z.string().describe('流年干支，如"乙巳"'),
    event: z.string().describe('为什么这年重要(20+字)'),
  })).describe('该步大运中最关键的2-3个流年'),
  advice: z.string().describe('行动建议(20+字)：具体适合/避免什么'),
})

export const baziSchemaV2 = z.object({
  type: z.literal('bazi'),
  version: z.literal(2),

  // merge-injected fields (not from LLM, but included for schema completeness)
  pillars: z.object({
    year: pillarSchemaV2,
    month: pillarSchemaV2,
    day: pillarSchemaV2,
    hour: pillarSchemaV2,
  }),
  dayMaster: z.object({
    stem: z.string().describe('日主天干'),
    element: z.string().describe('五行属性'),
    strength: z.string().describe('strong/weak/neutral'),
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

  // LLM-generated fields
  formation: z.object({
    name: z.string().describe('格局名称，如"正官格"、"食神制杀格"、"官印相生格"'),
    analysis: z.string().describe('格局简析(50+字)：为什么是此格局，格局成败，对命主的核心影响'),
  }),
  seasonalNote: z.string().describe('调候分析(30+字)：出生季节寒暖对命局的影响，是否有调候用神').optional(),

  sections: z.object({
    overview: z.string().describe('命主性格与出身(200+字)：格局定性、性格、家庭、六亲'),
    career: z.string().describe('事业官运(150+字)：适合行业、贵人运、发展路线'),
    marriage: z.string().describe('婚姻感情(150+字)：配偶特征、婚期提示、感情风险'),
    wealth: z.string().describe('财运分析(150+字)：正偏财、理财、财运高峰期'),
    health: z.string().describe('健康分析(100+字)：具体器官、高风险时段、养生方向'),
  }),

  daYunAnalysis: z.array(daYunEntrySchema).describe('逐步大运精批（共8步），每步含主题、互动、关键流年、建议'),

  branchAnalysis: z.string().describe('原局地支关系解读(50+字)：基于预计算冲/合/害/刑数据的影响分析').optional(),

  keyPredictions: z.array(z.object({
    age: z.string().describe('格式："36歲（2024年）" 或 "46-50歲（2034-2038年）"，如果覆盖当前年份加"當前"如"38歲（2026年，當前）"'),
    event: z.string().describe('具体事件描述'),
    basis: z.string().describe('命理依据（十神+大运+流年干支）'),
  })).describe('3-5个关键人生节点预测，从大运/流年中提炼最重要的转折点').default([]),

  keyAdvice: z.array(z.string()).default(['建议一', '建议二', '建议三']),
  luckyInfo: z.object({
    colors: z.array(z.string()).default(['颜色']),
    directions: z.array(z.string()).default(['方位']),
  }),
})

export type BaziResultV2 = z.infer<typeof baziSchemaV2>
