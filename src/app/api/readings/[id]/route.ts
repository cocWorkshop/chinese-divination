import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const reading = await prisma.reading.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  })
  if (!reading) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Soft delete
  await prisma.reading.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
