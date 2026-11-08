'use client'

/**
 * Expanded shape — fullscreen overlay (z-50) with header, transcript, and
 * input row. Owns its own input state, scroll refs, and the new-chat
 * confirm modal. The widget-level memory gate modal renders ABOVE this
 * view and is signaled via `onRequestGate`.
 *
 * Auto-scroll behavior: snaps instantly to the bottom on first paint after
 * open (so the user lands at the latest turn), then smooth-scrolls for
 * subsequent message arrivals — unless the user has scrolled up.
 */

import { useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useMasterChat, type MasterMsg } from '../MasterChatContext'
import { useLang } from '@/components/LanguageContext'
import { renderGreeting } from '@/lib/master/greetings'
import { withCtaNonce } from '@/lib/master/ctaNav'
import MessageBubble from './MessageBubble'
import type { GateIntent } from './CollapsedBar'
import { MasterSageIcon, PlusIcon, CloseIcon, CopyIcon } from '@/components/DivinationIcons'
import { copyToClipboard, formatMessagesForCopy } from './chatCopy'
import { MasterWelcomeBoard } from './MasterWelcomeBoard'
import { T } from '@/lib/i18n'
import { langKey } from '@/lib/i18n'

interface Props {
  needsMemoryGate: boolean
  gateVisible: boolean
  onRequestGate: (intent: GateIntent) => void
}

interface OracleDetail {
  twName: string
  enName: string
  icon: string
  guidanceChips: { tw: string; en: string }[]
}

const ORACLE_DETAILS: Record<string, OracleDetail> = {
  bazi: {
    twName: '八字命理',
    enName: 'BaZi Chart',
    icon: '📜',
    guidanceChips: [
      { tw: '不知出生時辰如何定盤？', en: 'How to cast if exact birth hour is unknown?' },
      { tw: '早子時與夜子時如何劃分？', en: 'How to divide early vs late Zi hour?' },
      { tw: '真太陽時經度校正要訣', en: 'Solar time & longitude correction tips' },
    ],
  },
  ziwei: {
    twName: '紫微斗數',
    enName: 'ZiWei DouShu',
    icon: '✨',
    guidanceChips: [
      { tw: '閏月出生在紫微中如何排盤？', en: 'How is leap month calculated in ZiWei?' },
      { tw: '時辰交界（如11:00）如何定時？', en: 'How to resolve boundary hour casting?' },
      { tw: '出生地經緯度對命盤有何影響？', en: 'Impact of birth coordinates on chart?' },
    ],
  },
  liuyao: {
    twName: '六爻神卦',
    enName: 'LiuYao Divination',
    icon: '🪙',
    guidanceChips: [
      { tw: '起卦搖銅錢時如何集中意念？', en: 'How to focus intent when tossing coins?' },
      { tw: '同一個問題可以多次重占嗎？', en: 'Can I recast for the exact same concern?' },
      { tw: '六爻動爻過多時如何取用？', en: 'How to interpret multiple changing lines?' },
    ],
  },
  iching: {
    twName: '易經周易',
    enName: 'I Ching Hexagram',
    icon: '☯',
    guidanceChips: [
      { tw: '心念如何收束以契合易理？', en: 'How to focus mind to align with the I Ching?' },
      { tw: '本卦與變卦的核心關係是什麼？', en: 'Base vs changed hexagram relationship?' },
      { tw: '何時宜動？何時宜靜？', en: 'When to act vs when to hold still?' },
    ],
  },
  tarot: {
    twName: '塔羅牌陣',
    enName: 'Tarot Spread',
    icon: '🃏',
    guidanceChips: [
      { tw: '抽牌時如何收束雜念？', en: 'How to quiet the mind during card draw?' },
      { tw: '逆位牌象徵阻滯還是轉機？', en: 'Do reversed cards mean blocks or turning points?' },
      { tw: '如何向牌面提出更精準的問句？', en: 'How to formulate clearer card questions?' },
    ],
  },
  meihua: {
    twName: '梅花易數',
    enName: 'Plum Blossom',
    icon: '🌸',
    guidanceChips: [
      { tw: '先天起卦與後天起卦如何抉擇？', en: 'Choosing between pre-heaven & post-heaven?' },
      { tw: '起卦時如何捕捉眼前外應靈兆？', en: 'How to perceive spontaneous outer omens?' },
    ],
  },
  qimen: {
    twName: '奇門遁甲',
    enName: 'QiMen DunJia',
    icon: '🧭',
    guidanceChips: [
      { tw: '奇門問事如何以事定宮？', en: 'How to designate focal palace by inquiry?' },
      { tw: '當前時辰局數的感應玄機？', en: 'Resonance of current hour cosmic bureau?' },
    ],
  },
  fengshui: {
    twName: '風水堪輿',
    enName: 'FengShui Audit',
    icon: '🏔️',
    guidanceChips: [
      { tw: '如何準確測定住宅大門坐向？', en: 'How to accurately measure entrance facing?' },
      { tw: '住宅缺角對不同家庭成員的影響？', en: 'Impact of missing corners on members?' },
    ],
  },
  xiaoliuren: {
    twName: '小六壬',
    enName: 'Xiao Liu Ren',
    icon: '✋',
    guidanceChips: [
      { tw: '小六壬掐指推算之法？', en: 'Rules for Xiao Liu Ren finger counting?' },
      { tw: '急事突發如何立斷吉凶？', en: 'How to judge sudden urgent matters?' },
    ],
  },
}

