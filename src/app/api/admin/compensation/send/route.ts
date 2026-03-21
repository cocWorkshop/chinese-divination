export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { sendCompensationEmail } from '@/lib/email'

// POST: send compensation emails
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { ids } = await req.json() as { ids: string[] }

  if (!ids?.length) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
  }

  const compensations = await prisma.compensation.findMany({
    where: { id: { in: ids }, status: 'pending' },
  })

  if (!compensations.length) {
    return NextResponse.json({ error: 'No pending compensations found' }, { status: 404 })
  }

  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || ''
  const results: { id: string; email: string; success: boolean; error?: string }[] = []

  for (const comp of compensations) {
    try {
      await sendCompensationEmail(comp.email, comp.token, {
        bonusModel1: comp.bonusModel1,
        bonusModel2: comp.bonusModel2,
        bonusChat: comp.bonusChat,
        reason: comp.reason,
      }, 'zh-TW', origin)

      await prisma.compensation.update({
        where: { id: comp.id },
        data: { status: 'sent', sentAt: new Date() },
      })

      results.push({ id: comp.id, email: comp.email, success: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ id: comp.id, email: comp.email, success: false, error: msg })
    }
  }

  return NextResponse.json({ results })
}
