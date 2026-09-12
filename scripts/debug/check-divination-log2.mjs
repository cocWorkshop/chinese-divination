import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
// Look for any LlmLog row created in the last 15 minutes
const since = new Date(Date.now() - 15 * 60 * 1000)
const rows = await p.llmLog.findMany({
  where: { createdAt: { gte: since } },
  orderBy: { createdAt: 'desc' },
  take: 10,
  select: { id: true, endpoint: true, status: true, errorMessage: true, latencyMs: true, createdAt: true, inputPreview: true },
})
console.log('rows since', since.toISOString(), ':', rows.length)
for (const r of rows) {
  console.log(`[${r.createdAt.toISOString()}] ${r.endpoint} ${r.status} ${r.latencyMs}ms ${r.errorMessage ? '| ERR: ' + r.errorMessage.slice(0, 120) : ''}`)
}
// Also check reading table for any new entry
const user = await p.user.findFirst({ where: { email: 'zhangweicalm@gmail.com' }, select: { id: true } })
const reading = await p.reading.findFirst({
  where: { userId: user.id, createdAt: { gte: since } },
  orderBy: { createdAt: 'desc' },
  select: { id: true, type: true, status: true, createdAt: true },
})
console.log('Latest reading since:', reading)
await p.$disconnect()
