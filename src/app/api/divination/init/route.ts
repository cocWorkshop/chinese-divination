export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { holdCredits, checkCredits } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

/**
 * POST /api/divination/init
 *
 * Creates a pending reading and returns its ID immediately.
 * The frontend then calls /api/divination with this readingId to trigger LLM processing,
 * and polls /api/readings/{id} as a fallback if the main request times out.
 *
 * CREDIT HOLD (architecture plan I5): the cost is atomically DEDUCTED here and
 * recorded on the reading (creditsHeld). This closes the check-then-charge race
 * where N parallel inits against one balance produced N readings for ≤1 payment.
 * Success keeps the hold (= payment); every failure path — LLM error,
 * unparseable output, stale timeout — refunds it via readings/lifecycle.
 * paipanOnly (free) and saveHistory=false (no row → legacy deduct-on-success
 * in the main route) do not hold.
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
    // Cheap non-mutating pre-check so an insufficient balance rejects BEFORE
    // any family-member creation. The atomic hold below remains the real gate
    // (this check alone would be the old TOCTOU).
    if (!paipanOnly && saveHistory !== false) {
      const rl = await checkCredits(session.user.id, type)
      if (!rl.allowed) {
        return NextResponse.json(
          { error: language === 'en' ? `Not enough Karma (need ${rl.cost}, have ${rl.remaining}). Visit the Karma Shop to get more.` : `✨ 機緣不足（需要 ${rl.cost}，剩餘 ${rl.remaining}）。前往機緣商店補充機緣。` },
          { status: 429 }
        )
      }
    }

    // Handle family member creation if needed
    let resolvedFamilyMemberId: string | null = null
    if (targetType === 'family') {
      if (newFamilyMember?.relation) {
        if (newFamilyMember.relation === 'other') {
          const rd = typeof newFamilyMember.relationDetail === 'string' ? newFamilyMember.relationDetail.trim() : ''
          if (!rd) {
            return NextResponse.json(
              { error: language !== 'en' ? '請填寫具體關係（「其他」類型必填）' : "Please specify the relationship ('other' requires a detail)" },
              { status: 400 },
            )
          }
        }
        const created = await prisma.familyMember.create({
          data: {
            userId: session.user.id,
            relation: newFamilyMember.relation,
            relationDetail: typeof newFamilyMember.relationDetail === 'string' && newFamilyMember.relationDetail.trim() ? newFamilyMember.relationDetail.trim() : null,
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
      // No reading row → nowhere to record a hold → the main route's legacy
      // deduct-on-success flow applies. Just return validation success.
      return NextResponse.json({ readingId: null, familyMemberId: resolvedFamilyMemberId })
    }

    // Atomic credit HOLD (skipped for free paipan). Insufficient balance → 429
    // before any row exists.
    let heldAmount = 0
    if (!paipanOnly) {
      const hold = await holdCredits(session.user.id, type)
      if (!hold.held) {
        return NextResponse.json(
          { error: language === 'en' ? 'Not enough Karma. Visit the Karma Shop to get more.' : '✨ 機緣不足，前往機緣商店補充機緣。' },
          { status: 429 }
        )
      }
      heldAmount = hold.amount
    }

    // Create pending reading carrying the hold. If the create fails, refund
    // the hold immediately (compensating increment — no reading row exists).
    let pendingReading
    try {
      pendingReading = await prisma.reading.create({
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
          creditsHeld: heldAmount,
        },
      })
    } catch (createErr) {
      if (heldAmount > 0) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { increment: heldAmount } },
        }).catch((refundErr) => logger.error({ err: refundErr, userId: session.user.id, heldAmount }, 'init hold refund failed'))
      }
      throw createErr
    }

    // Stale-pending cleanup moved OFF the request path — the staleReadings
    // job (src/lib/jobs) sweeps + refunds every 10 minutes.

    return NextResponse.json({
      readingId: pendingReading.id,
      familyMemberId: resolvedFamilyMemberId,
    })
  } catch (e) {
    logger.error({ err: e, endpoint: 'divination/init' }, 'init failed')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
