/**
 * Specialized prompts for on-demand 10-Year Annual Fortune Generation
 * (大运/大限十年流年逐年 AI 深度精批).
 */

import { T } from '@/lib/i18n'

export interface BaziAnnualFortuneInput {
  pillars?: {
    year?: { stem: string; branch: string; nayin?: string }
    month?: { stem: string; branch: string; nayin?: string }
    day?: { stem: string; branch: string; nayin?: string }
    hour?: { stem: string; branch: string; nayin?: string }
  }
  dayMaster?: { stem: string; element: string; strengthLabel?: string }
  luckyElements?: string[]
  avoidElements?: string[]
  formation?: { name: string; analysis?: string }
  decadeInfo: {
    decadeIndex: number
    startYear: number
    endYear: number
    startAge: number
    endAge: number
    stem?: string
    branch?: string
    nayin?: string
    theme?: string
  }
  decadeYears: {
    year: number
    age: number
    stem: string
    branch: string
    tenGod?: string
    nayin?: string
    isLucky?: boolean | null
  }[]
  lang: string
}

export interface ZiweiAnnualFortuneInput {
  chartInfo?: {
    fiveElementsClass?: string
    soul?: string
    body?: string
    earthlyBranchOfSoulPalace?: string
    earthlyBranchOfBodyPalace?: string
  }
  formation?: { name: string; level?: string }
  palaces?: Record<string, {
    majorStars?: { name: string; brightness?: string; mutagen?: string }[]
    heavenlyStem?: string
    earthlyBranch?: string
    analysis?: string
  }>
  decadeInfo: {
    decadeIndex: number
    startYear: number
    endYear: number
    startAge: number
    endAge: number
    stem?: string
    branch?: string
    palace?: string
    theme?: string
    siHuaOverlay?: string
  }
  decadeYears: {
    year: number
    age: number
    stem?: string
    branch?: string
    earthlyBranch?: string
    huaLuPalace?: string
    huaJiPalace?: string
    isLucky?: boolean | null
  }[]
  lang: string
}

export function buildBaziAnnualFortunePrompt(input: BaziAnnualFortuneInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = T(
    input.lang,
    `你是一位精通子平八字与滴天髓命理体系的当代易学宗师。
你的任务是为命主当前的这步大运（10年周期），逐年生成深度的【十年流年逐年精批】。
请结合命主原局四柱、日元旺衰喜忌、大运管辖气场，以及流年干支、十神引动、岁运并临与刑冲合害会等严谨命理法则，对这十年中的【每一年】进行全方位深度详批。
语言风格要求：典雅文雅，兼具宋代理学与东方神秘学底蕴，分析深入透彻，直击现实决策，严禁空泛套话。
你必须严格仅输出一个纯 JSON 数组，包含恰好 ${input.decadeYears.length} 个年份对象，不要包含 markdown 标记或额外解释。`,
    `You are an elite Grand Master of Chinese BaZi Metaphysics (Ziping BaZi).
Your task is to generate a comprehensive, structured, 10-year annual fortune reading for the specified 10-year DaYun decade.
Provide rigorous, insightful, highly detailed analyses for EACH of the 10 years based on Five Elements cycles, Ten Gods interactions, Clashes/Combines, and natal chart dynamics.
You MUST output ONLY a valid JSON array containing exactly ${input.decadeYears.length} objects. Do not include markdown codeblocks or explanation.`,
  )

  const userPrompt = `
【命主八字原局】
- 四柱：年柱 [${input.pillars?.year?.stem || ''}${input.pillars?.year?.branch || ''} ${input.pillars?.year?.nayin || ''}], 月柱 [${input.pillars?.month?.stem || ''}${input.pillars?.month?.branch || ''} ${input.pillars?.month?.nayin || ''}], 日柱 [${input.pillars?.day?.stem || ''}${input.pillars?.day?.branch || ''} ${input.pillars?.day?.nayin || ''}], 时柱 [${input.pillars?.hour?.stem || ''}${input.pillars?.hour?.branch || ''} ${input.pillars?.hour?.nayin || ''}]
- 日主：${input.dayMaster?.stem || ''} (${input.dayMaster?.element || ''}，身${input.dayMaster?.strengthLabel || '中和'})
- 喜用五行：${(input.luckyElements || []).join('、') || '按局取用'}
- 忌仇五行：${(input.avoidElements || []).join('、') || '按局避忌'}
${input.formation?.name ? `- 格局：${input.formation.name}` : ''}

【当前推演大运】
- 大运：${input.decadeInfo.stem || ''}${input.decadeInfo.branch || ''}运 (${input.decadeInfo.nayin || ''})
- 管辖期间：${input.decadeInfo.startYear} - ${input.decadeInfo.endYear}年 (虚岁 ${input.decadeInfo.startAge} - ${input.decadeInfo.endAge}岁)
${input.decadeInfo.theme ? `- 大运主题：${input.decadeInfo.theme}` : ''}

【待精批的 10 个流年干支列表】
${JSON.stringify(input.decadeYears, null, 2)}

请为上述列表中的每一流年生成详批，返回包含 ${input.decadeYears.length} 个元素的 JSON 数组，每个元素包含以下字段：
- "year": 年份 (数字，例如 ${input.decadeYears[0]?.year || 2026})
- "age": 岁数 (数字)
- "ganZhi": 流年干支 (例如 "${input.decadeYears[0]?.stem || ''}${input.decadeYears[0]?.branch || ''}")
- "theme": 8-16字精炼年度总评主题
- "fortune": 150-250字综合运程详析，分析该年五行生克气势与人生走势
- "career": 职场晋升、求职创业、学业考运
- "wealth": 正偏财运、投资机缘与破耗防范
- "romance": 婚恋感情、家庭人际与长幼沟通
- "health": 身心气血、脏腑调理与安全宜忌
- "interaction": 岁运刑冲克害与神煞引动断语（例如“岁运逢合”、“天克地冲”、“岁运并临”等）
- "advice": 趋吉避凶行事策略与开运宜忌
`

  return { systemPrompt, userPrompt }
}

