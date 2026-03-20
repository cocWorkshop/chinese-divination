import { prisma } from './prisma'

export async function cleanupLogs() {
  const now = new Date()

  // Auth logs: 90 days
  const authCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const authDeleted = await prisma.authLog.deleteMany({
    where: { createdAt: { lt: authCutoff } },
  })

  // LLM logs: 180 days
  const llmCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const llmDeleted = await prisma.llmLog.deleteMany({
    where: { createdAt: { lt: llmCutoff } },
  })

  // Frontend errors: 90 days
  const errorCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const errorsDeleted = await prisma.frontendError.deleteMany({
    where: { createdAt: { lt: errorCutoff } },
  })

  return {
    authDeleted: authDeleted.count,
    llmDeleted: llmDeleted.count,
    errorsDeleted: errorsDeleted.count,
    cutoffs: {
      auth: authCutoff.toISOString(),
      llm: llmCutoff.toISOString(),
      errors: errorCutoff.toISOString(),
    },
  }
}
