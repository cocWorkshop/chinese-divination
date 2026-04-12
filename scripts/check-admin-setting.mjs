import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const rows = await p.adminSetting.findMany({
  where: { key: { in: ['model1Name', 'chatModelName', 'llmMaxTokens', 'llmTimeoutSeconds', 'divinationReasoningEffort', 'chatReasoningEffort', 'llmReasoningEffort'] } },
})
console.log(JSON.stringify(rows, null, 2))
await p.$disconnect()
