import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('MessageBubble & Xuanji Master Markdown CJK Rendering Guard', () => {
  it('MessageBubble imports and uses remarkCjkFriendly in remarkPlugins', () => {
    const bubblePath = path.resolve(__dirname, '../widget/MessageBubble.tsx')
    const content = fs.readFileSync(bubblePath, 'utf-8')

    // Must import remarkCjkFriendly
    expect(content).toContain("import remarkCjkFriendly from '@/lib/remarkCjkFriendly'")

    // Must pass both remarkGfm and remarkCjkFriendly to ReactMarkdown
    expect(content).toContain('<ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkFriendly]}>{msg.content}</ReactMarkdown>')

    // Must have prose-master class for styling
    expect(content).toContain('prose-master')
  })

  it('globals.css and ExpandedView define prose-master strong styles with gold color and font weight', () => {
    const cssPath = path.resolve(__dirname, '../../../app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf-8')
    expect(cssContent).toContain('.prose-master strong { font-weight: 600; color: var(--gold); }')

    const expandedViewPath = path.resolve(__dirname, '../widget/ExpandedView.tsx')
    const expandedContent = fs.readFileSync(expandedViewPath, 'utf-8')
    expect(expandedContent).toContain('.prose-master strong { font-weight: 600; color: var(--gold); }')
  })

  it('XuanjiChat and XuanjiChatCard apply remarkCjkFriendly to prevent CJK emphasis loss', () => {
    const chatPath = path.resolve(__dirname, '../../results/XuanjiChat.tsx')
    const chatContent = fs.readFileSync(chatPath, 'utf-8')
    expect(chatContent).toContain("import remarkCjkFriendly from '@/lib/remarkCjkFriendly'")
    expect(chatContent).toContain('remarkPlugins={[remarkGfm, remarkCjkFriendly]}')

    const chatCardPath = path.resolve(__dirname, '../../results/XuanjiChatCard.tsx')
    const cardContent = fs.readFileSync(chatCardPath, 'utf-8')
    expect(cardContent).toContain("import remarkCjkFriendly from '@/lib/remarkCjkFriendly'")
    expect(cardContent).toContain('remarkPlugins={[remarkGfm, remarkCjkFriendly]}')
  })
})
