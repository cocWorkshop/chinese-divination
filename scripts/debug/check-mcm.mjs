import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const rows = await p.$queryRawUnsafe(`
  SELECT "userId", "sessionId", "turnIndex", "role", LEFT("content", 80) as content_preview,
         CASE WHEN "toolCallsJson" IS NULL THEN 0 ELSE LENGTH("toolCallsJson") END as tool_calls_len,
         "tokenCount", "createdAt"
  FROM "MasterChatMessage"
  ORDER BY "userId", "sessionId", "turnIndex" ASC
`)
console.log(`Total MasterChatMessage rows: ${rows.length}`)
for (const r of rows) {
  console.log(`  [${r.turnIndex}] ${r.role.padEnd(10)} tokens=${r.tokenCount ?? '-'} toolCalls=${r.tool_calls_len}B "${r.content_preview ?? ''}"`)
}
await p.$disconnect()
