import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

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

  const rule = await prisma.welcomeRule.update({
    where: { id },
    data: {
      name: typeof body.name === 'string' ? body.name : undefined,
      condition: typeof body.condition === 'string' ? body.condition : undefined,
      messages: typeof body.messages === 'string' ? body.messages : undefined,
      recommendType: typeof body.recommendType === 'string' ? body.recommendType : null,
      priority: typeof body.priority === 'number' ? body.priority : undefined,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    },
  })
  return NextResponse.json(rule)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  await prisma.welcomeRule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
