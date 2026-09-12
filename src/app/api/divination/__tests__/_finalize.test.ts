/**
 * _finalize unit tests — the post-LLM billing/save pipeline, with mocked
 * persistence and credit layers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  user: { update: vi.fn() },
  familyMember: { update: vi.fn() },
}))
const lifecycleMock = vi.hoisted(() => ({
  markCompleted: vi.fn(),
  markFailed: vi.fn(),
}))
const creditMock = vi.hoisted(() => ({ deductCredits: vi.fn() }))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/readings/lifecycle', () => lifecycleMock)
vi.mock('@/lib/creditService', () => creditMock)

import { finalizeDivination } from '../_finalize'
import { z } from 'zod'

const log = {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn(() => log), requestId: 'test-req',
} as never

const testHandler = { schema: z.object({}).passthrough() } as never

function makeArgs(overrides: Partial<Parameters<typeof finalizeDivination>[0]> = {}) {
  return {
    rawText: '{"sections":{"overview":"很不錯的運勢","career":"事業穩步上升"},"interpretation":"整體分析..."}',
    type: 'meihua',
    language: 'zh-TW',
    modelName: 'test-model',
    handler: testHandler,
    chart: null,
    ctx: {} as never,
    userId: 'u1',
    pendingReadingId: 'r1',
    shouldSaveHistory: true,
    shouldSaveProfile: false,
    resolvedFamilyMemberId: null,
    targetType: 'self',
    inputData: {},
    systemPrompt: 'SYS',
    userMessage: 'USER',
    llmStart: Date.now(),
    holdAmount: 3,
    log,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('finalizeDivination — hard reject gates', () => {
  it('unparseable LLM output → markFailed + refund path + 502', async () => {
    const outcome = await finalizeDivination(makeArgs({ rawText: 'not json at all {{{' }))
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.status).toBe(502)
    expect(lifecycleMock.markFailed).toHaveBeenCalledWith('r1', expect.objectContaining({ reason: 'LLM JSON parse failed' }))
    expect(lifecycleMock.markCompleted).not.toHaveBeenCalled()
  })

  it('parseable but empty (nothing renderable) → markFailed + 502', async () => {
    // Strict handler: schema fails on the empty output, AND there is no
    // renderable content — both hard-reject #2 conditions hold.
    const strictHandler = { schema: z.object({ sections: z.object({ overview: z.string() }) }).passthrough() } as never
    const outcome = await finalizeDivination(makeArgs({ rawText: '{"type":"meihua"}', handler: strictHandler }))
    expect(outcome.ok).toBe(false)
    expect(lifecycleMock.markFailed).toHaveBeenCalledWith('r1', expect.objectContaining({ reason: 'Invalid LLM output format' }))
  })
})

describe('finalizeDivination — success paths', () => {
  it('valid output → markCompleted, no legacy deduct (hold > 0)', async () => {
    lifecycleMock.markCompleted.mockResolvedValue({ id: 'r1', status: 'completed' })
    const outcome = await finalizeDivination(makeArgs())
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.saved).toBe(true)
      expect(JSON.parse(outcome.resultToStore).sections.overview).toBe('很不錯的運勢')
    }
    expect(lifecycleMock.markCompleted).toHaveBeenCalled()
    expect(creditMock.deductCredits).not.toHaveBeenCalled() // hold flow already paid
  })

  it('holdAmount === 0 → legacy deduct-on-success fires', async () => {
    lifecycleMock.markCompleted.mockResolvedValue({ id: 'r1' })
    creditMock.deductCredits.mockResolvedValue(true)
    const outcome = await finalizeDivination(makeArgs({ holdAmount: 0 }))
    expect(outcome.ok).toBe(true)
    expect(creditMock.deductCredits).toHaveBeenCalledWith('u1', 'meihua')
  })

  it('saveHistory=false → no markCompleted, unsaved reading returned', async () => {
    const outcome = await finalizeDivination(makeArgs({ shouldSaveHistory: false, pendingReadingId: null, holdAmount: 0 }))
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.saved).toBe(false)
      expect(outcome.reading.id).toBeNull()
    }
    expect(lifecycleMock.markCompleted).not.toHaveBeenCalled()
  })

  it('profile update writes birth fields to the user for bazi', async () => {
    lifecycleMock.markCompleted.mockResolvedValue({ id: 'r1' })
    await finalizeDivination(makeArgs({
      type: 'bazi',
      shouldSaveProfile: true,
      inputData: { birthDate: '1990-05-15', gender: 'male', birthTime: 'wu' },
    }))
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({ birthDate: '1990-05-15', gender: 'male', birthTime: 'wu' }),
    })
  })

  it('family target routes the profile update to the family member', async () => {
    lifecycleMock.markCompleted.mockResolvedValue({ id: 'r1' })
    await finalizeDivination(makeArgs({
      type: 'ziwei',
      shouldSaveProfile: true,
      targetType: 'family',
      resolvedFamilyMemberId: 'fm1',
      inputData: { birthDate: '1965-01-01' },
    }))
    expect(prismaMock.familyMember.update).toHaveBeenCalledWith({
      where: { id: 'fm1' },
      data: expect.objectContaining({ birthDate: '1965-01-01' }),
    })
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})
