import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock prisma BEFORE importing the module under test.
const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }))
vi.mock('../../prisma', () => ({
  prisma: { adminSetting: { findMany: findManyMock } },
}))

import { resolveLLMConfig, LLM_DEFAULTS, clearLLMSettingsCache } from '../settings'

const originalEnv = { ...process.env }

beforeEach(() => {
  findManyMock.mockReset()
  clearLLMSettingsCache()
  // Start each test from a clean env slice — tests set only what they need.
  delete process.env.MASTER_MODEL
  delete process.env.OPENROUTER_MODEL
  delete process.env.PORTRAIT_MODEL
  delete process.env.LLM_REASONING_EFFORT
  delete process.env.DIVINATION_REASONING_EFFORT
  delete process.env.CHAT_REASONING_EFFORT
  delete process.env.MASTER_REASONING_EFFORT
  delete process.env.MASTER_BACKGROUND_REASONING_EFFORT
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

  it('master: AdminSetting.masterModelName wins over env and model1Name', async () => {
    process.env.MASTER_MODEL = 'openai/gpt-4-turbo'
    const cfg = await resolveLLMConfig({
      endpoint: 'master',
      settingsMap: {
        masterModelName: 'anthropic/claude-3-opus',
        model1Name: 'anthropic/claude-3-5-haiku',
      },
    })
    expect(cfg.model).toBe('anthropic/claude-3-opus')
  })

  it('masterBackground: masterBackgroundModelName wins', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'masterBackground',
      settingsMap: { masterBackgroundModelName: 'openai/gpt-4o-mini' },
    })
    expect(cfg.model).toBe('openai/gpt-4o-mini')
  })

  it('masterBackground: falls back to legacy PORTRAIT_MODEL env then portraitModelName', async () => {
    process.env.PORTRAIT_MODEL = 'env/portrait-model'
    const cfg1 = await resolveLLMConfig({ endpoint: 'masterBackground', settingsMap: {} })
    expect(cfg1.model).toBe('env/portrait-model')

    delete process.env.PORTRAIT_MODEL
    const cfg2 = await resolveLLMConfig({
      endpoint: 'masterBackground',
      settingsMap: { portraitModelName: 'legacy/portrait-key' },
    })
    expect(cfg2.model).toBe('legacy/portrait-key')
  })

  it('masterBackground: defaults to gpt-4o-mini and is independent of master model', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'masterBackground',
      settingsMap: { masterModelName: 'anthropic/claude-3-opus' },
    })
    expect(cfg.model).toBe(LLM_DEFAULTS.MASTER_BACKGROUND_MODEL)
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

  it('masterBackground defaults maxTokens to 1500 (short background task)', async () => {
    const cfg = await resolveLLMConfig({ endpoint: 'masterBackground', settingsMap: {} })
    expect(cfg.maxTokens).toBe(1500)
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

  it('per-function maxTokens overrides global llmMaxTokens', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'master',
      settingsMap: { masterMaxTokens: '2000', llmMaxTokens: '8192' },
    })
    expect(cfg.maxTokens).toBe(2000)
  })

  it('blank per-function maxTokens falls back to global llmMaxTokens', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'master',
      settingsMap: { masterMaxTokens: '', llmMaxTokens: '5000' },
    })
    expect(cfg.maxTokens).toBe(5000)
  })

  it('per-function timeout overrides global llmTimeoutSeconds', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'chat',
      settingsMap: { chatTimeoutSeconds: '90', llmTimeoutSeconds: '240' },
    })
    expect(cfg.timeoutMs).toBe(90 * 1000)
  })
})

