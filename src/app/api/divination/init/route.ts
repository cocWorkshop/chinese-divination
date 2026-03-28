export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkDivinationCredits } from '@/lib/rateLimit'

/**
 * POST /api/divination/init
 * 
 * Creates a pending reading and returns its ID immediately.
 * The frontend then calls /api/divination with this readingId to trigger LLM processing,
 * and polls /api/readings/{id} as a fallback if the main request times out.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, inputData, language, question, saveHistory, targetType: rawTargetType, familyMemberId, newFamilyMember, paipanOnly } = await req.json()
    const targetType = rawTargetType === 'family' ? 'family' : 'self'

    if (!type || !inputData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (typeof question === 'string' && question.length > 500) {
      return NextResponse.json({ error: 'Question too long (max 500 characters)' }, { status: 400 })
    }

    const shouldSaveHistory = saveHistory !== false

    // Check credits + maintenance (skip credit check for paipanOnly mode)
    const adminSettings = await prisma.adminSetting.findMany({
      where: { key: { in: ['maintenanceMode', 'divinationEnabled'] } },
    })
    const settingsMap = Object.fromEntries(adminSettings.map(s => [s.key, s.value]))

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
      const rl = await checkDivinationCredits(session.user.id)
      if (!rl.allowed) {
        return NextResponse.json(
          { error: language === 'en' ? 'Not enough Karma. Visit the Karma Shop to get more.' : '✨ 機緣不足，前往機緣商店補充機緣。' },
          { status: 429 }
        )
      }
    }

    // Handle family member creation if needed
    let resolvedFamilyMemberId: string | null = null
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
          },
        })
        resolvedFamilyMemberId = created.id
      } else if (familyMemberId) {
        const member = await prisma.familyMember.findFirst({ where: { id: familyMemberId, userId: session.user.id } })
        if (!member) {
          return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
        }
        resolvedFamilyMemberId = member.id
      }
    }

    if (!shouldSaveHistory) {
      // No reading to create, just return validation success
      return NextResponse.json({ readingId: null, familyMemberId: resolvedFamilyMemberId })
    }

    // Create pending reading
    const pendingReading = await prisma.reading.create({
      data: {
        userId: session.user.id,
        type,
        modelTier: 'model1',
        status: 'pending',
        question: question || null,
        inputData,
        result: '',
        language: language || 'zh-TW',
        targetType,
        familyMemberId: resolvedFamilyMemberId,
      },
    })

    // Also clean up stale pending readings (>15 min old)
    prisma.reading.updateMany({
      where: {
        userId: session.user.id,
        status: 'pending',
        createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
      },
      data: { status: 'failed', result: 'Timed out — server did not complete processing' },
    }).catch(() => {})

    return NextResponse.json({
      readingId: pendingReading.id,
      familyMemberId: resolvedFamilyMemberId,
    })
  } catch (e) {
    console.error('[divination/init] ERROR', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
