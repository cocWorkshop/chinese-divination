export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { logCreditChange } from '@/lib/creditLogger'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { error, user: admin } = await requireAdmin()
  if (error) return error

  const { id: targetId } = await params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { isAdmin, isPaid, role, divinationCredits, chatCredits, credits } = body

  if (admin!.id === targetId && isAdmin === false) {
    return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })
  }

  // Get old balance before update (for audit log)
  const oldUser = credits !== undefined
    ? await prisma.user.findUnique({ where: { id: targetId }, select: { credits: true } })
    : null

  const updateData: Record<string, unknown> = {}
  if (isAdmin !== undefined) updateData.isAdmin = Boolean(isAdmin)
  if (isPaid !== undefined) updateData.isPaid = Boolean(isPaid)
  if (role !== undefined && typeof role === 'string' && ['user', 'admin'].includes(role)) updateData.role = role
  if (divinationCredits !== undefined) updateData.divinationCredits = Math.max(0, parseInt(String(divinationCredits)))
  if (chatCredits !== undefined) updateData.chatCredits = Math.max(0, parseInt(String(chatCredits)))
  if (credits !== undefined) updateData.credits = Math.max(0, parseInt(String(credits)))

  const updatedUser = await prisma.user.update({
    where: { id: targetId },
    data: updateData,
    select: { credits: true },
  })

  // Log credit change if admin adjusted credits
  if (credits !== undefined && oldUser) {
    const newBalance = updatedUser.credits
    const diff = newBalance - oldUser.credits
    if (diff !== 0) {
      logCreditChange({
        userId: targetId,
        action: 'grant_admin',
        amount: diff,
        balance: newBalance,
        source: 'admin',
        note: `Set by admin ${admin!.id}`,
      })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { error, user: admin } = await requireAdmin()
  if (error) return error

  const { id } = await params

  if (admin!.id === id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
