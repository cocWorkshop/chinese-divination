export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { title, titleEn, content, contentEn, type, target, expiresAt, active } = body

  const notification = await prisma.notification.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: String(title) }),
      ...(titleEn !== undefined && { titleEn: String(titleEn) }),
      ...(content !== undefined && { content: String(content) }),
      ...(contentEn !== undefined && { contentEn: String(contentEn) }),
      ...(type !== undefined && { type: String(type) }),
      ...(target !== undefined && { target: String(target) }),
      ...(active !== undefined && { active: Boolean(active) }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(String(expiresAt)) : null }),
    },
  })

  return NextResponse.json(notification)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  await prisma.notification.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
