export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [s1, s2] = await Promise.all([
    prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } }),
    prisma.adminSetting.findUnique({ where: { key: 'shareBonusModel2' } }),
  ])

  return NextResponse.json({
    model1: parseInt(s1?.value ?? '20'),
    model2: parseInt(s2?.value ?? '0'),
  })
}