export default function ExpandedView({ needsMemoryGate, gateVisible, onRequestGate }: Props) {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const {
    setShape,
    messages,
    loading,
    toolStatus,
    greetingHints,
    sendMessage,
    startNewSession,
    widgetOpener,
    notifyTyping,
    interruptCooldownUntil,
    portraitEnabled,
    setPortraitEnabled,
    viewingReadingId,
    viewingReadingQuestions,
  } = useMasterChat()

  const isReadingMode = Boolean(viewingReadingId || (viewingReadingQuestions && viewingReadingQuestions.length > 0))

  const [input, setInput] = useState('')
  const [showMemoryPanel, setShowMemoryPanel] = useState(false)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const userScrolledRef = useRef(false)
  // True for the first scroll-effect fire after the view mounts. Lets us
  // snap instantly to the bottom on open instead of smooth-scrolling from
  // top → bottom (which exposes the entire history in fast-forward).
  const justOpenedRef = useRef(true)
  const router = useRouter()
  const pathname = usePathname()
  const isWorkspace = pathname?.startsWith('/divination') || pathname?.startsWith('/reading')
  const oracleMatch = pathname?.match(/^\/divination\/([a-z0-9_-]+)$/)
  const currentOracleType = oracleMatch && oracleMatch[1] !== 'undefined' ? oracleMatch[1] : null
  const activeOracleMeta: OracleDetail | null = currentOracleType
    ? ORACLE_DETAILS[currentOracleType] || {
        twName: '正統術數',
        enName: 'Divination',
        icon: '📜',
        guidanceChips: [
          { tw: '本次起盤需注意什麼心念？', en: 'What mindset should I hold for this reading?' },
          { tw: '起盤完成後大師會如何解讀？', en: 'How will the Master analyze my result?' },
        ],
      }
    : null

  // Templated greeting (NOT LLM-generated) — rendered when the message list
  // is empty.
  const greeting = useMemo(
    () =>
      renderGreeting({
        lang: langKey(lang),
        hasReadings: greetingHints.hasReadings,
        lastReading: greetingHints.lastReading,
        readingTypeCounts: greetingHints.readingTypeCounts,
        temporalContext: greetingHints.temporalContext,
        temporalInsight: greetingHints.temporalInsight,
        userProfileSummary: greetingHints.userProfileSummary,
        // Reuse the opener picked once at provider mount — the user
        // already saw this exact line in the collapsed bar's hint, so
        // randomizing again here would produce two introductions.
        presetOpener: widgetOpener,
      }),
    [
      lang,
      greetingHints.hasReadings,
      greetingHints.lastReading,
      greetingHints.readingTypeCounts,
      greetingHints.temporalContext,
      greetingHints.temporalInsight,
      greetingHints.userProfileSummary,
      widgetOpener,
    ],
  )

  // Auto-scroll on new messages. Instant on first paint, smooth thereafter.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || userScrolledRef.current || isSelectMode) return
    const behavior: ScrollBehavior = justOpenedRef.current ? 'auto' : 'smooth'
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior })
    })
    if (justOpenedRef.current) justOpenedRef.current = false
  }, [messages, toolStatus, isSelectMode])

  // Focus input on mount.
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Escape exits selection mode first, or collapses the overlay (standard modal dismissal).
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !gateVisible) {
        if (isSelectMode) {
          setIsSelectMode(false)
          setSelectedIndices(new Set())
        } else {
          setShape('collapsed')
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [gateVisible, isSelectMode, setShape])

  const selectableIndices = useMemo(() => {
    return messages
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => m.kind !== 'feedback_prompt' && (m.content || m.readingCardPayload || m.ctaPayload))
      .map(({ idx }) => idx)
  }, [messages])

  const allSelected = selectableIndices.length > 0 && selectableIndices.every((i) => selectedIndices.has(i))

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(selectableIndices))
    }
  }

  const handleCopySelected = async () => {
    if (selectedIndices.size === 0) return
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b)
    const selectedMsgs = sortedIndices.map((i) => messages[i]).filter(Boolean)
    const formatted = formatMessagesForCopy(selectedMsgs, isEn)
    if (!formatted) {
      toast.error(T(lang, '無有效文字可複製', 'No copyable text'))
      return
    }
    const ok = await copyToClipboard(formatted)
    if (ok) {
      toast.success(
        T(
          lang,
          `已複製 ${selectedIndices.size} 條聊天記錄！`,
          `Copied ${selectedIndices.size} chat messages!`
        )
      )
      setIsSelectMode(false)
      setSelectedIndices(new Set())
    } else {
      toast.error(T(lang, '複製失敗，請重試', 'Copy failed, please retry'))
    }
  }

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    if (needsMemoryGate) {
      onRequestGate({ kind: 'send', message: msg })
      return
    }
    setInput('')
    notifyTyping(0)  // draft consumed — clear the typing guard
    userScrolledRef.current = false
    sendMessage(msg)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Live countdown for the interrupt rate-limit cooldown. The provider drops
  // over-cap interrupts after they were already rendered as bubbles, so a
  // persistent notice (not just the one-shot toast) is the only honest signal
  // that the last message never reached the master.
  const [cooldownLeft, setCooldownLeft] = useState(0)
  useEffect(() => {
    if (!interruptCooldownUntil) {
      setCooldownLeft(0)
      return
    }
    const tick = () =>
      setCooldownLeft(Math.max(0, Math.ceil((interruptCooldownUntil - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [interruptCooldownUntil])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledRef.current = distanceFromBottom > 80
  }

  const handleCtaClick = (msg: MasterMsg) => {
    if (!msg.ctaPayload) return
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
    if (!isDesktop) {
      setShape('collapsed')
    }
    router.push(withCtaNonce(msg.ctaPayload.url))
  }

  const handleReadingCardClick = (url: string) => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
    if (!isDesktop) {
      setShape('collapsed')
    }
    router.push(url)
  }

  const showWelcome = messages.length === 0

  return (
    <AnimatePresence>
      <motion.div
        key="expanded"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 ${
          isWorkspace
            ? 'lg:inset-auto lg:top-16 lg:bottom-0 lg:right-0 lg:left-auto lg:w-[440px] xl:w-[480px] 2xl:w-[520px] lg:z-30 lg:p-0 lg:block'
            : ''
        }`}
        style={{ paddingTop: isWorkspace ? undefined : 'env(safe-area-inset-top)' }}
      >
        <div
          className={`absolute inset-0 ${isWorkspace ? 'lg:hidden' : ''}`}
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.06) 0%, var(--bg-primary) 70%)' }}
        />

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className={`relative w-full max-w-[100vw] h-full sm:h-[85vh] sm:max-w-2xl flex flex-col rounded-none sm:rounded-2xl overflow-hidden shadow-2xl ${
            isWorkspace
              ? 'border border-[var(--card-border)] lg:w-full lg:max-w-none lg:h-full lg:rounded-none lg:border-l lg:border-t-0 lg:border-r-0 lg:border-b-0 lg:border-[rgba(212,168,83,0.25)] lg:shadow-2xl'
              : 'border border-[var(--card-border)]'
          }`}
          role={isWorkspace ? 'region' : 'dialog'}
          aria-modal={isWorkspace ? undefined : true}
          aria-label={T(lang, '玄機大師對話', 'Master Xuanji chat')}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.98 }} />

          {/* Header */}
          <div
            className="relative flex items-center justify-between px-3.5 sm:px-5 py-3 sm:py-3.5 gap-1.5 sm:gap-2.5 min-w-0"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
              <span
                className="leading-none shrink-0"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(212,175,55,0.4))' }}
                aria-hidden
              >
                <MasterSageIcon size={22} color="var(--gold)" />
              </span>
              <span className="font-serif text-base sm:text-lg tracking-wide whitespace-nowrap shrink-0" style={{ color: 'var(--gold)' }}>
                {showMemoryPanel
                  ? (T(lang, '記憶設定', 'Memory Settings'))
                  : (T(lang, '玄機大師', 'Master Xuanji'))}
              </span>
              {loading && !showMemoryPanel && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse shrink-0" />}
              <button
                onClick={() => setShowMemoryPanel(!showMemoryPanel)}
                className={`text-[11px] px-2 sm:px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap ${
                  showMemoryPanel
                    ? 'bg-[rgba(212,168,83,0.18)] text-[var(--gold)] border-[var(--gold)] font-medium'
                    : 'text-[var(--text-muted)] hover:bg-[rgba(212,175,55,0.08)]'
                }`}
                style={{ border: '1px solid var(--card-border)' }}
                title={showMemoryPanel ? (T(lang, '返回對話', 'Return to chat')) : (T(lang, '記憶設定', 'Memory settings'))}
                aria-label={showMemoryPanel ? (T(lang, '返回對話', 'Return to chat')) : (T(lang, '記憶設定', 'Memory settings'))}
              >
                <span>{showMemoryPanel ? (T(lang, '← 返回對話', '← Chat')) : (T(lang, '記憶', 'Memory'))}</span>
                {!showMemoryPanel && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      portraitEnabled ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                )}
              </button>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {!showMemoryPanel && messages.length > 0 && (
                <button
                  onClick={() => {
                    if (isSelectMode) {
                      if (selectedIndices.size > 0) {
                        void handleCopySelected()
                      } else {
                        setIsSelectMode(false)
                        setSelectedIndices(new Set())
                      }
                    } else {
                      setIsSelectMode(true)
                      setSelectedIndices(new Set())
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 h-7 sm:h-8 rounded-full text-xs transition-colors shrink-0 whitespace-nowrap ${
                    isSelectMode && selectedIndices.size > 0
                      ? 'bg-[var(--gold)] text-[#080c17] font-medium shadow-sm hover:brightness-110 active:scale-[0.98]'
                      : isSelectMode
                        ? 'bg-[rgba(212,175,55,0.2)] text-[var(--gold)] border-[var(--gold)] font-medium shadow-sm'
                        : 'hover:bg-[rgba(212,175,55,0.08)] text-[var(--text-muted)]'
                  }`}
                  style={{ border: isSelectMode && selectedIndices.size > 0 ? 'none' : '1px solid var(--card-border)' }}
                  title={
                    isSelectMode
                      ? selectedIndices.size > 0
                        ? T(lang, '完成', 'Done')
                        : T(lang, '退出選擇模式', 'Exit selection mode')
                      : T(lang, '多選複製聊天記錄', 'Select & copy messages')
                  }
                  aria-label={
                    isSelectMode
                      ? selectedIndices.size > 0
                        ? T(lang, '完成', 'Done')
                        : T(lang, '退出選擇模式', 'Exit selection mode')
                      : T(lang, '多選複製聊天記錄', 'Select & copy messages')
                  }
                >
                  <CopyIcon size={13} color={isSelectMode && selectedIndices.size > 0 ? '#080c17' : 'var(--gold)'} />
                  {!isSelectMode ? (
                    <span className="hidden sm:inline">
                      {T(lang, '選擇複製', 'Select')}
                    </span>
                  ) : (
                    <span>
                      {selectedIndices.size > 0
                        ? T(lang, `完成 (${selectedIndices.size})`, `Done (${selectedIndices.size})`)
                        : T(lang, '完成', 'Done')}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  setIsSelectMode(false)
                  setSelectedIndices(new Set())
                  void startNewSession()
                }}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 h-7 sm:h-8 rounded-full text-xs transition-colors hover:bg-[rgba(212,175,55,0.08)] shrink-0 whitespace-nowrap"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
                title={T(lang, '開始新對話', 'Start a new chat')}
                aria-label={T(lang, '開始新對話', 'Start a new chat')}
              >
                <PlusIcon size={13} color="var(--gold)" />
                <span className="hidden sm:inline">{T(lang, '新對話', 'New chat')}</span>
              </button>
              <button
                onClick={() => setShape('collapsed')}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-colors shrink-0 hover:bg-[rgba(212,175,55,0.08)]"
                style={{ color: 'var(--text-muted)' }}
                title={isWorkspace ? T(lang, '收起大師面板', 'Collapse Master panel') : T(lang, '收合對話', 'Close chat')}
                aria-label={isWorkspace ? T(lang, '收起大師面板', 'Collapse Master panel') : T(lang, '收合對話', 'Close chat')}
              >
                <CloseIcon size={15} />
              </button>
            </div>
          </div>

          {showMemoryPanel ? (
            <div className="relative flex-1 flex flex-col p-5 sm:p-6 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
              <div className="max-w-md mx-auto w-full space-y-5 my-auto">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 rounded-full bg-[rgba(212,168,83,0.1)] border border-[rgba(212,168,83,0.25)]">
                    <MasterSageIcon size={32} color="var(--gold)" />
                  </div>
                  <h3 className="text-xl font-serif text-[var(--gold)]">
                    {T(lang, '大師記憶管治', 'Master Memory Governance')}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {T(
                      lang,
                      '玄機大師會銘記您的命造八字、問測偏好與歷次對談，為您提供更精準契合的命理推演。',
                      'Master Xuanji notes your reading context and preferences to provide deeper astrological counsel.'
                    )}
                  </p>
                </div>

                <div className="oriental-sanctuary-card p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-serif text-[var(--text-muted)]">
                        {T(lang, '當前記憶狀態', 'Current Status')}
                      </div>
                      <div className="text-sm font-medium mt-1">
                        {portraitEnabled ? (
                          <span className="stamp-gold text-xs">{T(lang, '已啟用 · 運作中', 'Active')}</span>
                        ) : (
                          <span className="stamp-vermillion text-xs">{T(lang, '已暫停 · 封存中', 'Paused')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setPortraitEnabled(!portraitEnabled)}
                      className="px-4 py-2 rounded-xl text-xs font-serif font-medium transition-all min-h-[40px] flex items-center justify-center active:scale-[0.98]"
                      style={{
                        background: portraitEnabled ? 'rgba(192, 57, 43, 0.15)' : 'var(--gold)',
                        color: portraitEnabled ? '#ef4444' : '#080c17',
                        border: portraitEnabled ? '1px solid rgba(192, 57, 43, 0.4)' : 'none',
                      }}
                    >
                      {portraitEnabled
                        ? (T(lang, '暫停記憶', 'Pause Memory'))
                        : (T(lang, '開啟記憶', 'Enable Memory'))}
                    </button>
                  </div>

                  <div className="verse-callout text-[11px] text-[var(--text-muted)]">
                    {T(
                      lang,
                      '記憶僅用於延續問測心流，嚴守道家隱私戒律，絕不外洩。',
                      'Memory is strictly used to deepen your personal divination guidance and remains strictly confidential.'
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setShowMemoryPanel(false)}
                    className="w-full py-3 rounded-xl text-sm font-serif font-medium transition-all min-h-[44px] flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-[0.98]"
                    style={{ background: 'var(--gold)', color: '#080c17' }}
                  >
                    <span>✦</span>
                    <span>{T(lang, '完成並返回對話', 'Save & Return to Chat')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMemoryPanel(false)
                      setShape('collapsed')
                      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
                      router.push(`/profile/portrait?from=master&returnUrl=${returnUrl}`)
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-serif transition-all min-h-[40px] flex items-center justify-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--gold)] border border-[rgba(212,168,83,0.2)] hover:border-[rgba(212,168,83,0.4)] hover:bg-[rgba(212,168,83,0.04)]"
                  >
                    <span>{T(lang, '前往完整記憶設定頁面 ↗', 'Open Full Memory Settings Page ↗')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Oracle Companion Guidance Banner (active on /divination/[type] routes) */}
              {activeOracleMeta && (
                <div className="relative px-3.5 sm:px-5 py-3 border-b border-[var(--border-gold,rgba(212,175,55,0.25))] bg-[rgba(212,168,83,0.06)] shrink-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <span className="text-xs font-serif font-medium truncate" style={{ color: 'var(--gold)' }}>
                        {T(
                          lang,
                          `正在左側進行【${activeOracleMeta.twName}】起盤 · 大師伴隨中`,
                          `Casting ${activeOracleMeta.enName} on the left · Master Accompanying`
                        )}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-serif">
                      {T(lang, '伴隨導引', 'Guide')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-2.5">
                    {T(
                      lang,
                      '您正在左側填寫起盤參數。若對生辰時辰、曆法或起卦有任何疑問，可隨時向大師諮詢；起盤完成後，卦象將自動載入此處。',
                      'Enter your casting info on the left. Feel free to ask Master Xuanji any questions about birth times or casting rules. Results will auto-load here.'
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeOracleMeta.guidanceChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(T(lang, chip.tw, chip.en))}
                        disabled={loading}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--card-border)] hover:border-[var(--gold)] hover:bg-[rgba(212,175,55,0.1)] text-[var(--text-primary)] transition-all text-left flex items-center gap-1 active:scale-95 disabled:opacity-40"
                        style={{ backgroundColor: 'var(--card-bg)' }}
                      >
                        <span className="text-[9px]" style={{ color: 'var(--gold)' }}>✦</span>
                        <span>{T(lang, chip.tw, chip.en)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="relative flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 scrollbar-thin"
                aria-live="polite"
                aria-label="Chat messages"
              >
                {showWelcome && (
                  <div className="pt-2 pb-4">
                    <MasterWelcomeBoard
                      greeting={greeting}
                      viewingReadingQuestions={viewingReadingQuestions}
                      isReadingMode={isReadingMode}
                      temporalInsight={greetingHints.temporalInsight}
                      userProfileSummary={greetingHints.userProfileSummary}
                      temporalContext={greetingHints.temporalContext}
                      lang={langKey(lang)}
                      onSelectSuggestion={handleSend}
                    />
                  </div>
                )}

                {messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    msg={msg}
                    isLastMessage={i === messages.length - 1}
                    loading={loading}
                    isEn={isEn}
                    onCtaClick={handleCtaClick}
                    onReadingCardClick={handleReadingCardClick}
                    onStartNewSession={() => { void startNewSession() }}
                    isSelectMode={isSelectMode}
                    isSelected={selectedIndices.has(i)}
                    currentOracleType={currentOracleType}
                    onToggleSelect={() => {
                      setSelectedIndices((prev) => {
                        const next = new Set(prev)
                        if (next.has(i)) next.delete(i)
                        else next.add(i)
                        return next
                      })
                    }}
                  />
                ))}

                {/* Tool running indicator */}
                <AnimatePresence>
                  {toolStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-start"
                      role="status"
                    >
                      <div className="rounded-2xl px-4 py-3" style={{ border: '1px solid var(--border-gold)', background: 'var(--accent-bg)' }}>
                        <div className="flex items-center gap-3">
                          <div className="relative w-5 h-5 flex items-center justify-center">
                            <div
                              className="absolute inset-0 rounded-full"
                              style={{ background: 'var(--gold)', opacity: 0.15, animation: 'toolPulse 1.5s ease infinite' }}
                            />
                            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
                          </div>
                          <span className="text-sm font-serif" style={{ color: 'var(--gold)' }}>
                            {toolStatus.label}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom bar: Selection action bar OR normal input row */}
              {isSelectMode ? (
                <div
                  className="relative px-4 sm:px-5 py-3 flex items-center justify-between gap-3 animate-fadeIn"
                  style={{
                    borderTop: '1px solid var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[rgba(212,175,55,0.08)] transition-all font-serif"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {allSelected ? T(lang, '取消全選', 'Deselect all') : T(lang, '全選', 'Select all')}
                    </button>
                    <span className="text-xs font-serif" style={{ color: 'var(--gold)' }}>
                      {T(lang, `已選 ${selectedIndices.size} 條`, `${selectedIndices.size} selected`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsSelectMode(false)
                        setSelectedIndices(new Set())
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[rgba(212,175,55,0.08)] transition-all"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {T(lang, '取消', 'Cancel')}
                    </button>
                    <button
                      onClick={handleCopySelected}
                      disabled={selectedIndices.size === 0}
                      className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_12px_rgba(212,175,55,0.3)] active:scale-[0.98]"
                      style={{ backgroundColor: 'var(--gold)', color: '#080c17' }}
                    >
                      <CopyIcon size={14} color="#080c17" />
                      <span>{T(lang, '複製記錄', 'Copy Selected')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative px-4 sm:px-5 py-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <AnimatePresence>
                    {cooldownLeft > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        role="status"
                        className="mb-2 px-3 py-2 rounded-lg text-xs leading-relaxed"
                        style={{
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--card-border)',
                          background: 'var(--accent-bg)',
                        }}
                      >
                        {T(
                          lang,
                          `剛才的訊息未送出 — 打斷過於頻繁。請等當前回應結束，或約 ${cooldownLeft} 秒後再試。`,
                          `Your last message wasn't sent — too many interruptions. Let the current reply finish, or try again in ~${cooldownLeft}s.`
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        notifyTyping(e.target.value.length)
                      }}
                      onKeyDown={handleKeyDown}
                      onFocus={(e) => {
                        if (needsMemoryGate) {
                          onRequestGate({ kind: 'open' })
                          e.currentTarget.blur()
                        }
                      }}
                      placeholder={
                        activeOracleMeta
                          ? T(
                              lang,
                              `向大師諮詢【${activeOracleMeta.twName}】起盤疑問...`,
                              `Ask Master about this ${activeOracleMeta.enName} casting...`
                            )
                          : T(lang, '請問大師...', 'Ask the Master...')
                      }
                      rows={1}
                      className="flex-1 resize-none rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-1 transition-all"
                      style={{
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        maxHeight: '120px',
                      }}
                      disabled={loading || needsMemoryGate}
                    />
                    <button
                      onClick={() => {
                        if (needsMemoryGate) {
                          onRequestGate({ kind: 'open' })
                          return
                        }
                        handleSend()
                      }}
                      disabled={loading || (!needsMemoryGate && !input.trim())}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-20 hover:shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                      style={{ backgroundColor: 'var(--gold)', color: '#000' }}
                    >
                      {T(lang, '發送', 'Send')}
                    </button>
                  </div>
                  {activeOracleMeta && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1 font-serif">
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--gold)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>{T(lang, '起盤完成後將自動載入卦象詳批', 'Chart will auto-load here upon completion')}</span>
                      </span>
                      <span className="hidden sm:inline opacity-60">
                        {T(lang, 'Enter 送出 · Shift+Enter 換行', 'Enter to send')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </motion.div>

        {/* CSS for dot + tool pulse animations */}
        <style jsx global>{`
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
          @keyframes toolPulse {
            0%, 100% { transform: scale(1); opacity: 0.15; }
            50% { transform: scale(1.8); opacity: 0; }
          }
          .prose-master p { margin: 0.3em 0; }
          .prose-master strong { font-weight: 600; color: var(--gold); }
          .scrollbar-thin::-webkit-scrollbar { width: 4px; }
          .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
          .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 2px; }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
