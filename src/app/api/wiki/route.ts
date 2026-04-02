export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: list published articles
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || 'all'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { published: true }
  if (category !== 'all') where.category = category

  const articles = await prisma.wikiArticle.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    select: { slug: true, title: true, summary: true, category: true, coverImage: true, updatedAt: true },
  })

  return NextResponse.json({ articles })
}
