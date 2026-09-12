/**
 * Xuanji Master turn latency monitoring and user experience feedback triggers.
 * (Issue #149)
 */

export interface MasterTurnMetrics {
  userId: string
  sessionId: string
  model: string
  requestId?: string
  totalDurationMs: number
  ttftMs: number | null
  toolDurations: Record<string, number>
  isTimeout: boolean
}

export interface CreateMonitorOptions {
  userId: string
  sessionId: string
  model: string
  requestId?: string
}

export const SLOW_RESPONSE_THRESHOLD_MS = 15_000

export class TurnMonitor {
  private readonly userId: string
  private readonly sessionId: string
  private readonly model: string
  private readonly requestId?: string
  private readonly startedAt: number
  private ttftMs: number | null = null
  private toolDurations: Record<string, number> = {}

  constructor(options: CreateMonitorOptions) {
    this.userId = options.userId
    this.sessionId = options.sessionId
    this.model = options.model
    this.requestId = options.requestId
    this.startedAt = Date.now()
  }

  recordFirstToken(): void {
    if (this.ttftMs === null) {
      this.ttftMs = Date.now() - this.startedAt
    }
  }

  getTTFT(): number | null {
    return this.ttftMs
  }

  recordToolExecution(toolName: string, durationMs: number): void {
    this.toolDurations[toolName] = (this.toolDurations[toolName] || 0) + durationMs
  }

  finish(options: { isTimeout?: boolean } = {}): MasterTurnMetrics {
    const totalDurationMs = Date.now() - this.startedAt
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      model: this.model,
      requestId: this.requestId,
      totalDurationMs,
      ttftMs: this.ttftMs,
      toolDurations: { ...this.toolDurations },
      isTimeout: options.isTimeout ?? false,
    }
  }
}

export function createTurnMonitor(options: CreateMonitorOptions): TurnMonitor {
  return new TurnMonitor(options)
}

export function isTimeoutError(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true

  if (!err) return false

  if (typeof err === 'object') {
    const errorObj = err as { name?: string; message?: string; code?: string }
    if (errorObj.name === 'AbortError') return true
    if (errorObj.code === 'ETIMEDOUT') return true

    const msg = String(errorObj.message || '').toLowerCase()
    if (
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('etimedout') ||
      msg.includes('aborted') ||
      msg.includes('abort') ||
      msg.includes('504') ||
      msg.includes('deadline exceeded')
    ) {
      return true
    }
  }

  return false
}

export interface FeedbackPromptDecision {
  shouldPrompt: boolean
  reason?: 'slow_response' | 'milestone' | 'timeout'
}

export function shouldPromptExperienceFeedback({
  metrics,
  turnCount = 1,
}: {
  metrics: MasterTurnMetrics
  turnCount?: number
}): FeedbackPromptDecision {
  if (metrics.isTimeout) {
    return { shouldPrompt: true, reason: 'timeout' }
  }

  if (metrics.totalDurationMs >= SLOW_RESPONSE_THRESHOLD_MS) {
    return { shouldPrompt: true, reason: 'slow_response' }
  }

  if (turnCount > 0 && turnCount % 5 === 0) {
    return { shouldPrompt: true, reason: 'milestone' }
  }

  return { shouldPrompt: false }
}