export function buildZiweiAnnualFortunePrompt(input: ZiweiAnnualFortuneInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = T(
    input.lang,
    `你是一位精通紫微斗数古籍（中州派、三合派、钦天四化）的当代紫微斗数泰斗。
你的任务是为命主当前的大限（10年周期），逐年生成深度的【十年流年逐年精批】。
请结合命主本命盘格局、大限命盘主星星曜亮度、大限四化叠引，以及流年命宫落点、流年岁前诸星与流年四化（化禄、化权、化科、化忌），对该大限内全部【10个流年】进行全方位命理详批。
语言风格要求：宋代古雅蕴藉与现代精准研判并蓄，文辞优美，分析深刻，点出关键玄机。
你必须严格仅输出一个纯 JSON 数组，包含恰好 ${input.decadeYears.length} 个年份对象，不要包含 markdown 标记或额外解释。`,
    `You are an elite Grand Master of Purple Star Astrology (Zi Wei Dou Shu).
Your task is to generate an in-depth 10-year annual fortune reading for the specified 10-year decadal cycle.
Provide rigorous, insightful, highly detailed analyses for EACH of the 10 years based on decadal palace overlays, annual life palaces, and triple-tier SiHua (Birth, Decade, Annual) mutagen interactions.
You MUST output ONLY a valid JSON array containing exactly ${input.decadeYears.length} objects. Do not include markdown codeblocks or explanation.`,
  )

  const userPrompt = `
【命主紫微斗数盘基础】
- 五行局：${input.chartInfo?.fiveElementsClass || ''}
- 命主：${input.chartInfo?.soul || ''} | 身主：${input.chartInfo?.body || ''}
- 命宫地支：${input.chartInfo?.earthlyBranchOfSoulPalace || ''}
${input.formation?.name ? `- 格局：${input.formation.name} (${input.formation.level || ''})` : ''}

【当前推演大限】
- 大限范围：${input.decadeInfo.startAge} - ${input.decadeInfo.endAge}岁 (${input.decadeInfo.startYear} - ${input.decadeInfo.endYear}年)
- 大限干支与宫位：${input.decadeInfo.stem || ''}${input.decadeInfo.branch || ''} (${input.decadeInfo.palace || '大限命宫'})
${input.decadeInfo.theme ? `- 大限运势纲领：${input.decadeInfo.theme}` : ''}
${input.decadeInfo.siHuaOverlay ? `- 大限四化叠引：${input.decadeInfo.siHuaOverlay}` : ''}

【待精批的 10 个流年列表】
${JSON.stringify(input.decadeYears, null, 2)}

请为上述列表中的每一流年生成详批，返回包含 ${input.decadeYears.length} 个元素的 JSON 数组，每个元素包含以下字段：
- "year": 年份 (数字)
- "age": 岁数 (数字)
- "ganZhi": 流年干支或年号标识 (字符串)
- "theme": 8-16字精炼流年主题断语
- "fortune": 150-250字紫微斗数流年运程详析，结合流年命宫主星与大限本命叠照
- "career": 官禄宫星曜气运与事业开拓
- "wealth": 财帛宫与正偏财源、资产损益
- "romance": 夫妻宫与婚恋姻缘、桃花际遇
- "health": 疾厄宫与身心调理、星曜煞气防护
- "interaction": 本命、大限、流年三代四化（禄权科忌）叠引效应
- "advice": 趋吉避凶与开运指南
`

  return { systemPrompt, userPrompt }
}
