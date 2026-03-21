export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const settings: Record<string, string> = await req.json()

  await Promise.all(
    Object.entries(settings).map(([key, value]) =>
      prisma.adminSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  )

  return NextResponse.json({ success: true })
}
