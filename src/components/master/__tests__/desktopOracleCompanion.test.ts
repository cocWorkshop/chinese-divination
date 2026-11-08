import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { TEN } from '@/lib/i18n'

describe('Desktop Oracle Companion Mode & Controlled Master Interaction', () => {
  it('ExpandedView retains expanded dock on desktop (width >= 1024) and only collapses on mobile', () => {
    const expandedViewPath = path.resolve(__dirname, '../widget/ExpandedView.tsx')
    const content = fs.readFileSync(expandedViewPath, 'utf-8')

    // Detects window.innerWidth < 1024 before calling setShape('collapsed')
    expect(content).toContain("const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024")
    expect(content).toContain("if (!isDesktop) {\n      setShape('collapsed')\n    }")
  })

  it('ExpandedView extracts currentOracleType from /divination/[type] dynamic route', () => {
    const expandedViewPath = path.resolve(__dirname, '../widget/ExpandedView.tsx')
    const content = fs.readFileSync(expandedViewPath, 'utf-8')

    // Regex extraction from pathname
    expect(content).toContain("pathname?.match(/^\\/divination\\/([a-z0-9_-]+)$/)")
    expect(content).toContain("currentOracleType = oracleMatch && oracleMatch[1] !== 'undefined' ? oracleMatch[1] : null")
  })

  it('ExpandedView defines tailored guidance chips for core divination types', () => {
    const expandedViewPath = path.resolve(__dirname, '../widget/ExpandedView.tsx')
    const content = fs.readFileSync(expandedViewPath, 'utf-8')

    // BaZi guidance chips
    expect(content).toContain('不知出生時辰如何定盤？')
    expect(content).toContain('早子時與夜子時如何劃分？')
    expect(content).toContain('真太陽時經度校正要訣')

    // LiuYao guidance chips
    expect(content).toContain('起卦搖銅錢時如何集中意念？')
    expect(content).toContain('同一個問題可以多次重占嗎？')
    expect(content).toContain('六爻動爻過多時如何取用？')

    // ZiWei guidance chips
    expect(content).toContain('閏月出生在紫微中如何排盤？')

    // Tarot guidance chips
    expect(content).toContain('抽牌時如何收束雜念？')
  })

  it('ExpandedView renders pinned companion guidance banner and contextual composer placeholder', () => {
    const expandedViewPath = path.resolve(__dirname, '../widget/ExpandedView.tsx')
    const content = fs.readFileSync(expandedViewPath, 'utf-8')

    // Banner indicator
    expect(content).toContain('正在左側進行【${activeOracleMeta.twName}】起盤 · 大師伴隨中')
    // Pinned guide label
    expect(content).toContain("T(lang, '伴隨導引', 'Guide')")
    // Contextual placeholder
    expect(content).toContain('向大師諮詢【${activeOracleMeta.twName}】起盤疑問...')
    // Footer notice
    expect(content).toContain("T(lang, '起盤完成後將自動載入卦象詳批', 'Chart will auto-load here upon completion')")
  })

  it('MessageBubble renders controlled active badge when currentOracleType matches CTA divinationType', () => {
    const bubblePath = path.resolve(__dirname, '../widget/MessageBubble.tsx')
    const content = fs.readFileSync(bubblePath, 'utf-8')

    // Gated/controlled condition
    expect(content).toContain('currentOracleType && msg.ctaPayload.divinationType === currentOracleType')
    expect(content).toContain("TEN(isEn, '正在左側起盤中...', 'Casting on the left...')")
    expect(content).toContain('w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse')
  })

  it('MasterChatWidget falls back to MasterFab rather than CollapsedBar on workspace routes', () => {
    const widgetPath = path.resolve(__dirname, '../MasterChatWidget.tsx')
    const content = fs.readFileSync(widgetPath, 'utf-8')

    expect(content).toContain("const isWorkspace = pathname?.startsWith('/divination') || pathname?.startsWith('/reading')")
    expect(content).toContain('isDivinationHub ? null : isWorkspace ? (')
    expect(content).toContain('<MasterFab needsMemoryGate={needsMemoryGate}')
  })

  it('TEN helper resolves bilingual label correctly for active CTA state', () => {
    expect(TEN(false, '正在左側起盤中...', 'Casting on the left...')).toBe('正在左側起盤中...')
    expect(TEN(true, '正在左側起盤中...', 'Casting on the left...')).toBe('Casting on the left...')
  })
})
