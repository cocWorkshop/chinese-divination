import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkModelLimit, incrementModelUsage } from '@/lib/rateLimit'
import { calculateBazi, BaziChart } from '@/lib/baziCalculator'

const refFileMap: Record<string, string> = {
  bazi: 'bazi.md',
  iching: 'iching.md',
  ziwei: 'ziwei.md',
  qimen: 'qimen.md',
  fengshui: 'fengshui.md',
  other: 'others.md',
}

const schemas: Record<string, object> = {
  bazi: {
    type: 'bazi',
    pillars: {
      year: { stem: '天干', branch: '地支', element: '五行属性(金/木/水/火/土)', nayin: '纳音' },
      month: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
      day: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
      hour: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
    },
    dayMaster: { stem: '日主天干', element: '五行属性', strength: 'strong|weak|neutral', strengthLabel: '身强/身弱/中和' },
    fiveElements: { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 },
    luckyElements: ['喜用五行'],
    avoidElements: ['忌神五行'],
    sections: { overview: '整体命格分析(100+字)', career: '事业运势(100+字)', marriage: '婚姻感情(100+字)', wealth: '财运分析(100+字)', health: '健康运势(100+字)', periods: '大运流年分析(100+字)' },
    keyAdvice: ['建议一', '建议二', '建议三'],
    luckyInfo: { numbers: [1, 2], colors: ['颜色'], directions: ['方位'] },
  },
  iching: {
    type: 'iching',
    hexagram: {
      number: 1, name: '卦名(单字)', chineseName: '卦全名如风雷益',
      upperTrigram: { name: '上卦名', symbol: '☰', element: '风/雷/水/火/山/泽/天/地' },
      lowerTrigram: { name: '下卦名', symbol: '☷', element: '五行' },
      lines: [1, 0, 1, 1, 0, 1],
    },
    judgment: '卦辞原文', image: '象辞解析', interpretation: '针对问题的解读(100+字)',
    changingLines: [{ position: 3, text: '变爻说明' }],
    advice: '具体建议(100+字)', outcome: '吉/凶/中/大吉/小凶',
    keyPoints: ['要点一', '要点二', '要点三'],
  },
  ziwei: {
    type: 'ziwei',
    mainStars: [{ name: '紫微', palace: '命宫', element: '土' }],
    palaces: {
      '命宫': { stars: ['星名'], analysis: '分析' },
      '财帛宫': { stars: [], analysis: '' },
      '官禄宫': { stars: [], analysis: '' },
      '夫妻宫': { stars: [], analysis: '' },
      '兄弟宫': { stars: [], analysis: '' },
      '子女宫': { stars: [], analysis: '' },
      '疾厄宫': { stars: [], analysis: '' },
      '迁移宫': { stars: [], analysis: '' },
      '交友宫': { stars: [], analysis: '' },
      '田宅宫': { stars: [], analysis: '' },
      '福德宫': { stars: [], analysis: '' },
      '父母宫': { stars: [], analysis: '' },
    },
    sections: { overview: '总论(100+字)', career: '事业官禄(100+字)', marriage: '夫妻感情(100+字)', wealth: '财运(100+字)' },
    keyAdvice: ['建议一', '建议二'],
    luckyInfo: { numbers: [], colors: [], directions: [] },
  },
  qimen: {
    type: 'qimen',
    palace: { inquiry: '问事宫', outcome: '结果宫', god: '值符神', star: '值符星', door: '当值门' },
    sections: { situation: '当前局势(100+字)', trend: '事态走向(100+字)', timing: '最佳时机(100+字)', strategy: '行动策略(100+字)' },
    outcome: '吉/凶/中',
    keyAdvice: ['建议一', '建议二'],
    luckyInfo: { timing: '宜在...', direction: '向...方行动' },
  },
  fengshui: {
    type: 'fengshui',
    flyingStar: { facing: '坐向如坐北朝南', period: '一运到九运', mountainStar: '山星数字', waterStar: '向星数字' },
    rooms: [{ room: '房间名', energy: '旺/平/衰/煞', suggestion: '建议' }],
    sections: { overall: '整体格局(100+字)', wealth: '财位(100+字)', health: '健康(100+字)', relationships: '人际感情(100+字)' },
    remedies: [{ issue: '问题', solution: '解决方案' }],
    keyAdvice: ['建议一', '建议二'],
  },
  other: {
    type: 'other',
    subType: 'meihua或liuren',
    trigrams: {
      upper: { name: '卦名', symbol: '☰', element: '五行' },
      lower: { name: '卦名', symbol: '☷', element: '五行' },
      transformed: { name: '卦名', symbol: '☵', element: '五行' },
    },
    sections: { situation: '体卦分析(100+字)', inquiry: '用卦分析(100+字)', interaction: '体用关系(100+字)', timeline: '时间推断(100+字)' },
    outcome: '吉/凶/中',
    keyAdvice: ['建议一', '建议二', '建议三'],
  },
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, inputData, language, question, saveProfile, saveHistory, modelTier: rawModelTier } = await req.json()
    const modelTier = (rawModelTier === 'model2' ? 'model2' : 'model1') as 'model1' | 'model2'

    if (!type || !inputData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const shouldSaveHistory = saveHistory !== false
    const shouldSaveProfile = saveProfile === true

    const maintenance = await prisma.adminSetting.findUnique({ where: { key: 'maintenanceMode' } })
    if (maintenance?.value === 'true') {
      return NextResponse.json(
        { error: language !== 'en' ? '系統維護中，請稍後再試。' : 'System under maintenance. Please try again later.' },
        { status: 503 }
      )
    }

    const divinationEnabled = await prisma.adminSetting.findUnique({ where: { key: 'divinationEnabled' } })
    if (divinationEnabled?.value === 'false') {
      return NextResponse.json(
        { error: language !== 'en' ? '占卜功能暫時關閉，請稍後再試。' : 'Divination service is temporarily disabled.' },
        { status: 503 }
      )
    }

    const rl = await checkModelLimit(session.user.id, modelTier)
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: language === 'en'
            ? `Daily ${modelTier === 'model2' ? 'premium' : 'standard'} model limit reached. Share to earn bonus credits.`
            : `已達今日${modelTier === 'model2' ? '高級模型' : '標準模型'}使用上限，請明日再試或分享獲取額外次數。`,
          resetAt: rl.resetAt.toISOString(),
        },
        { status: 429 }
      )
    }

    const refFileName = refFileMap[type] || 'others.md'
    const refPath = path.join(process.cwd(), 'divination-refs', refFileName)
    let refContent = ''
    try {
      refContent = fs.readFileSync(refPath, 'utf-8')
    } catch {
      refContent = '（参考资料暂时不可用）'
    }

    const schema = schemas[type] || schemas.other
    const langText = language === 'en' ? 'English' : '繁體中文（Traditional Chinese）'
    const textLang = language === 'en' ? 'English' : '繁體中文'

    const systemPrompt = `You are a master of Chinese traditional divination with deep expertise in ${type}.

Reference knowledge:
${refContent}

IMPORTANT: You must respond with ONLY valid JSON. No markdown code blocks, no explanation outside the JSON.
Follow this exact JSON schema for ${type}:
${JSON.stringify(schema, null, 2)}

The user's language preference is ${langText}. Write all text values (sections, advice, analysis paragraphs) in ${textLang}.
Keep core Chinese terminology (天干地支, star names, palace names, trigram names) in Chinese regardless of language setting.
Be thorough and insightful in the text sections. Minimum 100 words per section.
For the pillars/stars/palace data fields, use proper Chinese characters (e.g. 甲乙丙丁 for stems, 子丑寅卯 for branches).`

    let userMessage: string
    let baziChart: BaziChart | null = null

    if (type === 'bazi' && inputData.birthDate && inputData.birthTime) {
      try {
        baziChart = calculateBazi(
          inputData.birthDate,
          inputData.birthTime,
          inputData.birthPlace || '',
          inputData.gender || 'male'
        )
        userMessage = `请为我进行八字命理分析。

## 程序预计算的四柱命盘（请校验）
${JSON.stringify(baziChart, null, 2)}

## 用户输入
${JSON.stringify(inputData, null, 2)}
${question ? `\n特别关注：${question}` : ''}

请基于以上命盘数据，填写以下JSON结构中的sections、keyAdvice和luckyInfo部分。
四柱数据(pillars, dayMaster, fiveElements等)请以程序计算结果为准，除非你发现明显错误。
重点放在解读分析上，每个section至少100字。`
      } catch (e) {
        console.error('BaZi calculation error:', e)
        userMessage = `请为我进行${type}分析。
输入信息：${JSON.stringify(inputData, null, 2)}
${question ? `特别关注：${question}` : ''}`
      }
    } else {
      userMessage = `请为我进行${type}分析。
输入信息：${JSON.stringify(inputData, null, 2)}
${question ? `特别关注：${question}` : ''}`
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: language !== 'en' ? 'AI服務未配置，請聯繫管理員。' : 'AI service not configured.' },
        { status: 503 }
      )
    }

    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      timeout: 120000,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:8094',
        'X-Title': 'Xuanji Divination',
      },
    })

    // Get model name from admin settings
    const modelKey = modelTier === 'model2' ? 'model2Name' : 'model1Name'
    const modelSetting = await prisma.adminSetting.findUnique({ where: { key: modelKey } })
    const modelName = modelSetting?.value || 'anthropic/claude-3-5-haiku'

    let resultText: string
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000)
    try {
      const completion = await client.chat.completions.create({
        model: modelName,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }, { signal: controller.signal as AbortSignal })
      clearTimeout(timeoutId)
      resultText = completion.choices[0]?.message?.content || ''
    } catch (apiErr: unknown) {
      clearTimeout(timeoutId)
      console.error('OpenRouter API error:', apiErr)
      const err = apiErr as { status?: number; message?: string }
      if (err?.status === 401) {
        return NextResponse.json(
          { error: language !== 'en' ? 'AI服務API密鑰無效，請檢查配置。' : 'AI API key is invalid.' },
          { status: 401 }
        )
      }
      if (err?.status === 402) {
        return NextResponse.json(
          { error: language !== 'en' ? 'OpenRouter餘額不足，請前往 openrouter.ai 充值。' : 'OpenRouter credits exhausted. Please top up at openrouter.ai.' },
          { status: 402 }
        )
      }
      if (err?.status === 429) {
        return NextResponse.json(
          { error: language !== 'en' ? 'AI請求過於頻繁，請稍後再試。' : 'Too many requests. Please try again later.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: language !== 'en' ? `AI服務錯誤：${err?.message || '未知錯誤'}` : `AI service error: ${err?.message || 'Unknown'}` },
        { status: 502 }
      )
    }

    // Parse JSON from Claude's response
    let structuredResult: Record<string, unknown>
    try {
      const raw = resultText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '').replace(/^```\n?/, '')
      structuredResult = JSON.parse(raw)
    } catch {
      // Fallback: wrap as generic structure for ResultRenderer to handle
      structuredResult = { type, raw: resultText, sections: { overview: resultText }, keyAdvice: [] }
    }

    // Merge programmatic BaZi data with LLM interpretation
    if (type === 'bazi' && baziChart) {
      structuredResult.pillars = {
        year: baziChart.yearPillar,
        month: baziChart.monthPillar,
        day: baziChart.dayPillar,
        hour: baziChart.hourPillar,
      }
      structuredResult.dayMaster = {
        ...(structuredResult.dayMaster as object || {}),
        stem: baziChart.dayMaster.stem,
        element: baziChart.dayMaster.element,
        yinYang: baziChart.dayMaster.yinYang,
        strength: baziChart.strength,
        strengthLabel: baziChart.strengthLabel,
      }
      structuredResult.fiveElements = baziChart.fiveElements
      structuredResult.shenSha = baziChart.shenSha
      structuredResult.trueSolarTime = baziChart.trueSolarTime
      if (!structuredResult.luckyElements || (structuredResult.luckyElements as string[]).length === 0) {
        structuredResult.luckyElements = baziChart.luckyElements
      }
      if (!structuredResult.avoidElements || (structuredResult.avoidElements as string[]).length === 0) {
        structuredResult.avoidElements = baziChart.avoidElements
      }
    }

    const resultToStore = JSON.stringify(structuredResult)

    // Increment usage after successful generation
    await incrementModelUsage(session.user.id, modelTier)

    if (shouldSaveProfile && (type === 'bazi' || type === 'ziwei')) {
      const profileUpdate: Record<string, string | null> = {}
      if (inputData.birthDate) profileUpdate.birthDate = inputData.birthDate
      if (inputData.birthTime) profileUpdate.birthTime = inputData.birthTime
      if (inputData.birthPlace) profileUpdate.birthPlace = inputData.birthPlace
      if (inputData.gender) profileUpdate.gender = inputData.gender
      if (Object.keys(profileUpdate).length > 0) {
        await prisma.user.update({ where: { id: session.user.id }, data: profileUpdate })
      }
    }

    if (shouldSaveHistory) {
      const reading = await prisma.reading.create({
        data: {
          userId: session.user.id,
          type,
          modelTier,
          question: question || null,
          inputData,
          result: resultToStore,
          language: language || 'zh-TW',
        },
      })
      return NextResponse.json({ reading: { ...reading, result: resultToStore }, saved: true })
    }

    return NextResponse.json({
      reading: { id: null, result: resultToStore, type, createdAt: new Date() },
      saved: false,
    })
  } catch (e) {
    console.error('Divination route error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
