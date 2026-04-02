export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: single published article by slug
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const article = await prisma.wikiArticle.findUnique({
    where: { slug },
    select: { slug: true, title: true, summary: true, content: true, category: true, coverImage: true, updatedAt: true },
  })

  if (!article || !(await prisma.wikiArticle.findFirst({ where: { slug, published: true } }))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ article })
}
