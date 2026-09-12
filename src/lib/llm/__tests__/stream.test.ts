import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()
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

vi.mock('../../llmLogger', () => ({
  logLlmCall: (...args: any[]) => logLlmCallMock(...args),
}))

import { streamLLM } from '../stream'

async function* createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item
  }
}

describe('streamLLM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects local/claude-proxy model for streaming', async () => {
    const gen = streamLLM({
      endpoint: 'chat',
      model: 'local/claude-proxy',
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'test' }],
    })

    await expect(async () => {
      for await (const _ of gen) {
        // should throw before first yield
      }
    }).rejects.toThrow("streamLLM does not support the 'local/claude-proxy' model")
  })

  it('yields content chunks, accumulates reasoning, and emits done chunk', async () => {
    const chunks = [
      {
        choices: [
          {
            delta: { content: '乾', reasoning: 'Analyzing hexagram' },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: { content: '為天', reasoning: ' continued' },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: {},
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 5,
          total_tokens: 25,
        },
      },
    ]

    createMock.mockResolvedValueOnce(createAsyncIterable(chunks))

    const emitted: any[] = []
    for await (const chunk of streamLLM({
      endpoint: 'divination',
      model: 'openai/gpt-4o',
      systemPrompt: 'Diviner',
      messages: [{ role: 'user', content: 'Cast hexagram' }],
    })) {
      emitted.push(chunk)
    }

    expect(emitted).toEqual([
      { type: 'content', text: '乾' },
      { type: 'content', text: '為天' },
      {
        type: 'done',
        finishReason: 'stop',
        usage: {
          promptTokens: 20,
          completionTokens: 5,
          totalTokens: 25,
        },
      },
    ])

    expect(logLlmCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'divination',
        status: 'success',
        outputPreview: expect.stringContaining('乾為天'),
      })
    )
  })

  it('yields tool_call_delta chunks when model invokes tools', async () => {
    const chunks = [
      {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_123',
                  function: { name: 'calculateBazi', arguments: '{"year":' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: { arguments: ' 1990}' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: {},
            finish_reason: 'tool_calls',
          },
        ],
      },
    ]

    createMock.mockResolvedValueOnce(createAsyncIterable(chunks))

    const emitted: any[] = []
    for await (const chunk of streamLLM({
      endpoint: 'master',
      model: 'openai/gpt-4o',
      systemPrompt: 'Master',
      messages: [{ role: 'user', content: 'Read my chart' }],
      tools: [{ type: 'function', function: { name: 'calculateBazi' } }] as any,
    })) {
      emitted.push(chunk)
    }

    expect(emitted).toEqual([
      {
        type: 'tool_call_delta',
        index: 0,
        id: 'call_123',
        name: 'calculateBazi',
        argumentsDelta: '{"year":',
      },
      {
        type: 'tool_call_delta',
        index: 0,
        id: undefined,
        name: undefined,
        argumentsDelta: ' 1990}',
      },
      {
        type: 'done',
        finishReason: 'tool_calls',
        usage: undefined,
      },
    ])
  })

  it('retries without response_format when provider returns 422 param rejection before streaming', async () => {
    const error422 = new Error('Unprocessable: response_format')
    ;(error422 as any).status = 422

    const successChunks = [
      {
        choices: [
          {
            delta: { content: '{"ok": true}' },
            finish_reason: 'stop',
          },
        ],
      },
    ]

    createMock
      .mockRejectedValueOnce(error422)
      .mockResolvedValueOnce(createAsyncIterable(successChunks))

    const emitted: any[] = []
    for await (const chunk of streamLLM({
      endpoint: 'divination',
      model: 'anthropic/claude-3-haiku',
      systemPrompt: 'JSON stream',
      messages: [{ role: 'user', content: 'test' }],
      responseFormat: { type: 'json_object' },
    })) {
      emitted.push(chunk)
    }

    expect(createMock).toHaveBeenCalledTimes(2)
    expect(createMock.mock.calls[1][0].response_format).toBeUndefined()
    expect(emitted).toHaveLength(2)
    expect(emitted[0]).toEqual({ type: 'content', text: '{"ok": true}' })
  })

  it('logs error when stream fails mid-flight', async () => {
    async function* failingGenerator() {
      yield {
        choices: [{ delta: { content: 'Hello' }, finish_reason: null }],
      }
      throw new Error('Connection reset by peer')
    }

    createMock.mockResolvedValueOnce(failingGenerator())

    await expect(async () => {
      for await (const _ of streamLLM({
        endpoint: 'chat',
        model: 'openai/gpt-4o',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'test' }],
      })) {
        // consume
      }
    }).rejects.toThrow('Connection reset by peer')

    expect(logLlmCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'chat',
        status: 'error',
        errorMessage: 'Connection reset by peer',
      })
    )
  })
})
