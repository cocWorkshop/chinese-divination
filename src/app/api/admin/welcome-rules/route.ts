import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const rules = await prisma.welcomeRule.findMany({
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const rule = await prisma.welcomeRule.create({
    data: {
      name: body.name || 'New Rule',
      condition: body.condition || { stage: 'new' },
      messages: body.messages || { zh: [], en: [] },
      recommendType: body.recommendType || null,
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
    },
  })
  return NextResponse.json(rule)
}
