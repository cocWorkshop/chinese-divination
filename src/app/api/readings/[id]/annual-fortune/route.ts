export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { completeLLM } from '@/lib/llm'
import { jsonrepair } from 'jsonrepair'
import { rateLimit } from '@/lib/rateLimiter'
import {
  buildBaziAnnualFortunePrompt,
  buildZiweiAnnualFortunePrompt,
} from '@/lib/divination/annualFortunePrompts'
import type { AnnualFortuneYear } from '@/types/divination'

const requestSchema = z.object({
  type: z.enum(['bazi', 'ziwei']),
  decadeIndex: z.number().int().min(0).max(20),
  decadeInfo: z.object({
    startYear: z.number(),
    endYear: z.number(),
    startAge: z.number(),
    endAge: z.number(),
    stem: z.string().optional(),
    branch: z.string().optional(),
    nayin: z.string().optional(),
    palace: z.string().optional(),
    theme: z.string().optional(),
    siHuaOverlay: z.string().optional(),
  }),
  lang: z.string().default('zh'),
})

function extractJsonArray(rawText: string): AnnualFortuneYear[] | null {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // First direct parse
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed as AnnualFortuneYear[]
    if (parsed && typeof parsed === 'object') {
      const arr = Object.values(parsed).find(v => Array.isArray(v))
      if (arr) return arr as AnnualFortuneYear[]
    }
  } catch {
    // Try jsonrepair
    try {
      const repaired = JSON.parse(jsonrepair(cleaned))
      if (Array.isArray(repaired)) return repaired as AnnualFortuneYear[]
      if (repaired && typeof repaired === 'object') {
        const arr = Object.values(repaired).find(v => Array.isArray(v))
        if (arr) return arr as AnnualFortuneYear[]
      }
    } catch {
      // Regex extraction fallback
      const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/)
      if (match) {
        try {
          const mParsed = JSON.parse(jsonrepair(match[0]))
          if (Array.isArray(mParsed)) return mParsed as AnnualFortuneYear[]
        } catch { /* failed */ }
      }
    }
  }
  return null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!rateLimit(`annual-fortune:${session.user.id}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsedBody = requestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsedBody.error.format() }, { status: 400 })
  }

  const { type, decadeIndex, decadeInfo, lang } = parsedBody.data

  const reading = await prisma.reading.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  })

  if (!reading) {
    return NextResponse.json({ error: 'Reading not found' }, { status: 404 })
  }

  let readingData: Record<string, unknown>
  try {
    readingData = JSON.parse(reading.result)
  } catch {
    return NextResponse.json({ error: 'Corrupt reading data' }, { status: 500 })
  }

  const decadeKey = `decade_${decadeIndex}`

  // Check if already cached in reading.result
  const existingFortunesMap = (readingData.detailedAnnualFortunes || {}) as Record<string, AnnualFortuneYear[]>
  if (Array.isArray(existingFortunesMap[decadeKey]) && existingFortunesMap[decadeKey].length > 0) {
    return NextResponse.json({
      success: true,
      decadeKey,
      fortunes: existingFortunesMap[decadeKey],
      cached: true,
    })
  }

  // Build prompt according to divination type
  let systemPrompt = ''
  let userPrompt = ''

  if (type === 'bazi') {
    const rawLiuNian = (Array.isArray(readingData.liuNian) ? readingData.liuNian : []) as {
      year: number; age: number; stem: string; branch: string; tenGod?: string; nayin?: string; isLucky?: boolean | null
    }[]

    const decadeYears = rawLiuNian.filter(ln => ln.year >= decadeInfo.startYear && ln.year <= decadeInfo.endYear)
    // Fallback if filter returned empty (e.g. slight mismatch)
    const effectiveYears = decadeYears.length > 0
      ? decadeYears
      : Array.from({ length: 10 }, (_, i) => ({
          year: decadeInfo.startYear + i,
          age: decadeInfo.startAge + i,
          stem: '',
          branch: '',
          tenGod: '',
        }))

    const prompts = buildBaziAnnualFortunePrompt({
      pillars: readingData.pillars as any,
      dayMaster: readingData.dayMaster as any,
      luckyElements: readingData.luckyElements as string[],
      avoidElements: readingData.avoidElements as string[],
      formation: readingData.formation as any,
      decadeInfo: {
        decadeIndex,
        ...decadeInfo,
      },
      decadeYears: effectiveYears,
      lang,
    })
    systemPrompt = prompts.systemPrompt
    userPrompt = prompts.userPrompt
  } else {
    // Ziwei
    const rawLiuNian = (Array.isArray(readingData.liuNian) ? readingData.liuNian : []) as {
      year: number; age: number; earthlyBranch?: string; huaLuPalace?: string; huaJiPalace?: string; isLucky?: boolean | null
    }[]

    const decadeYears = rawLiuNian.filter(ln => ln.year >= decadeInfo.startYear && ln.year <= decadeInfo.endYear)
    const effectiveYears = decadeYears.length > 0
      ? decadeYears
      : Array.from({ length: 10 }, (_, i) => ({
          year: decadeInfo.startYear + i,
          age: decadeInfo.startAge + i,
          earthlyBranch: '',
        }))

    const prompts = buildZiweiAnnualFortunePrompt({
      chartInfo: readingData.ziweiChart as any,
      formation: readingData.formation as any,
      palaces: readingData.palaces as any,
      decadeInfo: {
        decadeIndex,
        ...decadeInfo,
      },
      decadeYears: effectiveYears,
      lang,
    })
    systemPrompt = prompts.systemPrompt
    userPrompt = prompts.userPrompt
  }

  try {
    const llmRes = await completeLLM({
      endpoint: 'divination',
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const fortunes = extractJsonArray(llmRes.content || '')
    if (!fortunes || fortunes.length === 0) {
      return NextResponse.json({ error: 'Failed to parse annual fortunes from model output' }, { status: 502 })
    }

    // Persist to database
    const updatedMap = {
      ...existingFortunesMap,
      [decadeKey]: fortunes,
    }
    readingData.detailedAnnualFortunes = updatedMap

    await prisma.reading.update({
      where: { id },
      data: { result: JSON.stringify(readingData) },
    })

    return NextResponse.json({
      success: true,
      decadeKey,
      fortunes,
      cached: false,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'AI generation failed', message }, { status: 500 })
  }
}
