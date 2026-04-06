export const dynamic = 'force-dynamic'
// Allow long-running LLM calls (up to 10 minutes)
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, deductCredits } from '@/lib/rateLimit'
import { completeLLM, resolveLLMConfig } from '@/lib/llm'
import { selectHandler, buildHandlerSchema, validateHandlerOutput, type DivinationContext } from './handlers'
import { buildSystemPrompt } from './handlers/_systemPrompt'
import { parseJsonFromLLMOutput } from './handlers/_jsonParse'

const RELATION_LABELS: Record<string, string> = {
  spouse: '配偶', father: '父亲', mother: '母亲', son: '儿子', daughter: '女儿',
  brother: '兄弟', sister: '姐妹', friend: '朋友', other: '其他',
}

export async function POST(req: NextRequest) {
  const apiStart = Date.now()
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      type, inputData, language, question, saveProfile, saveHistory,
      targetType: rawTargetType, familyMemberId, newFamilyMember,
      readingId: preCreatedReadingId, clientTime, paipanOnly,
    } = await req.json()
    const targetType = rawTargetType === 'family' ? 'family' : 'self'

    if (!type || !inputData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (typeof question === 'string' && question.length > 500) {
      return NextResponse.json({ error: 'Question too long (max 500 characters)' }, { status: 400 })
    }

    const shouldSaveHistory = saveHistory !== false
    const shouldSaveProfile = saveProfile === true

    // readingId from /init means credit/maintenance already validated → only fetch LLM config keys.
    const adminSettings = await prisma.adminSetting.findMany({
      where: { key: { in: preCreatedReadingId
        ? ['model1Name', 'llmTimeoutSeconds', 'llmMaxTokens']
        : ['maintenanceMode', 'divinationEnabled', 'model1Name', 'llmTimeoutSeconds', 'llmMaxTokens'] } },
    })
    const settingsMap = Object.fromEntries(adminSettings.map(s => [s.key, s.value]))

    if (!preCreatedReadingId) {
      if (settingsMap.maintenanceMode === 'true') {
        return NextResponse.json(
          { error: language !== 'en' ? '系統維護中，請稍後再試。' : 'System under maintenance. Please try again later.' },
          { status: 503 }
        )
      }
      if (settingsMap.divinationEnabled === 'false') {
        return NextResponse.json(
          { error: language !== 'en' ? '占卜功能暫時關閉，請稍後再試。' : 'Divination service is temporarily disabled.' },
          { status: 503 }
        )
      }
      if (!paipanOnly) {
        const rl = await checkCredits(session.user.id, type)
        if (!rl.allowed) {
          return NextResponse.json(
            { error: language === 'en' ? `Not enough Karma (need ${rl.cost}, have ${rl.remaining}). Visit the Karma Shop to get more.` : `✨ 機緣不足（需要 ${rl.cost}，剩餘 ${rl.remaining}）。前往機緣商店補充機緣。` },
            { status: 429 }
          )
        }
      }
    }

    // Resolve family member (creates a new one if newFamilyMember.relation provided).
    let resolvedFamilyMemberId: string | null = null
    let targetPersonInfo = ''
    if (targetType === 'family') {
      if (newFamilyMember?.relation) {
        const created = await prisma.familyMember.create({
          data: {
            userId: session.user.id,
            relation: newFamilyMember.relation,
            name: newFamilyMember.name || null,
            birthDate: inputData.birthDate || null,
            birthTime: inputData.birthTime || null,
            birthPlace: inputData.birthPlace || null,
            gender: inputData.gender || null,
            calendarType: inputData.lunarToggle || null,
            timeMode: inputData.timeMode || null,
            exactTime: inputData.exactTime || null,
            birthEnvironment: inputData.birthEnvironment || null,
            birthLat: inputData.birthLat ?? null,
            birthLng: inputData.birthLng ?? null,
          },
        })
        resolvedFamilyMemberId = created.id
        targetPersonInfo = `此次预测对象为用户的${RELATION_LABELS[created.relation] || created.relation}${created.name ? `（${created.name}）` : ''}`
      } else if (familyMemberId) {
        const member = await prisma.familyMember.findFirst({ where: { id: familyMemberId, userId: session.user.id } })
        if (!member) {
          return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
        }
        resolvedFamilyMemberId = member.id
        targetPersonInfo = `此次预测对象为用户的${RELATION_LABELS[member.relation] || member.relation}${member.name ? `（${member.name}）` : ''}`
      }
    }

    // Compute user age/gender for language-aware suggested questions.
    let userAge: number | undefined
    const birthDateStr = inputData.birthDate as string | undefined
    if (birthDateStr) {
      const birth = new Date(birthDateStr)
      if (!isNaN(birth.getTime())) {
        userAge = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      }
    }
    const userGender = (inputData.gender as string) || undefined
    const clientDate = clientTime ? new Date(clientTime) : new Date()

    const ctx: DivinationContext = {
      type, language, inputData, question, targetPersonInfo, clientDate, userAge, userGender,
    }

    // Dispatch to the correct handler (or fallback).
    const handler = selectHandler(ctx)
    const { chart, userMessage } = handler.calculate(ctx)

    // Collect calculationData for reading storage — keyed by handler.chartKey.
    const earlyCalculationDataStr = chart && handler.chartKey
      ? JSON.stringify({ [handler.chartKey]: chart })
      : null

    // Create or update pending reading.
    let pendingReadingId: string | null = preCreatedReadingId || null
    if (shouldSaveHistory && !pendingReadingId) {
      const pendingReading = await prisma.reading.create({
        data: {
          userId: session.user.id,
          type,
          modelTier: 'model1',
          status: 'pending',
          question: question || null,
          inputData,
          result: '',
          calculationData: earlyCalculationDataStr,
          language: language || 'zh-TW',
          targetType,
          familyMemberId: resolvedFamilyMemberId,
        },
      })
      pendingReadingId = pendingReading.id
    }
    if (pendingReadingId && earlyCalculationDataStr && preCreatedReadingId) {
      prisma.reading.update({
        where: { id: pendingReadingId },
        data: { calculationData: earlyCalculationDataStr },
      }).catch(() => {})
    }

    // ═══ PAIPAN ONLY MODE ═══ — skip LLM, return raw chart, no credit deduction.
    if (paipanOnly) {
      const paipanResult: Record<string, unknown> = { paipanOnly: true, type }
      if (chart && handler.chartKey) {
        paipanResult[handler.chartKey] = chart
      }
      if (shouldSaveHistory && pendingReadingId) {
        await prisma.reading.update({
          where: { id: pendingReadingId },
          data: {
            status: 'completed',
            result: JSON.stringify(paipanResult),
            calculationData: earlyCalculationDataStr || JSON.stringify(paipanResult),
          },
        }).catch(() => {})
      }
      return NextResponse.json({
        reading: { id: pendingReadingId, result: JSON.stringify(paipanResult) },
        paipanOnly: true,
      })
    }

    // Resolve LLM config; used for OpenRouter-key guard and later logging.
    const llmConfig = await resolveLLMConfig({ endpoint: 'divination', settingsMap })
    const modelName = llmConfig.model

    if (!llmConfig.isLocalProxy && !process.env.OPENROUTER_API_KEY) {
      if (pendingReadingId) {
        await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: 'AI service not configured' } }).catch(() => {})
      }
      return NextResponse.json(
        { error: language !== 'en' ? '🔧 玄機尚未啟動，請聯繫管理員配置並重啟。' : '🔧 The oracle is not set up yet. Please contact admin to configure and restart.' },
        { status: 503 }
      )
    }

    // Build system prompt (schema + reference knowledge + language rules).
    const schema = buildHandlerSchema(handler, ctx)
    const systemPrompt = buildSystemPrompt(ctx, schema)

    const preLlmMs = Date.now() - apiStart
    const llmStart = Date.now()
    let resultText: string
    try {
      const result = await completeLLM({
        endpoint: 'divination',
        userId: session.user.id,
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        model: llmConfig.model,
        maxTokens: llmConfig.maxTokens,
        timeoutMs: llmConfig.timeoutMs,
      })
      resultText = result.content
    } catch (apiErr: unknown) {
      console.error('LLM call failed:', apiErr)
      const err = apiErr as { status?: number; message?: string }
      if (pendingReadingId) {
        await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: err?.message || 'LLM error' } }).catch(() => {})
      }
      if (llmConfig.isLocalProxy) {
        return NextResponse.json(
          { error: language !== 'en' ? `本地代理錯誤：${err?.message || '未知錯誤'}` : `Local proxy error: ${err?.message || 'Unknown'}` },
          { status: 502 }
        )
      }
      const friendlyError = language !== 'en'
        ? '🔧 玄機暫時出了點小故障，您的機緣未扣除。請稍後再試，若持續異常請聯繫管理員重啟玄機。'
        : '🔧 The oracle encountered a hiccup — your Karma was not deducted. Please try again later, or contact admin if the issue persists.'
      if (err?.status === 401 || err?.status === 402) {
        return NextResponse.json({ error: friendlyError }, { status: err.status })
      }
      if (err?.status === 429) {
        return NextResponse.json(
          { error: language !== 'en' ? '🔮 天機繁忙，請稍後再試。' : '🔮 The oracle is busy. Please try again shortly.' },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: friendlyError }, { status: 502 })
    }

    // Parse + merge + validate.
    const structuredResult = parseJsonFromLLMOutput(resultText, type)
    if (chart && handler.merge) {
      handler.merge(structuredResult, chart, ctx)
    }
    const validation = validateHandlerOutput(handler, structuredResult)
    if (!validation.success) {
      console.error(`[divination] Zod validation issues type=${type} model=${modelName} latency=${Date.now() - llmStart}ms`, validation.issues)
      // Hard-reject only if sections is completely missing (matching previous behaviour).
      const hasSections = structuredResult.sections && typeof structuredResult.sections === 'object' && Object.keys(structuredResult.sections as object).length >= 1
      const hasInterpretation = !!structuredResult.interpretation
      if (!hasSections && !hasInterpretation) {
        if (pendingReadingId) {
          await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: 'Invalid LLM output format', llmRawOutput: resultText } }).catch(() => {})
        }
        const errMsg = language !== 'en'
          ? '🔧 玄機解讀格式異常，您的機緣未扣除。請重新嘗試，若持續異常請聯繫管理員。'
          : '🔧 The oracle produced an unexpected format — your Karma was not deducted. Please try again, or contact admin if the issue persists.'
        return NextResponse.json({ error: errMsg }, { status: 502 })
      }
    }

    const resultToStore = JSON.stringify(structuredResult)
    const llmPromptStr = `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userMessage}`

    // CRITICAL: Save + deduct credits immediately so they complete even if client disconnects.
    const postOps: Promise<unknown>[] = [deductCredits(session.user.id, type)]
    let savedReading: Record<string, unknown> | null = null
    if (shouldSaveHistory && pendingReadingId) {
      postOps.push(
        prisma.reading.update({
          where: { id: pendingReadingId },
          data: {
            status: 'completed',
            result: resultToStore,
            llmPrompt: llmPromptStr,
            llmRawOutput: resultText,
          },
        }).then(r => { savedReading = r })
      )
    }
    if (shouldSaveProfile && (type === 'bazi' || type === 'ziwei')) {
      const profileUpdate: Record<string, string | number | null> = {}
      if (inputData.birthDate) profileUpdate.birthDate = inputData.birthDate
      if (inputData.birthTime) profileUpdate.birthTime = inputData.birthTime
      if (inputData.birthPlace) profileUpdate.birthPlace = inputData.birthPlace
      if (inputData.gender) profileUpdate.gender = inputData.gender
      if (inputData.timeMode) profileUpdate.timeMode = inputData.timeMode
      if (inputData.exactTime) profileUpdate.exactTime = inputData.exactTime
      if (inputData.lunarToggle) profileUpdate.calendarType = inputData.lunarToggle
      if (inputData.birthEnvironment) profileUpdate.birthEnvironment = inputData.birthEnvironment
      if (inputData.birthLat != null) profileUpdate.birthLat = inputData.birthLat
      if (inputData.birthLng != null) profileUpdate.birthLng = inputData.birthLng
      if (Object.keys(profileUpdate).length > 0) {
        if (targetType === 'family' && resolvedFamilyMemberId) {
          postOps.push(prisma.familyMember.update({ where: { id: resolvedFamilyMemberId }, data: profileUpdate }))
        } else {
          postOps.push(prisma.user.update({ where: { id: session.user.id }, data: profileUpdate }))
        }
      }
    }

    const postStart = Date.now()
    await Promise.all(postOps)
    const postLlmMs = Date.now() - postStart
    const totalMs = Date.now() - apiStart
    console.log(`[divination] type=${type} total=${totalMs}ms pre=${preLlmMs}ms llm=${postStart - llmStart}ms post=${postLlmMs}ms user=${session.user.id}`)

    if (savedReading) {
      return NextResponse.json({ reading: Object.assign({}, savedReading, { result: resultToStore }), saved: true })
    }
    return NextResponse.json({
      reading: { id: null, result: resultToStore, type, createdAt: new Date() },
      saved: false,
    })
  } catch (e) {
    const totalMs = Date.now() - apiStart
    console.error(`[divination] ERROR total=${totalMs}ms`, e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
