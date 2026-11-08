import { describe, it, expect, vi } from 'vitest'
import {
  getMasterEntryConfig,
  getMasterQuickPrompts,
  handleMasterEntryAction,
} from '../masterEntryConfig'

describe('Master Xuanji Entry Configuration and Logic (Issue #147 & Refactor C-3)', () => {
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

  it('should provide 6 localized quick prompt chips with themes', () => {
    const zhPrompts = getMasterQuickPrompts('zh-TW')
    expect(zhPrompts.length).toBe(6)
    expect(zhPrompts[0].prompt).toContain('不知')
    expect(zhPrompts.every((p) => p.theme)).toBe(true)

    const enPrompts = getMasterQuickPrompts('en')
    expect(enPrompts.length).toBe(6)
    expect(enPrompts[0].prompt).toContain('oracle')
    expect(enPrompts.every((p) => p.theme)).toBe(true)
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

  it('should use Traditional Chinese 玄機 for stamp in MasterEntryCard', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const fileContent = fs.readFileSync(path.resolve(__dirname, '../MasterEntryCard.tsx'), 'utf-8')
    expect(fileContent).toContain("T(lang, '玄機', 'XuanJi')")
    expect(fileContent).not.toContain('玄機驗證')
    expect(fileContent).not.toContain('玄机验证')
  })

  it('should eliminate pretentious, hollow slogans and self-made jargon from MasterEntryCard and divination page', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const cardContent = fs.readFileSync(path.resolve(__dirname, '../MasterEntryCard.tsx'), 'utf-8')
    const pageContent = fs.readFileSync(path.resolve(__dirname, '../page.tsx'), 'utf-8')

    // Banned pretentious phrases in MasterEntryCard
    expect(cardContent).not.toContain('天地無全功')
    expect(cardContent).not.toContain('天機玄覽')
    expect(cardContent).not.toContain('歲時氣象')
    expect(cardContent).not.toContain('意圖直達')
    expect(cardContent).not.toContain('登堂請益')
    expect(cardContent).not.toContain('快捷請益')
    expect(cardContent).not.toContain('快捷请益')

    // Banned empty slogans in page header
    expect(pageContent).not.toContain('正統術數 · 叩問天機')
    expect(pageContent).not.toContain('六派源流 · 靜心求索')
    expect(pageContent).not.toContain('六派源流 · 洞察命理契機')

    // Prompt pills must be located on top of the input form and split into 3+3 balanced rows
    const row1Idx = cardContent.indexOf('row1.map')
    const row2Idx = cardContent.indexOf('row2.map')
    const formIdx = cardContent.indexOf('<form')
    expect(row1Idx).toBeGreaterThan(0)
    expect(row2Idx).toBeGreaterThan(row1Idx)
    expect(formIdx).toBeGreaterThan(row2Idx)

    // Center alignment must be enforced to avoid awkward left-ragged edges
    expect(cardContent).toContain('justify-center')

    // Domain-based subtle themes must be mapped
    expect(cardContent).toContain('PROMPT_THEMES')

    // Must feature the clean command bar input
    expect(cardContent).toContain('<input')
    expect(cardContent).toContain('向大師提問')
    expect(pageContent).toContain('自選術數起盤')
  })
})
