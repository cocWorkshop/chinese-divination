export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { generateToken, tokenExpiry } from '@/lib/email'

import { isPseudoError } from './utils'

// GET: list compensations + fetch error-affected users
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  // Fetch affected users from error logs
  if (action === 'affected-users') {
    const since = searchParams.get('since') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const includePseudoErrors = searchParams.get('includePseudoErrors') === 'true'

    // LLM errors
    const rawLlmErrors = await prisma.llmLog.findMany({
      where: { status: 'error', createdAt: { gte: new Date(since) } },
      select: { id: true, userId: true, endpoint: true, errorMessage: true, model: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    // Frontend errors
    const rawFrontendErrors = await prisma.frontendError.findMany({
      where: { createdAt: { gte: new Date(since) } },
      select: { id: true, userId: true, endpoint: true, error: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    const llmErrors = includePseudoErrors
      ? rawLlmErrors
      : rawLlmErrors.filter(e => !isPseudoError(e.errorMessage))

    const frontendErrors = includePseudoErrors
      ? rawFrontendErrors
      : rawFrontendErrors.filter(e => !isPseudoError(e.error, e.status))

    // Collect unique user IDs
    const userIds = new Set<string>()
    llmErrors.forEach(e => e.userId && userIds.add(e.userId))
    frontendErrors.forEach(e => e.userId && userIds.add(e.userId))

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, email: true, name: true },
    })
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    // Find users who already have compensations (any status except expired) or were dismissed
    const existingComps = await prisma.compensation.findMany({
      where: { status: { in: ['pending', 'sent', 'claimed', 'dismissed'] } },
      select: { email: true },
    })
    const compensatedEmails = new Set(existingComps.map(c => c.email))

    // Group by user, excluding already compensated
    const affected: Record<string, { user: typeof users[0], llmErrors: typeof llmErrors, frontendErrors: typeof frontendErrors }> = {}
    for (const e of llmErrors) {
      if (!e.userId) continue
      const user = userMap[e.userId]
      if (!user || compensatedEmails.has(user.email)) continue
      if (!affected[e.userId]) affected[e.userId] = { user, llmErrors: [], frontendErrors: [] }
      affected[e.userId].llmErrors.push(e)
    }
    for (const e of frontendErrors) {
      if (!e.userId) continue
      const user = userMap[e.userId]
      if (!user || compensatedEmails.has(user.email)) continue
      if (!affected[e.userId]) affected[e.userId] = { user, llmErrors: [], frontendErrors: [] }
      affected[e.userId].frontendErrors.push(e)
    }

    return NextResponse.json({ affected: Object.values(affected) })
  }

  // Default: list compensations
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')
  const status = searchParams.get('status') || undefined

  const where = status ? { status } : {}
  const [compensations, total] = await Promise.all([
    prisma.compensation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.compensation.count({ where }),
  ])

  return NextResponse.json({
    compensations,
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

// POST: create compensation record(s) or dismiss affected user
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()

  // Dismiss action: mark pseudo-error user as dismissed so they leave the affected list
  if (body?.action === 'dismiss') {
    const { email, userId, reason } = body as { email?: string; userId?: string; reason?: string }
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const dismissed = await prisma.compensation.create({
      data: {
        userId: userId || null,
        email,
        reason: reason || '管理員忽略（額度用盡/無需補償）',
        sourceType: 'dismissed',
        token: generateToken(),
        status: 'dismissed',
      },
    })
    return NextResponse.json({ ok: true, dismissed })
  }

  const { items } = body as {
    items: Array<{
      email: string
      userId?: string
      reason: string
      sourceType?: string
      sourceIds?: string
      divinationCredits?: number
      chatCredits?: number
    }>
  }

  if (!items?.length) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 })
  }

  const created = []
  for (const item of items) {
    const comp = await prisma.compensation.create({
      data: {
        userId: item.userId || null,
        email: item.email,
        reason: item.reason,
        sourceType: item.sourceType || 'manual',
        sourceIds: item.sourceIds || null,
        bonusModel1: item.divinationCredits || 0,
        bonusModel2: 0,
        bonusChat: item.chatCredits || 0,
        token: generateToken(),
        status: 'pending',
        expiresAt: tokenExpiry(7 * 24), // 7 days
      },
    })
    created.push(comp)
  }

  return NextResponse.json({ created })
}
