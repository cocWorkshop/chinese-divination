export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const s1 = await prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } })

  return NextResponse.json({
    divination: parseInt(s1?.value ?? '20'),
  })
}
