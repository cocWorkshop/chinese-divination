import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const idx = await p.$queryRaw`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('MasterChatMessage','RateLimit','GiftLink','Compensation','MasterSession') ORDER BY tablename, indexname`
  for (const r of idx as any[]) console.log(r.tablename, '|', r.indexname)
}

main().finally(() => p.$disconnect())
