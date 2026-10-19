import { describe, it, expect, vi, beforeEach } from 'vitest'

const streamLLMMock = vi.fn()
const appendMasterChatMessageMock = vi.fn()
const masterSessionUpdateMock = vi.fn()
const loadMasterChatMessagesMock = vi.fn()
const maybeExtractPortraitMock = vi.fn()
const toolExecuteMock = vi.fn()

vi.mock('@/lib/llm', () => ({
  streamLLM: (...args: any[]) => streamLLMMock(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    masterSession: {
      update: (...args: any[]) => masterSessionUpdateMock(...args),
    },
  },
}))

vi.mock('../../prisma', () => ({
  prisma: {
    masterSession: {
      update: (...args: any[]) => masterSessionUpdateMock(...args),
    },
  },
}))

vi.mock('../chatMessageStore', () => ({
  appendMasterChatMessage: (...args: any[]) => appendMasterChatMessageMock(...args),
  estimateTokens: (s: string) => Math.ceil((s || '').length / 4),
  loadMasterChatMessages: (...args: any[]) => loadMasterChatMessagesMock(...args),
}))

vi.mock('../portraitExtractor', () => ({
  maybeExtractPortrait: (...args: any[]) => maybeExtractPortraitMock(...args),
}))

vi.mock('../tools', () => ({
  masterToolRegistry: {
    toolDefs: () => [{ type: 'function', function: { name: 'prefill_divination_form' } }],
    execute: (...args: any[]) => toolExecuteMock(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { runMasterTurn, isPassReply } from '../turnEngine'

async function* makeStream(chunks: any[]) {
  for (const c of chunks) {
    yield c
  }
}

describe('runMasterTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    masterSessionUpdateMock.mockResolvedValue({})
    appendMasterChatMessageMock.mockResolvedValue({})
    loadMasterChatMessagesMock.mockResolvedValue([{ turnIndex: 1 }])
    maybeExtractPortraitMock.mockResolvedValue({})
  })

  it('runs a basic conversation turn and splits bubbles on [NEXT]', async () => {
    streamLLMMock.mockReturnValueOnce(
      makeStream([
        { type: 'content', text: '你好！' },
        { type: 'content', text: '[NEXT]請告訴我' },
        { type: 'content', text: '你的問題。' },
        { type: 'done', finishReason: 'stop' },
      ])
    )

    const events: any[] = []
    const gen = runMasterTurn({
      userId: 'user_1',
      sessionId: 'session_1',
      isCheckin: false,
      isReflection: false,
      systemPrompt: 'System',
      initialMessages: [{ role: 'user', content: '求問事業' }],
      model: 'openai/gpt-4o',
      toolCtx: {} as any,
      masterSessionPk: 'pk_123',
      lang: 'zh-TW',
    })

    for await (const ev of gen) {
      events.push(ev)
    }

    // Checks emitted events
    const contentEvents = events.filter((e) => e.type === 'content')
    const breakEvents = events.filter((e) => e.type === 'bubble_break')
    const metricsEvents = events.filter((e) => e.type === 'metrics')
    const doneEvents = events.filter((e) => e.type === 'done')

    expect(contentEvents.length).toBeGreaterThanOrEqual(2)
    expect(breakEvents.length).toBe(1)
    expect(metricsEvents.length).toBe(1)
    expect(doneEvents.length).toBe(1)

    // Checks persistence
    expect(appendMasterChatMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        sessionId: 'session_1',
        role: 'assistant',
        content: expect.stringContaining('你好！[NEXT]請告訴我你的問題。'),
      })
    )

    // Checks credit counter update
    expect(masterSessionUpdateMock).toHaveBeenCalledWith({
      where: { id: 'pk_123' },
      data: { totalCreditsUsed: { increment: 1 } },
    })

    // Checks portrait extraction triggered
    expect(maybeExtractPortraitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        sessionId: 'session_1',
        currentTurnIndex: 1,
      })
    )
  })

  it('injects synthetic trigger for isCheckin and isReflection', async () => {
    streamLLMMock.mockReturnValueOnce(
      makeStream([
        { type: 'content', text: '大師在線。' },
        { type: 'done', finishReason: 'stop' },
      ])
    )

    const gen = runMasterTurn({
      userId: 'user_1',
      sessionId: 'session_1',
      isCheckin: true,
      checkinHint: 'cta_pending_aged',
      isReflection: false,
      systemPrompt: 'System',
      initialMessages: [],
      model: 'openai/gpt-4o',
      toolCtx: {} as any,
      masterSessionPk: 'pk_123',
      lang: 'zh-TW',
    })

    for await (const _ of gen) {
      // consume
    }

    expect(streamLLMMock).toHaveBeenCalledTimes(1)
    const passedMessages = streamLLMMock.mock.calls[0][0].messages
    expect(passedMessages).toEqual([
      {
        role: 'user',
        content: '[activation_trigger:cta_pending_aged]',
      },
    ])
  })

  it('handles tool calls and yields tool events and cta_card', async () => {
    // Pass 1: model calls tool
    streamLLMMock.mockReturnValueOnce(
      makeStream([
        {
          type: 'tool_call_delta',
          index: 0,
          id: 'call_1',
          name: 'prefill_divination_form',
          argumentsDelta: '{"type":"meihua"}',
        },
        { type: 'done', finishReason: 'tool_calls' },
      ])
    )

    toolExecuteMock.mockResolvedValueOnce({
      ok: true,
      data: { type: 'meihua', targetUrl: '/divination?type=meihua' },
    })

    // Pass 2: model synthesizes answer after receiving tool result
    streamLLMMock.mockReturnValueOnce(
      makeStream([
        { type: 'content', text: '已為您準備好梅花易數排盤。' },
        { type: 'done', finishReason: 'stop' },
      ])
    )

    const events: any[] = []
    const gen = runMasterTurn({
      userId: 'user_1',
      sessionId: 'session_1',
      isCheckin: false,
      isReflection: false,
      systemPrompt: 'System',
      initialMessages: [{ role: 'user', content: '我想測梅花' }],
      model: 'openai/gpt-4o',
      toolCtx: {} as any,
      masterSessionPk: 'pk_123',
      lang: 'zh-TW',
    })

    for await (const ev of gen) {
      events.push(ev)
    }

    expect(events).toEqual(
      expect.arrayContaining([
        { type: 'tool_start', tool: 'prefill_divination_form' },
        {
          type: 'cta_card',
          payload: { type: 'meihua', targetUrl: '/divination?type=meihua' },
        },
        { type: 'tool_end', tool: 'prefill_divination_form' },
        { type: 'content', text: '已為您準備好梅花易數排盤。' },
      ])
    )

    expect(toolExecuteMock).toHaveBeenCalledWith(
      'prefill_divination_form',
      { type: 'meihua' },
      expect.anything()
    )
  })

  it('yields error event when streamLLM throws', async () => {
    streamLLMMock.mockImplementationOnce(() => {
      throw new Error('LLM connection failure')
    })

    const events: any[] = []
    const gen = runMasterTurn({
      userId: 'user_1',
      sessionId: 'session_1',
      isCheckin: false,
      isReflection: false,
      systemPrompt: 'System',
      initialMessages: [],
      model: 'openai/gpt-4o',
      toolCtx: {} as any,
      masterSessionPk: 'pk_123',
      lang: 'zh-TW',
    })

    for await (const ev of gen) {
      events.push(ev)
    }

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent.error).toBe('LLM connection failure')
    expect(appendMasterChatMessageMock).not.toHaveBeenCalled()
  })

  it('exempts isCheckin and isReflection from totalCreditsUsed increments (AUD-01)', async () => {
    streamLLMMock.mockReturnValue(
      makeStream([
        { type: 'content', text: '今日運勢提醒' },
        { type: 'done', finishReason: 'stop' },
      ])
    )

    // Checkin turn
    const genCheckin = runMasterTurn({
      userId: 'user_1',
      sessionId: 'session_1',
      isCheckin: true,
      isReflection: false,
      systemPrompt: 'System',
      initialMessages: [],
      model: 'openai/gpt-4o',
      toolCtx: {} as any,
      masterSessionPk: 'pk_123',
      lang: 'zh-TW',
    })
    for await (const _ of genCheckin) {}
    expect(masterSessionUpdateMock).not.toHaveBeenCalled()

    // Reflection turn
    const genReflection = runMasterTurn({
      userId: 'user_1',
      sessionId: 'session_1',
      isCheckin: false,
      isReflection: true,
      systemPrompt: 'System',
      initialMessages: [],
      model: 'openai/gpt-4o',
      toolCtx: {} as any,
      masterSessionPk: 'pk_123',
      lang: 'zh-TW',
    })
    for await (const _ of genReflection) {}
    expect(masterSessionUpdateMock).not.toHaveBeenCalled()
  })

  it('recognizes [PASS] replies in reflection turns', () => {
    expect(isPassReply('[PASS]')).toBe(true)
    expect(isPassReply('[pass]')).toBe(true)
    expect(isPassReply(' [PASS]。 ')).toBe(true)
    expect(isPassReply('[NEXT][PASS]')).toBe(true)
    expect(isPassReply('今日先到這裡')).toBe(false)
  })

  it('silently drops [PASS] reflection turns without emitting bubbles or persisting message', async () => {
    appendMasterChatMessageMock.mockClear()
    streamLLMMock.mockReturnValue(
      makeStream([
        { type: 'content', text: '[PASS]' },
        { type: 'done', finishReason: 'stop' },
      ])
    )

    const events: any[] = []
    const gen = runMasterTurn({
      userId: 'user_1',
      sessionId: 'session_1',
      isCheckin: false,
      isReflection: true,
      systemPrompt: 'System',
      initialMessages: [],
      model: 'openai/gpt-4o',
      toolCtx: {} as any,
      masterSessionPk: 'pk_123',
      lang: 'zh-TW',
    })

    for await (const ev of gen) {
      events.push(ev)
    }

    // Should only yield done event, NO content or bubble_break events
    const contentEvents = events.filter((e) => e.type === 'content' || e.type === 'bubble_break')
    expect(contentEvents.length).toBe(0)
    expect(events.some((e) => e.type === 'done')).toBe(true)
    expect(appendMasterChatMessageMock).not.toHaveBeenCalled()
  })
})

