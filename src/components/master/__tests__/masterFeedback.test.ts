import { describe, it, expect } from 'vitest'
import {
  getFeedbackPromptContent,
  buildFeedbackPayload,
} from '../widget/masterFeedbackConfig'

describe('Master Xuanji Experience Feedback (Issue #149)', () => {
  it('should provide appropriate localized text for timeout reason', () => {
    const zh = getFeedbackPromptContent('timeout', false)
    expect(zh.message).toContain('超時')
    expect(zh.options.length).toBe(3)

    const en = getFeedbackPromptContent('timeout', true)
    expect(en.message).toContain('timeout')
    expect(en.options.length).toBe(3)
  })

  it('should provide appropriate localized text for slow_response reason', () => {
    const zh = getFeedbackPromptContent('slow_response', false)
    expect(zh.message).toContain('耗時較長')

    const en = getFeedbackPromptContent('slow_response', true)
    expect(en.message).toContain('longer than usual')
  })

  it('should format payload correctly for site-feedback API', () => {
    const payload = buildFeedbackPayload({
      rating: 5,
      optionLabel: '很有啟發',
      reason: 'slow_response',
      durationMs: 16500,
    })

    expect(payload.rating).toBe(5)
    expect(payload.feedback).toContain('[MasterChat]')
    expect(payload.feedback).toContain('很有啟發')
    expect(payload.feedback).toContain('slow_response')
    expect(payload.feedback).toContain('16500ms')
  })
})
