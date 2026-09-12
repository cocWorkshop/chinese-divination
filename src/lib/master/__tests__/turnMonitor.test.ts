import { describe, it, expect } from 'vitest'
import {
  createTurnMonitor,
  isTimeoutError,
  shouldPromptExperienceFeedback,
  type MasterTurnMetrics,
} from '../turnMonitor'

describe('Master Xuanji Turn Monitor & Feedback (Issue #149)', () => {
  it('should track TTFT and total duration accurately', () => {
    const monitor = createTurnMonitor({
      userId: 'user_123',
      sessionId: 'sess_456',
      model: 'openai/gpt-4o',
      requestId: 'req_789',
    })

    // Simulate first token after 250ms
    const startTime = Date.now()
    monitor.recordFirstToken()
    const ttft = monitor.getTTFT()
    expect(ttft).toBeDefined()
    expect(ttft).toBeGreaterThanOrEqual(0)

    // Simulate tool call
    monitor.recordToolExecution('get_reading_detail', 120)
    monitor.recordToolExecution('calculate_bazi_chart', 85)

    const metrics = monitor.finish()
    expect(metrics.totalDurationMs).toBeGreaterThanOrEqual(0)
    expect(metrics.ttftMs).toBe(ttft)
    expect(metrics.toolDurations['get_reading_detail']).toBe(120)
    expect(metrics.toolDurations['calculate_bazi_chart']).toBe(85)
    expect(metrics.model).toBe('openai/gpt-4o')
  })

  it('should identify timeout errors reliably across various timeout shapes', () => {
    const abortErr = new Error('The user aborted a request.')
    abortErr.name = 'AbortError'
    expect(isTimeoutError(abortErr)).toBe(true)

    const timeoutErr = new Error('Gateway Timeout: 504')
    expect(isTimeoutError(timeoutErr)).toBe(true)

    const netTimeoutErr = new Error('connect ETIMEDOUT 104.18.2.1:443')
    expect(isTimeoutError(netTimeoutErr)).toBe(true)

    const standardErr = new Error('Invalid JSON format from model')
    expect(isTimeoutError(standardErr)).toBe(false)
  })

  it('should trigger user experience feedback when turn is slow (> 15s)', () => {
    const slowMetrics: MasterTurnMetrics = {
      userId: 'user_123',
      sessionId: 'sess_456',
      model: 'openai/gpt-4o',
      totalDurationMs: 16500,
      ttftMs: 6200,
      toolDurations: {},
      isTimeout: false,
    }

    const decision = shouldPromptExperienceFeedback({
      metrics: slowMetrics,
      turnCount: 2,
    })

    expect(decision.shouldPrompt).toBe(true)
    expect(decision.reason).toBe('slow_response')
  })

  it('should trigger user experience feedback after milestone turns (every 5 turns)', () => {
    const normalMetrics: MasterTurnMetrics = {
      userId: 'user_123',
      sessionId: 'sess_456',
      model: 'openai/gpt-4o',
      totalDurationMs: 3200,
      ttftMs: 400,
      toolDurations: {},
      isTimeout: false,
    }

    const turn5Decision = shouldPromptExperienceFeedback({
      metrics: normalMetrics,
      turnCount: 5,
    })
    expect(turn5Decision.shouldPrompt).toBe(true)
    expect(turn5Decision.reason).toBe('milestone')

    const turn3Decision = shouldPromptExperienceFeedback({
      metrics: normalMetrics,
      turnCount: 3,
    })
    expect(turn3Decision.shouldPrompt).toBe(false)
  })

  it('should trigger user experience feedback on timeout errors with apology intent', () => {
    const timeoutMetrics: MasterTurnMetrics = {
      userId: 'user_123',
      sessionId: 'sess_456',
      model: 'openai/gpt-4o',
      totalDurationMs: 30000,
      ttftMs: null,
      toolDurations: {},
      isTimeout: true,
    }

    const decision = shouldPromptExperienceFeedback({
      metrics: timeoutMetrics,
      turnCount: 1,
    })

    expect(decision.shouldPrompt).toBe(true)
    expect(decision.reason).toBe('timeout')
  })
})
