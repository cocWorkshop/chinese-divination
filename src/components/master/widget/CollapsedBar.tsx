'use client'

/**
 * Collapsed shape — bottom bar styled as a peek of a chat conversation.
 * The master's avatar + a "received" speech bubble carrying the day's
 * opener line. Tap anywhere (bubble, avatar, or "Open" pill) to expand
 * the widget into the full transcript.
 *
 * No inline input — typing happens in the expanded view. The collapsed
 * shape is purely an invitation. Pre-`pendingReading` previously showed
 * an input here, but it muddied the visual: half "type something" affordance
 * and half "preview message". The chat-bubble framing reads cleaner and
 * matches user mental model from WeChat / iMessage previews.
 */

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMasterChat } from '../MasterChatContext'
import { useLang } from '@/components/LanguageContext'

export type GateIntent = { kind: 'open' } | { kind: 'send'; message: string }

interface Props {
  needsMemoryGate: boolean
  onRequestGate: (intent: GateIntent) => void
}

const typeLabels: Record<string, { 'zh-TW': string; en: string }> = {
  bazi: { 'zh-TW': '八字', en: 'BaZi' },
  ziwei: { 'zh-TW': '紫微', en: 'Zi Wei' },
  iching: { 'zh-TW': '易經', en: 'I Ching' },
  qimen: { 'zh-TW': '奇門', en: 'Qi Men' },
  liuyao: { 'zh-TW': '六爻', en: 'Liu Yao' },
  meihua: { 'zh-TW': '梅花易數', en: 'Mei Hua' },
  fengshui: { 'zh-TW': '風水', en: 'Feng Shui' },
  other: { 'zh-TW': '命理', en: 'Reading' },
}

export default function CollapsedBar({ needsMemoryGate, onRequestGate }: Props) {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const { setShape, pendingReading, widgetOpener, cancelPendingReading } = useMasterChat()
  const router = useRouter()

  const handleExpand = () => {
    if (needsMemoryGate) {
      onRequestGate({ kind: 'open' })
      return
    }
    setShape('expanded')
  }

  // Layout strategy: a floating self-contained chat dock at all viewport
  // sizes. Side gutters (inset-x) prevent the dock from touching the screen
  // edge; bottom offset clears iOS home indicators via env(safe-area-inset-bottom).
  // Visual treatment is the same on mobile and desktop — only the max-width
  // changes (mobile fills the gutter; desktop caps at 2xl). This gives a
  // single, consistent affordance instead of two visually distinct shapes.
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="fixed inset-x-2 sm:inset-x-3 lg:inset-x-0 z-40 pointer-events-none"
      style={{ bottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="pointer-events-auto w-full lg:max-w-2xl lg:mx-auto backdrop-blur-md border rounded-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
      {/* Single full-width click target — tap anywhere on the bar to act.
          Two modes:
            - pendingReading: routes back to the divination form (ongoing
              reading takes priority; we never want to swallow the
              "return-to-form" affordance).
            - default: expands the master chat. */}
      {pendingReading ? (() => {
        const label = typeLabels[pendingReading.type]
        const typeName = label ? label[isEn ? 'en' : 'zh-TW'] : pendingReading.type
        return (
          // Two separate click targets sharing the bar — primary is
          // "return to form" (most-used path), secondary is the cancel
          // ✕ pill at the end. We avoid nested buttons (invalid HTML)
          // by laying them out as siblings inside a flex container.
          <div className="px-4 sm:px-5 lg:px-5 h-14 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(pendingReading.url)}
              className="flex-1 flex items-center gap-3 text-left transition-opacity hover:opacity-80 min-w-0"
              title={isEn ? 'Tap to return to the divination form' : '點擊返回占卜表單'}
            >
              <span
                className="text-2xl flex-shrink-0 leading-none"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(212,175,55,0.35))' }}
                aria-hidden
              >
                🧙‍♂️
              </span>
              <span className="relative flex-shrink-0 w-2 h-2">
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'var(--gold)', opacity: 0.25, animation: 'pendingPulse 1.6s ease infinite' }}
                />
                <span className="relative block w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
              </span>
              <span className="flex-1 min-w-0 truncate text-sm">
                <span className="font-serif" style={{ color: 'var(--gold)' }}>
                  {isEn ? `Awaiting your ${typeName} chart` : `候您完成${typeName}排盤`}
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {isEn ? '· auto-resume' : '· 完成後續接'}
                </span>
              </span>
            </button>
            {/* Cancel ✕ — clears pendingReading and tells the master to
                drop the redirect attempt. Confirms via a quick window
                prompt because misclicks here would interrupt a sequential
                multi-CTA flow. */}
            <button
              type="button"
              onClick={() => {
                const ok = window.confirm(
                  isEn
                    ? `Cancel the pending ${typeName} reading? The Master will move on.`
                    : `要放棄這次 ${typeName} 占卜嗎？玄機大師會接著聊別的。`,
                )
                if (ok) cancelPendingReading()
              }}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs transition-colors hover:bg-[rgba(255,255,255,0.08)]"
              style={{ color: 'var(--text-muted)' }}
              title={isEn ? 'Cancel this redirect' : '取消這次跳轉'}
              aria-label={isEn ? 'Cancel pending reading' : '取消等待中的占卜'}
            >
              ✕
            </button>
          </div>
        )
      })() : (
        <button
          type="button"
          onClick={handleExpand}
          className="w-full px-4 sm:px-5 lg:px-5 h-14 flex items-center gap-3 text-left group"
          title={widgetOpener}
          aria-label={isEn ? 'Open Master Xuanji chat' : '展開玄機大師對話'}
        >
          {/* Avatar — bare emoji at 2x size with a soft gold halo. The previous
              circle wrapper added a competing edge against the bar border;
              dropping it lets the icon read as a presence cue, not a UI chip. */}
          <span
            className="flex-shrink-0 text-2xl leading-none transition-transform group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(212,175,55,0.35))' }}
            aria-hidden
          >
            🧙‍♂️
          </span>

          {/* Opener text — inline, no nested bubble. The outer bar carries the
              container affordance; doubling it with a bubble inside was the
              third parallel horizontal line on desktop. */}
          <span
            className="flex-1 min-w-0 truncate text-base font-serif leading-snug"
            style={{ color: 'var(--gold)' }}
          >
            {widgetOpener}
          </span>

          {/* Subtle chevron hint — clarifies the bar is interactive without
              adding more horizontal weight. Hidden on mobile where the
              full-bar tap target reads as obvious. */}
          <span
            className="hidden lg:inline flex-shrink-0 text-xs opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
            style={{ color: 'var(--text-muted)' }}
            aria-hidden
          >
            ▸
          </span>
        </button>
      )}
      <style jsx global>{`
        @keyframes pendingPulse {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
      </div>
    </motion.div>
  )
}
