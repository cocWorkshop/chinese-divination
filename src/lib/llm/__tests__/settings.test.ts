import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock prisma BEFORE importing the module under test.
const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }))
vi.mock('../../prisma', () => ({
  prisma: { adminSetting: { findMany: findManyMock } },
}))

import { resolveLLMConfig, LLM_DEFAULTS } from '../settings'

const originalEnv = { ...process.env }

beforeEach(() => {
  findManyMock.mockReset()
  // Start each test from a clean env slice — tests set only what they need.
  delete process.env.MASTER_MODEL
  delete process.env.OPENROUTER_MODEL
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('resolveLLMConfig — model resolution per endpoint', () => {
  it('divination: AdminSetting.model1Name wins', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { model1Name: 'anthropic/claude-3-opus' },
    })
    expect(cfg.model).toBe('anthropic/claude-3-opus')
    expect(cfg.isLocalProxy).toBe(false)
  })

  it('divination: falls back to OPENROUTER_MODEL env then default', async () => {
    process.env.OPENROUTER_MODEL = 'anthropic/claude-3-sonnet'
    const cfg1 = await resolveLLMConfig({ endpoint: 'divination', settingsMap: {} })
    expect(cfg1.model).toBe('anthropic/claude-3-sonnet')

    delete process.env.OPENROUTER_MODEL
    const cfg2 = await resolveLLMConfig({ endpoint: 'divination', settingsMap: {} })
    expect(cfg2.model).toBe(LLM_DEFAULTS.MODEL)
  })

  it('chat: chatModelName preferred over model1Name', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'chat',
      settingsMap: {
        chatModelName: 'openai/gpt-4o-mini',
        model1Name: 'anthropic/claude-3-opus',
      },
    })
    expect(cfg.model).toBe('openai/gpt-4o-mini')
  })

  it('chat: falls back to model1Name when chatModelName unset', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'chat',
      settingsMap: { model1Name: 'anthropic/claude-3-opus' },
    })
    expect(cfg.model).toBe('anthropic/claude-3-opus')
  })

  it('master: MASTER_MODEL env beats settings + other envs', async () => {
    process.env.MASTER_MODEL = 'openai/gpt-4-turbo'
    process.env.OPENROUTER_MODEL = 'anthropic/claude-3-sonnet'
    const cfg = await resolveLLMConfig({
      endpoint: 'master',
      settingsMap: { model1Name: 'anthropic/claude-3-opus' },
    })
    expect(cfg.model).toBe('openai/gpt-4-turbo')
  })

  it('master: defaults to gpt-4o when nothing configured', async () => {
    const cfg = await resolveLLMConfig({ endpoint: 'master', settingsMap: {} })
    expect(cfg.model).toBe(LLM_DEFAULTS.MASTER_MODEL)
  })

  it('detects local/claude-proxy sentinel', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { model1Name: 'local/claude-proxy' },
    })
    expect(cfg.isLocalProxy).toBe(true)
  })
})

describe('resolveLLMConfig — timeout and maxTokens resolution', () => {
  it('uses llmMaxTokens setting when present', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'chat',
      settingsMap: { llmMaxTokens: '16000' },
    })
    expect(cfg.maxTokens).toBe(16000)
  })

  it('defaults maxTokens to 8192', async () => {
    const cfg = await resolveLLMConfig({ endpoint: 'chat', settingsMap: {} })
    expect(cfg.maxTokens).toBe(LLM_DEFAULTS.MAX_TOKENS)
  })

  it('parses llmTimeoutSeconds setting into milliseconds', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { llmTimeoutSeconds: '120' },
    })
    expect(cfg.timeoutMs).toBe(120 * 1000)
  })

  it('defaults timeout to 240s and ignores bogus values', async () => {
    const cfg1 = await resolveLLMConfig({ endpoint: 'divination', settingsMap: {} })
    expect(cfg1.timeoutMs).toBe(LLM_DEFAULTS.TIMEOUT_SECONDS * 1000)
    const cfg2 = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { llmTimeoutSeconds: 'abc' },
    })
    expect(cfg2.timeoutMs).toBe(LLM_DEFAULTS.TIMEOUT_SECONDS * 1000)
  })

  it('overrides take precedence over settings', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: {
        model1Name: 'a/b',
        llmMaxTokens: '1000',
        llmTimeoutSeconds: '60',
      },
      overrides: { model: 'x/y', maxTokens: 2048, timeoutMs: 5000 },
    })
    expect(cfg.model).toBe('x/y')
    expect(cfg.maxTokens).toBe(2048)
    expect(cfg.timeoutMs).toBe(5000)
  })
})

describe('resolveLLMConfig — DB fallback', () => {
  it('loads settings via prisma when settingsMap not provided', async () => {
    findManyMock.mockResolvedValueOnce([
      { key: 'model1Name', value: 'from/db' },
      { key: 'llmMaxTokens', value: '4096' },
    ])
    const cfg = await resolveLLMConfig({ endpoint: 'divination' })
    expect(findManyMock).toHaveBeenCalledOnce()
    expect(cfg.model).toBe('from/db')
    expect(cfg.maxTokens).toBe(4096)
  })

  it('does not query DB when settingsMap provided', async () => {
    await resolveLLMConfig({ endpoint: 'divination', settingsMap: {} })
    expect(findManyMock).not.toHaveBeenCalled()
  })
})
