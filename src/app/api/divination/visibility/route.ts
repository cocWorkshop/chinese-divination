export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface DivinationVisibilityItem {
  type: string
  visible: boolean
  order: number
  cost?: number
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

async function attachCosts(items: DivinationVisibilityItem[]): Promise<DivinationVisibilityItem[]> {
  const costKeys = items.map(i => `cost_${i.type}`)
  const costSettings = await prisma.adminSetting.findMany({ where: { key: { in: costKeys } } })
  const costMap = Object.fromEntries(costSettings.map(s => [s.key.replace('cost_', ''), parseInt(s.value) || 0]))
  const defaultCosts: Record<string, number> = { bazi: 5, ziwei: 5, qimen: 5, meihua: 3, iching: 3, liuyao: 3, fengshui: 3 }
  return items.map(i => ({ ...i, cost: costMap[i.type] ?? defaultCosts[i.type] ?? 3 }))
}

export async function GET() {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: 'divination_visibility' },
    })
    let items: DivinationVisibilityItem[]
    if (setting) {
      const parsed = JSON.parse(setting.value)
      if (Array.isArray(parsed)) {
        items = parsed as DivinationVisibilityItem[]
        const existingTypes = new Set(items.map(i => i.type))
        let maxOrder = Math.max(...items.map(i => i.order), 0)
        for (const def of DEFAULT_VISIBILITY) {
          if (!existingTypes.has(def.type)) {
            items.push({ type: def.type, visible: def.visible, order: ++maxOrder })
          }
        }
        items.sort((a, b) => a.order - b.order)
      } else {
        const oldFormat = parsed as Record<string, boolean>
        items = DEFAULT_VISIBILITY.map((def, i) => ({
          type: def.type,
          visible: oldFormat[def.type] ?? def.visible,
          order: i + 1,
        }))
      }
    } else {
      items = [...DEFAULT_VISIBILITY]
    }
    items = await attachCosts(items)
    return NextResponse.json(items, { headers: { 'Cache-Control': 'no-cache' } })
  } catch {
    return NextResponse.json(DEFAULT_VISIBILITY, { headers: { 'Cache-Control': 'no-cache' } })
  }
}
