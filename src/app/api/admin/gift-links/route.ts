export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// Calculate total credits already distributed + allocated via gift links
async function getGiftBudgetUsage(): Promise<{ distributed: number; allocated: number }> {
  // Actually claimed credits
  const claimed = await prisma.giftClaim.aggregate({ _sum: { credits: true } })
  const distributed = claimed._sum.credits || 0

  // Total potential allocation (active links × maxClaims × credits)
  const activeLinks = await prisma.giftLink.findMany({
    where: {
      enabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { credits: true, maxClaims: true, claimCount: true },
  })
  const allocated = activeLinks.reduce((sum, l) => {
    const remaining = l.maxClaims === 0 ? l.credits * 100 : l.credits * (l.maxClaims - l.claimCount)
    return sum + Math.max(0, remaining)
  }, 0)

  return { distributed, allocated }
}

// GET: list gift links
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')

  const [links, total, budget] = await Promise.all([
    prisma.giftLink.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { claims: true } } },
    }),
    prisma.giftLink.count(),
    getGiftBudgetUsage(),
  ])

  // Get budget limit from settings
  const budgetSetting = await prisma.adminSetting.findUnique({ where: { key: 'giftLinkTotalBudget' } })
  const budgetLimit = parseInt(budgetSetting?.value || '0') || 0 // 0 = unlimited

  return NextResponse.json({
    links, total, page, pages: Math.ceil(total / limit),
    budget: { limit: budgetLimit, distributed: budget.distributed, allocated: budget.allocated },
  })
}

// POST: create gift link
export async function POST(req: NextRequest) {
  const { error, user } = await requireAdmin()
  if (error) return error

  const { credits, maxClaims, note, expiresInHours } = await req.json()

  if (!credits || credits < 1) {
    return NextResponse.json({ error: '机缘数量必须大于0' }, { status: 400 })
  }

  const parsedCredits = parseInt(credits)
  const parsedMaxClaims = parseInt(maxClaims) || 1

  // Check budget limit
  const budgetSetting = await prisma.adminSetting.findUnique({ where: { key: 'giftLinkTotalBudget' } })
  const budgetLimit = parseInt(budgetSetting?.value || '0') || 0
  if (budgetLimit > 0) {
    const { distributed, allocated } = await getGiftBudgetUsage()
    const thisLinkMax = parsedMaxClaims === 0 ? parsedCredits * 100 : parsedCredits * parsedMaxClaims
    if (distributed + allocated + thisLinkMax > budgetLimit) {
      return NextResponse.json({
        error: `超出總預算限制。已釋放: ${distributed}，已分配: ${allocated}，本次需: ${thisLinkMax}，上限: ${budgetLimit}`,
      }, { status: 400 })
    }
  }

  const code = randomBytes(6).toString('base64url')
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600000) : null

  const link = await prisma.giftLink.create({
    data: {
      code,
      credits: parsedCredits,
      maxClaims: parsedMaxClaims,
      note: note || null,
      expiresAt,
      createdBy: user!.id,
    },
  })

  return NextResponse.json({ success: true, link, url: `/gift/${code}` })
}
