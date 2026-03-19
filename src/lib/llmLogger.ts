import { prisma } from './prisma'

interface LlmLogEntry {
  userId?: string | null
  endpoint: string
  model: string
  modelTier?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  latencyMs?: number
  status?: string
  errorMessage?: string
  inputPreview?: string
  outputPreview?: string
}

export async function logLlmCall(entry: LlmLogEntry): Promise<void> {
  try {
    await prisma.llmLog.create({
      data: {
        userId: entry.userId || null,
        endpoint: entry.endpoint,
        model: entry.model,
        modelTier: entry.modelTier || null,
        promptTokens: entry.promptTokens || 0,
        completionTokens: entry.completionTokens || 0,
        totalTokens: entry.totalTokens || 0,
        latencyMs: entry.latencyMs || 0,
        status: entry.status || 'success',
        errorMessage: entry.errorMessage || null,
        inputPreview: entry.inputPreview?.slice(0, 500) || null,
        outputPreview: entry.outputPreview?.slice(0, 500) || null,
      },
    })
  } catch (err) {
    // Don't let logging failures break the main flow
    console.error('Failed to log LLM call:', err)
  }
}
