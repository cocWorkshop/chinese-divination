export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, user: admin } = await requireAdmin()
  if (error) return error

  const { isAdmin, isPaid, role, divinationCredits, chatCredits, credits } = await req.json()
  const targetId = params.id

  if (admin!.id === targetId && isAdmin === false) {
    return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (isAdmin !== undefined) updateData.isAdmin = Boolean(isAdmin)
  if (isPaid !== undefined) updateData.isPaid = Boolean(isPaid)
  if (role !== undefined && ['user', 'admin'].includes(role)) updateData.role = role
  if (divinationCredits !== undefined) updateData.divinationCredits = Math.max(0, parseInt(divinationCredits))
  if (chatCredits !== undefined) updateData.chatCredits = Math.max(0, parseInt(chatCredits))
  if (credits !== undefined) updateData.credits = Math.max(0, parseInt(credits))

  await prisma.user.update({ where: { id: targetId }, data: updateData })

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
