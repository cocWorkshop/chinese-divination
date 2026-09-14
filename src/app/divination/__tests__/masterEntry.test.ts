import { describe, it, expect, vi } from 'vitest'
import {
  getMasterEntryConfig,
  getMasterQuickPrompts,
  handleMasterEntryAction,
} from '../masterEntryConfig'

describe('Master Xuanji Entry Configuration and Logic (Issue #147)', () => {
  it('should return correct localized strings for Traditional Chinese', () => {
    const config = getMasterEntryConfig('zh-TW')
    expect(config.title).toContain('玄機大師')
    expect(config.role).toContain('命理總顧問')
    expect(config.description).toBeDefined()
    expect(config.ctaButton).toBeDefined()
  })

  it('should return correct localized strings for English', () => {
    const config = getMasterEntryConfig('en')
    expect(config.title).toContain('Master Xuanji')
    expect(config.role).toContain('Destiny Consultant')
    expect(config.description).toBeDefined()
    expect(config.ctaButton).toBeDefined()
  })

  it('should provide localized quick prompt chips', () => {
    const zhPrompts = getMasterQuickPrompts('zh-TW')
    expect(zhPrompts.length).toBeGreaterThanOrEqual(3)
    expect(zhPrompts[0].prompt).toContain('不知')

    const enPrompts = getMasterQuickPrompts('en')
    expect(enPrompts.length).toBeGreaterThanOrEqual(3)
    expect(enPrompts[0].prompt).toContain('oracle')
  })

  it('should redirect to login if unauthenticated user clicks entry', () => {
    const mockRouterPush = vi.fn()
    const mockSetShape = vi.fn()
    const mockSendMessage = vi.fn()

    handleMasterEntryAction({
      masterEnabled: false,
      routerPush: mockRouterPush,
      setShape: mockSetShape,
      sendMessage: mockSendMessage,
    })

    expect(mockRouterPush).toHaveBeenCalledWith('/login?callbackUrl=%2Fdivination')
    expect(mockSetShape).not.toHaveBeenCalled()
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('should expand master widget when authenticated user clicks entry without prompt', () => {
    const mockRouterPush = vi.fn()
    const mockSetShape = vi.fn()
    const mockSendMessage = vi.fn()

    handleMasterEntryAction({
      masterEnabled: true,
      routerPush: mockRouterPush,
      setShape: mockSetShape,
      sendMessage: mockSendMessage,
    })

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockSetShape).toHaveBeenCalledWith('expanded')
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('should expand master widget and send message when authenticated user clicks quick prompt chip', () => {
    const mockRouterPush = vi.fn()
    const mockSetShape = vi.fn()
    const mockSendMessage = vi.fn()
    const testPrompt = '我想合參八字與紫微'

    handleMasterEntryAction({
      masterEnabled: true,
      prompt: testPrompt,
      routerPush: mockRouterPush,
      setShape: mockSetShape,
      sendMessage: mockSendMessage,
    })

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockSetShape).toHaveBeenCalledWith('expanded')
    expect(mockSendMessage).toHaveBeenCalledWith(testPrompt)
  })
})
