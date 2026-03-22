export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [s1, s2] = await Promise.all([
    prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } }),
    prisma.adminSetting.findUnique({ where: { key: 'shareBonusChat' } }),
  ])

  return NextResponse.json({
    divination: parseInt(s1?.value ?? '1'),
    chat: parseInt(s2?.value ?? '2'),
  }, { headers: { 'Cache-Control': 'public, max-age=300' } })
}
