export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  bazi: true,
  iching: false,
  liuyao: true,
  ziwei: true,
  qimen: true,
  fengshui: true,
  meihua: true,
}

export async function GET() {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: 'divination_visibility' },
    })
    if (setting) {
      const parsed = JSON.parse(setting.value) as Record<string, boolean>
      return NextResponse.json({ ...DEFAULT_VISIBILITY, ...parsed })
    }
    return NextResponse.json(DEFAULT_VISIBILITY)
  } catch {
    return NextResponse.json(DEFAULT_VISIBILITY)
  }
}
