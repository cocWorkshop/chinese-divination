export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const url = req.nextUrl.searchParams
  const page = parseInt(url.get('page') || '1', 10)
  const limit = parseInt(url.get('limit') || '30', 10)
  const typeFilter = url.get('type') || ''
  const statusFilter = url.get('status') || ''

  const where: Record<string, unknown> = {}
  if (typeFilter) where.type = typeFilter
  if (statusFilter) where.status = statusFilter

  const [total, readings] = await Promise.all([
    prisma.reading.count({ where }),
    prisma.reading.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        question: true,
        language: true,
        targetType: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
        familyMember: { select: { name: true, relation: true } },
      },
    }),
  ])

  // Get LLM logs for these readings by matching userId + createdAt window
  const readingIds = readings.map(r => r.id)
  
  // Match LLM logs to readings via time proximity (within 5 min window)
  const llmLogs = readings.length > 0 ? await prisma.llmLog.findMany({
    where: {
      endpoint: 'divination',
      createdAt: {
        gte: new Date(new Date(readings[readings.length - 1].createdAt).getTime() - 5 * 60000),
        lte: new Date(new Date(readings[0].createdAt).getTime() + 5 * 60000),
      },
    },
    select: {
      userId: true,
      latencyMs: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      model: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  }) : []

  // Match each reading to its LLM log by userId + closest time
  const enriched = readings.map(r => {
    const userEmail = r.user?.email
    // Find matching LLM log: same user, closest time within 5 min
    const matched = llmLogs.find(l => {
      if (!l.userId) return false
      const timeDiff = Math.abs(new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime())
      return timeDiff < 5 * 60000
    })

    return {
      ...r,
      llm: matched ? {
        latencyMs: matched.latencyMs,
        promptTokens: matched.promptTokens,
        completionTokens: matched.completionTokens,
        totalTokens: matched.totalTokens,
        model: matched.model,
        status: matched.status,
      } : null,
    }
  })

  // Stats
  const [stats] = await Promise.all([
    prisma.$queryRaw<[{ avg_latency: number; total: number; completed: number; failed: number; pending: number }]>`
      SELECT 
        COALESCE(AVG(l."latencyMs"), 0)::int as avg_latency,
        COUNT(DISTINCT r.id)::int as total,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed')::int as completed,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'failed')::int as failed,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'pending')::int as pending
      FROM "Reading" r
      LEFT JOIN "LlmLog" l ON l.endpoint = 'divination' 
        AND l."userId" = r."userId"
        AND l."createdAt" BETWEEN r."createdAt" - interval '5 minutes' AND r."createdAt" + interval '5 minutes'
      WHERE r."createdAt" > NOW() - interval '7 days'
    `,
  ])

  // Per-type avg latency (last 7 days)
  const typeStats = await prisma.$queryRaw<{ type: string; count: number; avg_ms: number }[]>`
    SELECT 
      r.type,
      COUNT(*)::int as count,
      COALESCE(AVG(l."latencyMs"), 0)::int as avg_ms
    FROM "Reading" r
    LEFT JOIN "LlmLog" l ON l.endpoint = 'divination'
      AND l."userId" = r."userId"
      AND l."createdAt" BETWEEN r."createdAt" - interval '5 minutes' AND r."createdAt" + interval '5 minutes'
    WHERE r."createdAt" > NOW() - interval '7 days' AND r.status = 'completed'
    GROUP BY r.type
    ORDER BY count DESC
  `

  return NextResponse.json({
    readings: enriched,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: stats[0] || { avg_latency: 0, total: 0, completed: 0, failed: 0, pending: 0 },
    typeStats,
  })
}
