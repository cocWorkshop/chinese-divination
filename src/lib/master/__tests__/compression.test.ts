import { describe, it, expect, vi } from 'vitest'
import {
  estimatePromptTokens,
  rowToMessage,
  rowsToMessages,
  compressHistory,
  COMPRESSION_TOKEN_BUDGET,
  KEEP_RECENT_TURNS,
} from '../compression'
import type { MasterChatMessageRow } from '../chatMessageStore'
import type { Message } from '@/lib/llm'

// Mock the LLM completeLLM module so the narrative summary test doesn't
// actually hit the network. The test asserts behavior, not LLM output.
vi.mock('@/lib/llm', () => ({
  completeLLM: vi.fn(async () => ({
    content: '[mocked summary] user discussed bazi and asked about career, master concluded they should focus on stability',
    model: 'mock-model',
    usage: undefined,
  })),
}))

function makeRow(
  partial: Partial<MasterChatMessageRow> & { role: MasterChatMessageRow['role'] },
): MasterChatMessageRow {
  return {
    id: 'mcm_test',
    userId: 'user1',
    sessionId: 'sess1',
    turnIndex: 0,
    content: null,
    toolCallsJson: null,
    toolCallId: null,
    tokenCount: null,
    archivedAt: null,
    createdAt: new Date(),
    ...partial,
  }
}

describe('estimatePromptTokens', () => {
  it('returns chars/4 of system prompt + every message content', () => {
    const sys = 'a'.repeat(400) // 100 tokens
    const messages: Message[] = [
      { role: 'user', content: 'b'.repeat(80) }, // 20 tokens
      { role: 'assistant', content: 'c'.repeat(120) }, // 30 tokens
    ]
    expect(estimatePromptTokens(sys, messages)).toBe(150)
  })

  it('counts tool_calls payload too', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'get_reading', arguments: '{"readingId":"x"}' },
          },
        ],
      },
    ]
    // 'get_reading' (11) + '{"readingId":"x"}' (17) = 28 chars / 4 = 7
    expect(estimatePromptTokens('', messages)).toBe(7)
  })

  it('handles empty inputs', () => {
    expect(estimatePromptTokens('', [])).toBe(0)
  })
})

describe('rowToMessage', () => {
  it('converts user row to user message', () => {
    const row = makeRow({ role: 'user', content: 'hello' })
    expect(rowToMessage(row)).toEqual({ role: 'user', content: 'hello' })
  })

  it('converts assistant row to assistant message and DROPS tool calls', () => {
    const row = makeRow({
      role: 'assistant',
      content: 'final answer',
      toolCallsJson: '[{"name":"get_reading","args":{},"result":{}}]',
    })
    const msg = rowToMessage(row)
    expect(msg).toEqual({ role: 'assistant', content: 'final answer' })
    expect(msg).not.toHaveProperty('tool_calls')
  })

  it('converts system row to system message', () => {
    const row = makeRow({ role: 'system', content: 'sys note' })
    expect(rowToMessage(row)).toEqual({ role: 'system', content: 'sys note' })
  })

  it('returns null for tool role rows (not expected in Phase 2 storage)', () => {
    const row = makeRow({ role: 'tool', content: 'tool result' })
    expect(rowToMessage(row)).toBeNull()
  })

  it('handles null content gracefully', () => {
    const row = makeRow({ role: 'user', content: null })
    expect(rowToMessage(row)).toEqual({ role: 'user', content: '' })
  })
})

describe('rowsToMessages', () => {
  it('converts and skips null entries', () => {
    const rows: MasterChatMessageRow[] = [
      makeRow({ role: 'user', content: 'hi', turnIndex: 0 }),
      makeRow({ role: 'tool', content: 'should be dropped', turnIndex: 1 }),
      makeRow({ role: 'assistant', content: 'reply', turnIndex: 2 }),
    ]
    const result = rowsToMessages(rows)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ role: 'user', content: 'hi' })
    expect(result[1]).toEqual({ role: 'assistant', content: 'reply' })
  })
})

