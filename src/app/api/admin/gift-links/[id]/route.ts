export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

// PATCH: toggle enabled / update
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (body.enabled !== undefined) updateData.enabled = Boolean(body.enabled)
  if (body.maxClaims !== undefined) updateData.maxClaims = parseInt(String(body.maxClaims))
  if (body.note !== undefined) updateData.note = typeof body.note === 'string' ? body.note : null

  const link = await prisma.giftLink.update({ where: { id }, data: updateData })
  return NextResponse.json({ success: true, link })
}

// DELETE
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params

  await prisma.giftClaim.deleteMany({ where: { giftLinkId: id } })
  await prisma.giftLink.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
