import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // P3: masterBackground summarize call volume
  const bg = await p.llmLog.groupBy({ by: ['endpoint'], _count: true, where: { endpoint: 'masterBackground' } })
  console.log('masterBackground calls:', JSON.stringify(bg))
  const totalMaster = await p.llmLog.count({ where: { endpoint: 'master' } })
  console.log('master calls:', totalMaster)

  // P2: turnIndex duplicates in MasterChatMessage
  const dups = await p.$queryRaw`SELECT "userId", "sessionId", "turnIndex", COUNT(*)::int as c FROM "MasterChatMessage" GROUP BY "userId", "sessionId", "turnIndex" HAVING COUNT(*) > 1 LIMIT 10`
  console.log('turnIndex duplicate groups:', JSON.stringify(dups))

  const totalMsgs = await p.masterChatMessage.count()
  const archived = await p.masterChatMessage.count({ where: { archivedAt: { not: null } } })
  console.log('MasterChatMessage total:', totalMsgs, 'archived:', archived)

  const llmTotal = await p.llmLog.count()
  const llmOld = await p.llmLog.count({ where: { createdAt: { lt: new Date(Date.now() - 180 * 24 * 3600 * 1000) } } })
  console.log('LlmLog total:', llmTotal, 'older than 180d:', llmOld)
}

main().finally(() => p.$disconnect())
