import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const user = await p.user.findFirst({ where: { email: 'zhangweicalm@gmail.com' }, select: { id: true } })
const rows = await p.reading.findMany({
  where: { userId: user.id, deletedAt: null },
  select: { id: true, type: true, targetType: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
})
const byType = {}
for (const r of rows) byType[r.type] = (byType[r.type] || 0) + 1
console.log('By type:', byType)
console.log('Total:', rows.length)
await p.$disconnect()
