export type FeedbackReason = 'slow_response' | 'milestone' | 'timeout'

export interface FeedbackOption {
  id: string
  label: string
  rating: number
  icon: string
}

export interface FeedbackPromptContent {
  message: string
  thankYouMessage: string
  options: FeedbackOption[]
}

export function getFeedbackPromptContent(
  reason: FeedbackReason = 'slow_response',
  isEn: boolean = false
): FeedbackPromptContent {
  if (isEn) {
    let message = 'This reading took longer than usual to synthesize. Was this response helpful?'
    if (reason === 'timeout') {
      message = 'Master Xuanji experienced a timeout or delay. We apologize. How was your experience?'
    } else if (reason === 'milestone') {
      message = 'You have had an in-depth consultation with Master Xuanji. How satisfied are you with the insights?'
    }

    return {
      message,
      thankYouMessage: 'Thank you! Master Xuanji noted your feedback.',
      options: [
        { id: 'helpful', label: 'Helpful', rating: 5, icon: '👍' },
        { id: 'slow', label: 'Too slow', rating: 3, icon: '⏳' },
        { id: 'not_helpful', label: 'Needs work', rating: 1, icon: '👎' },
      ],
    }
  }

  let message = '本次推演耗時較長，感謝您的耐心等候。這則解答是否對您有啟發？'
  if (reason === 'timeout') {
    message = '玄機大師推演遇到了超時延遲，向您致歉。請問您此刻體驗如何？'
  } else if (reason === 'milestone') {
    message = '您已與玄機大師深入交流多輪，請問目前的解答是否滿意？'
  }

  return {
    message,
    thankYouMessage: '感謝反饋，玄機大師已悉知，將持續精進！',
    options: [
      { id: 'helpful', label: '很有啟發', rating: 5, icon: '👍' },
      { id: 'slow', label: '推演偏慢', rating: 3, icon: '⏳' },
      { id: 'not_helpful', label: '未達預期', rating: 1, icon: '👎' },
    ],
  }
}

export interface BuildFeedbackPayloadOptions {
  rating: number
  optionLabel: string
  reason: FeedbackReason
  durationMs?: number
}

export function buildFeedbackPayload({
  rating,
  optionLabel,
  reason,
  durationMs,
}: BuildFeedbackPayloadOptions): { rating: number; feedback: string } {
  const durationText = durationMs ? ` (duration: ${durationMs}ms)` : ''
  const feedback = `[MasterChat] ${optionLabel} (reason: ${reason})${durationText}`
  return {
    rating,
    feedback,
  }
}
