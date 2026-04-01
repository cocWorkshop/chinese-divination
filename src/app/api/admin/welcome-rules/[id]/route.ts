import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const rule = await prisma.welcomeRule.update({
    where: { id: params.id },
    data: {
      name: body.name,
      condition: body.condition,
      messages: body.messages,
      recommendType: body.recommendType ?? null,
      priority: body.priority,
      enabled: body.enabled,
    },
  })
  return NextResponse.json(rule)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  await prisma.welcomeRule.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
