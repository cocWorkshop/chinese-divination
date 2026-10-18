export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuth } from '@/lib/authLog'
import { getClientIp } from '@/lib/clientIp'

export async function POST(req: NextRequest) {
  const { token, rating, feedback } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { deleteToken: token },
    select: { id: true, email: true, deleteTokenExpiry: true },
  })

  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  if (!user.deleteTokenExpiry || user.deleteTokenExpiry < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 })
  }

  // Save feedback if provided
  if (feedback?.trim()) {
    await prisma.siteFeedback.create({
      data: {
        userId: user.id,
        rating: rating ? Math.min(5, Math.max(1, Math.round(rating))) : null,
        feedback: feedback.trim(),
      },
    })
  }

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') || null

  // AUD-10 / ISS-10: Transactionalize account deletion and GDPR cleanup
  await prisma.$transaction(async (tx) => {
    // Delete auth logs for this email
    await tx.authLog.deleteMany({ where: { email: user.email } })

    // Delete LLM logs containing user queries & divination conversations (GDPR Article 17)
    await tx.llmLog.deleteMany({ where: { userId: user.id } })

    // Delete user (cascades to readings, familyMembers, rateLimits, shareLinks, etc.)
    await tx.user.delete({ where: { id: user.id } })
  })

  // Log the deletion
  await logAuth({ action: 'logout', status: 'success', email: user.email, reason: 'account_deleted', ip, userAgent })

  return NextResponse.json({ ok: true })
}
