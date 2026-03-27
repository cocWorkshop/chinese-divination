export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { reads: true } } },
  })

  return NextResponse.json(notifications)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const { title, titleEn, content, contentEn, type, target, expiresAt, active } = body

  if (!title || !titleEn || !content || !contentEn) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const notification = await prisma.notification.create({
    data: {
      title,
      titleEn,
      content,
      contentEn,
      type: type || 'info',
      target: target || 'all',
      active: active !== undefined ? active : true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  return NextResponse.json(notification, { status: 201 })
}
