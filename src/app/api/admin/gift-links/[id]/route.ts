export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

// PATCH: toggle enabled / update
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = params
  const body = await req.json()

  const updateData: Record<string, unknown> = {}
  if (body.enabled !== undefined) updateData.enabled = Boolean(body.enabled)
  if (body.maxClaims !== undefined) updateData.maxClaims = parseInt(body.maxClaims)
  if (body.note !== undefined) updateData.note = body.note

  const link = await prisma.giftLink.update({ where: { id }, data: updateData })
  return NextResponse.json({ success: true, link })
}

// DELETE
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  await prisma.giftClaim.deleteMany({ where: { giftLinkId: params.id } })
  await prisma.giftLink.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
