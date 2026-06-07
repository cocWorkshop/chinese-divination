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

// ─── V2 Schema ──────────────────────────────────────────────────────────────

const palaceAnalysisV2 = z.object({
  stars: z.array(z.string()).default(['星名']),
  analysis: z.string().describe('分析(80-150字)'),
})

const emptyPalaceV2 = z.object({
  stars: z.array(z.string()).default([]),
  analysis: z.string().describe(''),
})

const daYunEntrySchemaZiwei = z.object({
  ageRange: z.string().describe('年龄范围如"25-34"'),
  heavenlyStem: z.string().describe('大限天干'),
  earthlyBranch: z.string().describe('大限地支'),
  theme: z.string().describe('该步大限核心主题(30+字)：宫位星曜组合+基调'),
  siHuaOverlay: z.string().describe('大限四化叠加本命四化的影响(30+字)'),
  keyEvents: z.array(z.object({
    age: z.string().describe('年龄如"28-30"'),
    event: z.string().describe('具体事件描述(20+字)'),
    basis: z.string().describe('命理依据'),
  })).describe('该步大限中2-3个关键事件预测'),
  advice: z.string().describe('行动建议(20+字)'),
})

export const ziweiSchemaV2 = z.object({
  type: z.literal('ziwei'),
  version: z.literal(2),

  // merge-injected
  mainStars: z.array(z.object({
    name: z.string().describe('紫微'),
    palace: z.string().describe('命宫'),
    element: z.string().describe('土'),
  })).default([{ name: '紫微', palace: '命宫', element: '土' }]),

  patterns: z.array(z.object({
    name: z.string().describe('格局名'),
    level: z.string().describe('上格/中格/下格/凶格'),
    description: z.string().describe('格局说明'),
  })).default([{ name: '格局名', level: '上格/中格/下格', description: '格局说明' }]),

  palaces: z.object({
    '命宫': palaceAnalysisV2,
    '财帛': emptyPalaceV2,
    '官禄': emptyPalaceV2,
    '夫妻': emptyPalaceV2,
    '兄弟': emptyPalaceV2,
    '子女': emptyPalaceV2,
    '疾厄': emptyPalaceV2,
    '迁移': emptyPalaceV2,
    '仆役': emptyPalaceV2,
    '田宅': emptyPalaceV2,
    '福德': emptyPalaceV2,
    '父母': emptyPalaceV2,
  }),

  // LLM output
  formation: z.object({
    name: z.string().describe('格局名称，可组合如"命无正曜·机月同梁"'),
    level: z.enum(['上格', '中格', '下格', '凶格', '普通']).describe('上格/中格/下格/凶格/普通'),
    analysis: z.string().describe('格局分析(50+字)：为什么是此格局，综合评级，对命主核心影响'),
  }),

  sections: z.object({
    overview: z.string().describe('命盘总论(200+字)：格局定性、命宫主星+亮度、四化主线、一生核心主题'),
    personality: z.string().describe('性格分析(100+字)：命宫(外在)vs福德宫(内在)双面分析'),
    career: z.string().describe('事业分析(150+字)：官禄宫+财帛宫+三方四正+具体适合行业'),
    marriage: z.string().describe('婚姻分析(150+字)：夫妻宫主星+煞星+配偶特征(性格/职业/年龄)+婚期判断'),
    wealth: z.string().describe('财运分析(150+字)：财帛+福德+田宅三宫交叉分析+财运时间线'),
    health: z.string().describe('健康分析(100+字)：疾厄宫主星→具体器官+高风险大限'),
    family: z.string().describe('六亲分析(100+字)：父母/兄弟/子女宫主星→具体特征推断'),
  }),

  sectionSummaries: z.object({
    career: z.string().describe('一句话概括，如"📈 官禄紫微庙旺 — 适合管理或公职"'),
    marriage: z.string().describe('一句话概括，如"💛 夫妻宫桃花旺 — 28-32岁婚期"'),
    wealth: z.string().describe('一句话概括，如"💰 武曲化禄入财帛 — 理财型"'),
    health: z.string().describe('一句话概括，如"⚠️ 疾厄天机落陷 — 注意神经系统"'),
  }).optional().describe('每个section的一句话摘要'),

  daYunAnalysis: z.array(daYunEntrySchemaZiwei).describe('逐步大限精批（共8步，从第一个大限起连续覆盖约前80年），每步含主题、四化叠加、关键事件、建议'),

  keyPredictions: z.array(z.object({
    age: z.string().describe('格式："36歲（2024年）" 或 "46-50歲（2034-2038年）"，如果覆盖当前年份加"當前"如"38歲（2026年，當前）"'),
    event: z.string().describe('具体事件描述'),
    basis: z.string().describe('命理依据（星曜+宫位+四化）'),
  })).describe('3-5个关键人生事件预测'),

  keyAdvice: z.array(z.string()).default(['建议一', '建议二']),
  luckyInfo: z.object({
    colors: z.array(z.string()).default([]),
    directions: z.array(z.string()).default([]),
  }),
})

export type ZiweiResultV2 = z.infer<typeof ziweiSchemaV2>
