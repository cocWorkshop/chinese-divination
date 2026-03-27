export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const { title, titleEn, content, contentEn, type, target, expiresAt, active } = body

  const notification = await prisma.notification.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(titleEn !== undefined && { titleEn }),
      ...(content !== undefined && { content }),
      ...(contentEn !== undefined && { contentEn }),
      ...(type !== undefined && { type }),
      ...(target !== undefined && { target }),
      ...(active !== undefined && { active }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
  })

  return NextResponse.json(notification)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  await prisma.notification.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
