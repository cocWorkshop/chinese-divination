import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const members = await prisma.familyMember.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { relation, name, birthDate, birthTime, birthPlace, gender } = await req.json()
  if (!relation) {
    return NextResponse.json({ error: 'Relation is required' }, { status: 400 })
  }

  const member = await prisma.familyMember.create({
    data: { userId: session.user.id, relation, name, birthDate, birthTime, birthPlace, gender },
  })

  return NextResponse.json({ member })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, relation, name, birthDate, birthTime, birthPlace, gender } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  // Verify ownership
  const existing = await prisma.familyMember.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const member = await prisma.familyMember.update({
    where: { id },
    data: { relation, name, birthDate, birthTime, birthPlace, gender },
  })

  return NextResponse.json({ member })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const existing = await prisma.familyMember.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.familyMember.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
