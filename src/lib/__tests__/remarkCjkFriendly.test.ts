import { describe, it, expect } from 'vitest'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkCjkFriendly } from '../remarkCjkFriendly'

function renderMarkdown(content: string): string {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm, remarkCjkFriendly] }, content)
  )
}

describe('remarkCjkFriendly plugin', () => {
  it('correctly renders bold with trailing CJK punctuation followed by CJK character (User reported case)', () => {
    const rawInput =
      '卦已齊，直接斷：**能拿到 offer，過程先卡後通，不算一路順，但不是壞局。**此卦以官鬼寅木為職位，用神得亥月、亥日雙水相生而旺，代表市場上有合適職位，也有公司願意看你；不是白投。'

    const html = renderMarkdown(rawInput)

    // Must NOT contain literal ** marks
    expect(html).not.toContain('**')

    // Must wrap in strong tag including the inner text and punctuation
    expect(html).toContain(
      '<strong>能拿到 offer，過程先卡後通，不算一路順，但不是壞局。</strong>此卦以官鬼寅木為職位'
    )
  })

  it('correctly renders bold text surrounded by CJK bracket/quote punctuation', () => {
    const input1 = '前文**《易經》**後文'
    expect(renderMarkdown(input1)).toBe('<p>前文<strong>《易經》</strong>後文</p>')

    const input2 = '前文**【核心精要】**後文'
    expect(renderMarkdown(input2)).toBe('<p>前文<strong>【核心精要】</strong>後文</p>')

    const input3 = '前文**「重點提醒」**後文'
    expect(renderMarkdown(input3)).toBe('<p>前文<strong>「重點提醒」</strong>後文</p>')
  })

  it('correctly renders bold text with exclamations and question marks before closing asterisk', () => {
    const input1 = '請務必注意：**此處為大凶！**不可妄動'
    expect(renderMarkdown(input1)).toContain('<strong>此處為大凶！</strong>不可妄動')

    const input2 = '試問：**何時能有轉機？**此局顯示秋季'
    expect(renderMarkdown(input2)).toContain('<strong>何時能有轉機？</strong>此局顯示秋季')
  })

  it('correctly renders multiple bold items in a single sentence', () => {
    const input = '原局中**甲木身旺**，但**官星失令**，且**財星虛透**。'
    const html = renderMarkdown(input)

    expect(html).toContain('<strong>甲木身旺</strong>')
    expect(html).toContain('<strong>官星失令</strong>')
    expect(html).toContain('<strong>財星虛透</strong>')
    expect(html).not.toContain('**')
  })

  it('correctly renders nested italics and strikethrough', () => {
    const input = '前文**這是*斜體重點*在粗體內。**後文與~~已過期論斷。~~接續'
    const html = renderMarkdown(input)

    expect(html).toContain('<strong>這是<em>斜體重點</em>在粗體內。</strong>')
    expect(html).toContain('<del>已過期論斷。</del>')
  })

  it('does not touch markdown code blocks and inline code', () => {
    const input = '請參考代碼 `**not bold**` 與以下配置：'
    const html = renderMarkdown(input)

    expect(html).toContain('<code>**not bold**</code>')
  })

  it('does not misidentify arithmetic multiplication or unclosed asterisks as emphasis', () => {
    const input1 = '計算公式為 3 * 5 * 7 = 105，請查核。'
    expect(renderMarkdown(input1)).toContain('3 * 5 * 7 = 105')

    const input2 = '未閉合的 **粗體符號測試'
    expect(renderMarkdown(input2)).toContain('未閉合的 **粗體符號測試')
  })
})
