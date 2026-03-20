import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, user: admin } = await requireAdmin()
  if (error) return error

  const { hourlyQuota, isAdmin, isPaid, role, bonusModel1, bonusModel2, grantBonus, resetRateLimit } = await req.json()
  const targetId = params.id

  if (admin!.id === targetId && isAdmin === false) {
    return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (hourlyQuota !== undefined) updateData.hourlyQuota = Math.max(0, parseInt(hourlyQuota))
  if (isAdmin !== undefined) updateData.isAdmin = Boolean(isAdmin)
  if (isPaid !== undefined) updateData.isPaid = Boolean(isPaid)
  if (role !== undefined && ['arcane', 'ethereal', 'prestige', 'admin'].includes(role)) updateData.role = role
  if (bonusModel1 !== undefined) updateData.bonusModel1 = Math.max(0, parseInt(bonusModel1))
  if (bonusModel2 !== undefined) updateData.bonusModel2 = Math.max(0, parseInt(bonusModel2))

  // Grant bonus credits (set absolute value)
  if (grantBonus) {
    const m1 = parseInt(grantBonus.model1)
    const m2 = parseInt(grantBonus.model2)
    const chat = parseInt(grantBonus.chat)
    if (!isNaN(m1)) updateData.bonusModel1 = m1
    if (!isNaN(m2)) updateData.bonusModel2 = m2
    if (!isNaN(chat)) updateData.bonusChat = chat
  }

  await prisma.user.update({ where: { id: targetId }, data: updateData })

  if (resetRateLimit) {
    const now = new Date()
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    await prisma.rateLimit.deleteMany({ where: { userId: targetId, windowStart } })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, user: admin } = await requireAdmin()
  if (error) return error

  if (admin!.id === params.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
