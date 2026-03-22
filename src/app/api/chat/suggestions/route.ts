export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { readingResult, readingType, lang } = await req.json()
    if (!readingResult) {
      return NextResponse.json({ questions: [] }, { status: 200 })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ questions: [] }, { status: 200 })
    }

    // Get chat model from admin settings
    const [chatModelSetting, model1Setting] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: 'chatModelName' } }),
      prisma.adminSetting.findUnique({ where: { key: 'model1Name' } }),
    ])
    const model = chatModelSetting?.value || model1Setting?.value || 'anthropic/claude-3-5-haiku'

    const isEnglish = lang === 'en'
    const systemPrompt = isEnglish
      ? `Based on the following divination reading, generate exactly 3 short follow-up questions the user might want to ask. Questions should reference specific elements from the reading (stars, elements, hexagram lines, palaces, etc.). Return ONLY a JSON array of 3 strings. Each question should be under 50 characters.`
      : `根据以下命理解读，生成3个用户可能想追问的简短问题。问题要引用解读中的具体元素（星曜、五行、爻位、宫位等）。只返回一个包含3个字符串的JSON数组。每个问题不超过25个中文字。`

    // Truncate reading to keep the call lightweight
    const truncatedReading = readingResult.substring(0, 2000)

    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    })

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: truncatedReading },
      ],
      temperature: 0.8,
      max_tokens: 300,
    })

    const content = response.choices?.[0]?.message?.content?.trim() || ''

    // Parse JSON array from response (handle markdown code blocks)
    let questions: string[] = []
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      }
    } catch {
      // Failed to parse, return empty
    }

    // Ensure exactly 3 strings
    questions = questions.filter(q => typeof q === 'string').slice(0, 3)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Suggestions API error:', error)
    return NextResponse.json({ questions: [] }, { status: 200 })
  }
}