describe('compressHistory — under budget (no compression)', () => {
  it('passes messages through when estimate is well below budget', async () => {
    const rows: MasterChatMessageRow[] = [
      makeRow({ role: 'user', content: 'hi', turnIndex: 0 }),
      makeRow({ role: 'assistant', content: 'hello', turnIndex: 1 }),
    ]
    const result = await compressHistory(rows, {
      userId: 'user1',
      systemPrompt: 'short prompt',
      model: 'test-model',
    })
    expect(result.summarized).toBe(false)
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0]).toEqual({ role: 'user', content: 'hi' })
  })
})

describe('compressHistory — over budget triggers Stage 2 narrative summary', () => {
  it('summarizes prose older than the most recent KEEP_RECENT_TURNS', async () => {
    // Build a long history that exceeds the budget
    const longContent = 'x'.repeat(100_000) // 25K tokens per message
    const rows: MasterChatMessageRow[] = []
    for (let i = 0; i < 15; i++) {
      rows.push(
        makeRow({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: longContent,
          turnIndex: i,
        }),
      )
    }
    const result = await compressHistory(rows, {
      userId: 'user1',
      systemPrompt: 'short prompt',
      model: 'test-model',
    })
    expect(result.summarized).toBe(true)
    // Summary message + KEEP_RECENT_TURNS (10) = 11 messages
    expect(result.messages).toHaveLength(KEEP_RECENT_TURNS + 1)
    // First message is the summary system message
    expect(result.messages[0].role).toBe('system')
    expect(result.messages[0].content).toContain('[对话摘要]')
    expect(result.messages[0].content).toContain('mocked summary')
    // The remaining 10 are the most recent original messages
    for (let i = 1; i <= 10; i++) {
      expect(result.messages[i].content).toBe(longContent)
    }
  })

  it('does not summarize when there is nothing older than the kept tail', async () => {
    // Few messages, but each is large
    const longContent = 'x'.repeat(400_000) // 100K tokens per message
    const rows: MasterChatMessageRow[] = [
      makeRow({ role: 'user', content: longContent, turnIndex: 0 }),
      makeRow({ role: 'assistant', content: longContent, turnIndex: 1 }),
    ]
    const result = await compressHistory(rows, {
      userId: 'user1',
      systemPrompt: 'short prompt',
      model: 'test-model',
    })
    // Over budget but only 2 messages — there's nothing older than the kept
    // tail (KEEP_RECENT_TURNS=10), so we can't summarize. Pass through.
    expect(result.summarized).toBe(false)
    expect(result.messages).toHaveLength(2)
  })
})

describe('compressHistory — tunable budgets', () => {
  it('respects custom token budget', async () => {
    const longContent = 'x'.repeat(40_000) // 10K tokens
    const rows: MasterChatMessageRow[] = []
    for (let i = 0; i < 12; i++) {
      rows.push(
        makeRow({ role: i % 2 === 0 ? 'user' : 'assistant', content: longContent, turnIndex: i }),
      )
    }
    // Force compression with a small budget
    const result = await compressHistory(rows, {
      userId: 'user1',
      systemPrompt: 'short',
      model: 'test-model',
      tokenBudget: 50_000,
      keepRecent: 4,
    })
    expect(result.summarized).toBe(true)
    expect(result.messages).toHaveLength(5) // 1 summary + 4 kept
  })
})

describe('budget constants are sane', () => {
  it('COMPRESSION_TOKEN_BUDGET leaves room for response in gpt-5.4 200K context', () => {
    expect(COMPRESSION_TOKEN_BUDGET).toBeLessThan(150_000)
    expect(COMPRESSION_TOKEN_BUDGET).toBeGreaterThan(20_000)
  })
  it('KEEP_RECENT_TURNS keeps a meaningful working window', () => {
    expect(KEEP_RECENT_TURNS).toBeGreaterThanOrEqual(6)
    expect(KEEP_RECENT_TURNS).toBeLessThanOrEqual(20)
  })
})
