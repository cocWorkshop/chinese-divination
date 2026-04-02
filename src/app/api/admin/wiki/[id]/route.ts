export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

// GET: single article (for editing)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  const article = await prisma.wikiArticle.findUnique({ where: { id } })
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ article })
}

// PATCH: update article
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (body.title !== undefined) data.title = body.title
  if (body.slug !== undefined) data.slug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (body.summary !== undefined) data.summary = body.summary || null
  if (body.content !== undefined) data.content = body.content
  if (body.category !== undefined) data.category = body.category
  if (body.coverImage !== undefined) data.coverImage = body.coverImage || null
  if (body.published !== undefined) data.published = Boolean(body.published)
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0

  // Check slug uniqueness if changed
  if (data.slug) {
    const existing = await prisma.wikiArticle.findFirst({ where: { slug: data.slug, NOT: { id } } })
    if (existing) return NextResponse.json({ error: 'slug 已存在' }, { status: 400 })
  }

  const article = await prisma.wikiArticle.update({ where: { id }, data })
  return NextResponse.json({ success: true, article })
}

// DELETE
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  await prisma.wikiArticle.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
