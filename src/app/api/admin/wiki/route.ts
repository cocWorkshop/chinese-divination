export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

// GET: list articles
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || 'all'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (category !== 'all') where.category = category

  const articles = await prisma.wikiArticle.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    select: { id: true, slug: true, title: true, summary: true, category: true, published: true, sortOrder: true, updatedAt: true },
  })

  return NextResponse.json({ articles })
}

// POST: create article
export async function POST(req: NextRequest) {
  const { error, user } = await requireAdmin()
  if (error) return error

  const { title, slug, summary, content, category, coverImage, published, sortOrder } = await req.json()

  if (!title || !slug || !content) {
    return NextResponse.json({ error: '標題、slug和內容為必填' }, { status: 400 })
  }

  // Check slug uniqueness
  const existing = await prisma.wikiArticle.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'slug 已存在' }, { status: 400 })
  }

  const article = await prisma.wikiArticle.create({
    data: {
      title,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      summary: summary || null,
      content,
      category: category || 'general',
      coverImage: coverImage || null,
      published: published ?? false,
      sortOrder: sortOrder ?? 0,
      createdBy: user!.id,
    },
  })

  return NextResponse.json({ success: true, article })
}