describe('resolveLLMConfig — reasoningEffort resolution', () => {
  it("divination defaults to 'medium' when nothing is set", async () => {
    const cfg = await resolveLLMConfig({ endpoint: 'divination', settingsMap: {} })
    expect(cfg.reasoningEffort).toBe('medium')
  })

  it("chat defaults to 'low' when nothing is set", async () => {
    const cfg = await resolveLLMConfig({ endpoint: 'chat', settingsMap: {} })
    expect(cfg.reasoningEffort).toBe('low')
  })

  it("master defaults to 'low' when nothing is set", async () => {
    const cfg = await resolveLLMConfig({ endpoint: 'master', settingsMap: {} })
    expect(cfg.reasoningEffort).toBe('low')
  })

  it('divinationReasoningEffort setting beats global llmReasoningEffort', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { divinationReasoningEffort: 'high', llmReasoningEffort: 'low' },
    })
    expect(cfg.reasoningEffort).toBe('high')
  })

  it('chatReasoningEffort setting beats global llmReasoningEffort for chat', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'chat',
      settingsMap: { chatReasoningEffort: 'off', llmReasoningEffort: 'high' },
    })
    expect(cfg.reasoningEffort).toBe('off')
  })

  it("masterBackground defaults to 'off'", async () => {
    const cfg = await resolveLLMConfig({ endpoint: 'masterBackground', settingsMap: {} })
    expect(cfg.reasoningEffort).toBe('off')
  })

  it('masterReasoningEffort drives master (no longer inherits chat)', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'master',
      settingsMap: { masterReasoningEffort: 'high', chatReasoningEffort: 'medium' },
    })
    expect(cfg.reasoningEffort).toBe('high')
  })

  it('chatReasoningEffort does NOT leak to master endpoint', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'master',
      settingsMap: { chatReasoningEffort: 'medium' },
    })
    expect(cfg.reasoningEffort).toBe('low') // master default, not chat's value
  })

  it('masterBackgroundReasoningEffort drives masterBackground', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'masterBackground',
      settingsMap: { masterBackgroundReasoningEffort: 'high' },
    })
    expect(cfg.reasoningEffort).toBe('high')
  })

  it('global llmReasoningEffort applies to master/masterBackground when their key unset', async () => {
    const cfgM = await resolveLLMConfig({ endpoint: 'master', settingsMap: { llmReasoningEffort: 'high' } })
    expect(cfgM.reasoningEffort).toBe('high')
    const cfgB = await resolveLLMConfig({ endpoint: 'masterBackground', settingsMap: { llmReasoningEffort: 'high' } })
    expect(cfgB.reasoningEffort).toBe('high')
  })

  it('divinationReasoningEffort does NOT leak to chat endpoint', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'chat',
      settingsMap: { divinationReasoningEffort: 'high' },
    })
    expect(cfg.reasoningEffort).toBe('low') // chat default
  })

  it('DIVINATION_REASONING_EFFORT env used when no AdminSetting', async () => {
    process.env.DIVINATION_REASONING_EFFORT = 'high'
    const cfg = await resolveLLMConfig({ endpoint: 'divination', settingsMap: {} })
    expect(cfg.reasoningEffort).toBe('high')
  })

  it('CHAT_REASONING_EFFORT env used when no AdminSetting for chat', async () => {
    process.env.CHAT_REASONING_EFFORT = 'high'
    const cfg = await resolveLLMConfig({ endpoint: 'chat', settingsMap: {} })
    expect(cfg.reasoningEffort).toBe('high')
  })

  it('AdminSetting llmReasoningEffort beats env + default', async () => {
    process.env.LLM_REASONING_EFFORT = 'low'
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { llmReasoningEffort: 'high' },
    })
    expect(cfg.reasoningEffort).toBe('high')
  })

  it('LLM_REASONING_EFFORT env used when no AdminSetting', async () => {
    process.env.LLM_REASONING_EFFORT = 'low'
    const cfg = await resolveLLMConfig({ endpoint: 'divination', settingsMap: {} })
    expect(cfg.reasoningEffort).toBe('low')
  })

  it('bogus values fall back to default', async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { llmReasoningEffort: 'banana' },
    })
    expect(cfg.reasoningEffort).toBe('medium')
  })

  it("accepts 'off' to disable reasoning", async () => {
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { llmReasoningEffort: 'off' },
    })
    expect(cfg.reasoningEffort).toBe('off')
  })

  it('caller override takes precedence over everything', async () => {
    process.env.LLM_REASONING_EFFORT = 'low'
    const cfg = await resolveLLMConfig({
      endpoint: 'divination',
      settingsMap: { llmReasoningEffort: 'medium' },
      overrides: { reasoningEffort: 'high' },
    })
    expect(cfg.reasoningEffort).toBe('high')
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

describe('loadLLMSettings — TTL cache', () => {
  it('serves subsequent calls from cache within TTL', async () => {
    findManyMock.mockResolvedValue([
      { key: 'model1Name', value: 'cached/model' },
    ])
    const cfg1 = await resolveLLMConfig({ endpoint: 'divination' })
    const cfg2 = await resolveLLMConfig({ endpoint: 'divination' })
    const cfg3 = await resolveLLMConfig({ endpoint: 'chat' })
    expect(findManyMock).toHaveBeenCalledOnce() // exactly one DB hit
    expect(cfg1.model).toBe('cached/model')
    expect(cfg2.model).toBe('cached/model')
    expect(cfg3.model).toBe('cached/model')
  })

  it('clearLLMSettingsCache forces a fresh DB read', async () => {
    findManyMock.mockResolvedValueOnce([{ key: 'model1Name', value: 'first/model' }])
    await resolveLLMConfig({ endpoint: 'divination' })
    expect(findManyMock).toHaveBeenCalledOnce()

    clearLLMSettingsCache()
    findManyMock.mockResolvedValueOnce([{ key: 'model1Name', value: 'second/model' }])
    const cfg = await resolveLLMConfig({ endpoint: 'divination' })
    expect(findManyMock).toHaveBeenCalledTimes(2)
    expect(cfg.model).toBe('second/model')
  })
})
