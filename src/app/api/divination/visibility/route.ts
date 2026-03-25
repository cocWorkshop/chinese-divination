export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface DivinationVisibilityItem {
  type: string
  visible: boolean
  order: number
}

const DEFAULT_VISIBILITY: DivinationVisibilityItem[] = [
  { type: 'bazi', visible: true, order: 1 },
  { type: 'ziwei', visible: true, order: 2 },
  { type: 'liuyao', visible: true, order: 3 },
  { type: 'qimen', visible: true, order: 4 },
  { type: 'fengshui', visible: true, order: 5 },
  { type: 'meihua', visible: true, order: 6 },
  { type: 'iching', visible: false, order: 7 },
  { type: 'other', visible: false, order: 8 },
]

export async function GET() {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: 'divination_visibility' },
    })
    if (setting) {
      const parsed = JSON.parse(setting.value)
      // Support new array format
      if (Array.isArray(parsed)) {
        const items = parsed as DivinationVisibilityItem[]
        // Ensure all types are present (add missing ones at the end)
        const existingTypes = new Set(items.map(i => i.type))
        let maxOrder = Math.max(...items.map(i => i.order), 0)
        for (const def of DEFAULT_VISIBILITY) {
          if (!existingTypes.has(def.type)) {
            items.push({ type: def.type, visible: def.visible, order: ++maxOrder })
          }
        }
        return NextResponse.json(items.sort((a, b) => a.order - b.order), { headers: { 'Cache-Control': 'no-cache' } })
      }
      // Migrate from old Record<string, boolean> format
      const oldFormat = parsed as Record<string, boolean>
      const migrated: DivinationVisibilityItem[] = DEFAULT_VISIBILITY.map((def, i) => ({
        type: def.type,
        visible: oldFormat[def.type] ?? def.visible,
        order: i + 1,
      }))
      return NextResponse.json(migrated, { headers: { 'Cache-Control': 'no-cache' } })
    }
    return NextResponse.json(DEFAULT_VISIBILITY, { headers: { 'Cache-Control': 'no-cache' } })
  } catch {
    return NextResponse.json(DEFAULT_VISIBILITY, { headers: { 'Cache-Control': 'no-cache' } })
  }
}
