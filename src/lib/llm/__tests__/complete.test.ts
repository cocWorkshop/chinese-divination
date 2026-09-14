import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()
const claudeProxyMock = vi.fn()
const logLlmCallMock = vi.fn()

vi.mock('../providers/openrouter', () => ({
  createOpenRouterClient: vi.fn(() => ({
    chat: {
      completions: {
        create: createMock,
      },
    },
  })),
}))

vi.mock('../providers/claudeProxy', () => ({
  callClaudeProxy: (...args: any[]) => claudeProxyMock(...args),
}))

vi.mock('../../llmLogger', () => ({
  logLlmCall: (...args: any[]) => logLlmCallMock(...args),
}))

import { completeLLM } from '../complete'

describe('completeLLM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('completes successfully via OpenRouter and parses message, usage, reasoning', async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello divination seeker',
            reasoning: 'Detailed reasoning steps here',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 25,
        completion_tokens: 15,
        total_tokens: 40,
      },
    })

    const result = await completeLLM({
      endpoint: 'chat',
      model: 'openai/gpt-4o-mini',
      systemPrompt: 'You are an oracle',
      messages: [{ role: 'user', content: 'What is my fate?' }],
    })

    expect(result.content).toBe('Hello divination seeker')
    expect(result.reasoning).toBe('Detailed reasoning steps here')
    expect(result.finishReason).toBe('stop')
    expect(result.usage).toEqual({
      promptTokens: 25,
      completionTokens: 15,
      totalTokens: 40,
    })

    expect(logLlmCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'chat',
        status: 'success',
        promptTokens: 25,
        completionTokens: 15,
      })
    )
  })

  it('dispatches to callClaudeProxy when model is local/claude-proxy', async () => {
    claudeProxyMock.mockResolvedValueOnce({
      content: 'Proxy response',
      usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
    })

    const result = await completeLLM({
      endpoint: 'chat',
      model: 'local/claude-proxy',
      systemPrompt: 'Local prompt',
      messages: [{ role: 'user', content: 'Test local proxy' }],
    })

    expect(claudeProxyMock).toHaveBeenCalledTimes(1)
    expect(createMock).not.toHaveBeenCalled()
    expect(result.content).toBe('Proxy response')
    expect(result.usage?.totalTokens).toBe(18)
    expect(logLlmCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        endpoint: 'chat',
      })
    )
  })

  it('retries without response_format when provider returns 400 parameter rejection', async () => {
    const error400 = new Error('Invalid parameter: response_format')
    ;(error400 as any).status = 400

    createMock
      .mockRejectedValueOnce(error400)
      .mockResolvedValueOnce({
        choices: [
          {
            message: { role: 'assistant', content: '{"result": "success"}' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
      })

    const result = await completeLLM({
      endpoint: 'divination',
      model: 'google/gemini-2.0-flash',
      systemPrompt: 'Output JSON',
      messages: [{ role: 'user', content: 'Calculate meihua' }],
      responseFormat: { type: 'json_object' },
    })

    expect(createMock).toHaveBeenCalledTimes(2)
    // First call had response_format
    expect(createMock.mock.calls[0][0].response_format).toEqual({ type: 'json_object' })
    // Second call stripped response_format
    expect(createMock.mock.calls[1][0].response_format).toBeUndefined()
    expect(result.content).toBe('{"result": "success"}')
  })

  it('does not retry and throws immediately for 401/500 errors', async () => {
    const error500 = new Error('Internal server error')
    ;(error500 as any).status = 500
    createMock.mockRejectedValueOnce(error500)

    await expect(
      completeLLM({
        endpoint: 'chat',
        model: 'openai/gpt-4o-mini',
        systemPrompt: 'Sys',
        messages: [{ role: 'user', content: 'Hello' }],
        responseFormat: { type: 'json_object' },
      })
    ).rejects.toThrow('Internal server error')

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(logLlmCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        errorMessage: 'Internal server error',
      })
    )
  })

  it('handles external AbortSignal', async () => {
    const controller = new AbortController()
    controller.abort()

    createMock.mockRejectedValueOnce(new Error('Request was aborted'))

    await expect(
      completeLLM({
        endpoint: 'chat',
        model: 'openai/gpt-4o-mini',
        systemPrompt: 'Sys',
        messages: [{ role: 'user', content: 'Hello' }],
        signal: controller.signal,
      })
    ).rejects.toThrow()
  })
})
