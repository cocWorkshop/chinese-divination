import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const rows = await p.llmLog.findMany({
  where: { endpoint: 'divination' },
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: { id: true, model: true, status: true, errorMessage: true, latencyMs: true, createdAt: true, inputPreview: true },
})
console.log(JSON.stringify(rows, null, 2))
await p.$disconnect()
