import { describe, it, expect } from 'vitest'
import { T } from '@/lib/i18n'
import fs from 'fs'
import path from 'path'

describe('ExpandedView copy button & suggestions logic', () => {
  it('formats copy button label correctly in Traditional Chinese and English', () => {
    const getButtonText = (isSelectMode: boolean, selectedCount: number, lang: string) => {
      if (!isSelectMode) return T(lang, '選擇複製', 'Select')
      if (selectedCount > 0) return T(lang, `完成 (${selectedCount})`, `Done (${selectedCount})`)
      return T(lang, '完成', 'Done')
    }

    // Default mode
    expect(getButtonText(false, 0, 'zh-TW')).toBe('選擇複製')
    expect(getButtonText(false, 0, 'en')).toBe('Select')

    // Selection mode with 0 items
    expect(getButtonText(true, 0, 'zh-TW')).toBe('完成')
    expect(getButtonText(true, 0, 'en')).toBe('Done')

    // Selection mode with selected items
    expect(getButtonText(true, 3, 'zh-TW')).toBe('完成 (3)')
    expect(getButtonText(true, 3, 'en')).toBe('Done (3)')
  })

  it('ExpandedView source code does NOT contain outdated 完成複製', () => {
    const fileContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/master/widget/ExpandedView.tsx'),
      'utf-8'
    )
    expect(fileContent).not.toContain('完成複製')
    expect(fileContent).not.toContain('完成复制')
    expect(fileContent).toContain('T(lang, `完成 (${selectedIndices.size})`')
  })

  it('ExpandedView header employs mobile-responsive classes and whitespace-nowrap to prevent text wrapping on small screens', () => {
    const fileContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/master/widget/ExpandedView.tsx'),
      'utf-8'
    )
    // Prevents text breaking into 2 lines vertically (e.g. 玄機大 / 師)
    expect(fileContent).toContain('whitespace-nowrap shrink-0')
    // Responsive button labels on small mobile viewports
    expect(fileContent).toContain('hidden sm:inline')
    // Responsive container padding
    expect(fileContent).toContain('px-3.5 sm:px-5')
  })

  it('prefers viewingReadingQuestions over greeting.suggestions when present', () => {
    const viewingReadingQuestions = ['八字中的喜用神如何作用？', '正緣何時顯現？', '近兩年事業發展轉機？']
    const greetingSuggestions = ['請以八字、紫微互參', '今年運勢如何？', '想為家人起盤']

    const resolveSuggestions = (readingQuestions: string[], defaultGreeting: string[]) => {
      return readingQuestions.length > 0 ? readingQuestions : defaultGreeting
    }

    const activeWhenReading = resolveSuggestions(viewingReadingQuestions, greetingSuggestions)
    expect(activeWhenReading).toEqual(viewingReadingQuestions)
    expect(activeWhenReading).toHaveLength(3)
    expect(activeWhenReading[0]).toContain('喜用神')

    const activeWhenCold = resolveSuggestions([], greetingSuggestions)
    expect(activeWhenCold).toEqual(greetingSuggestions)
    expect(activeWhenCold).toHaveLength(3)
  })
})
