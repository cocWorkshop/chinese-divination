'use client'

import React from 'react'
import { T } from '@/lib/i18n'
import type { GreetingOutput, UserProfileSummary, TemporalInsightInfo } from '@/lib/master/greetings'

export interface MasterWelcomeBoardProps {
  greeting: GreetingOutput
  viewingReadingQuestions?: string[]
  isReadingMode: boolean
  temporalInsight?: TemporalInsightInfo | null
  userProfileSummary?: UserProfileSummary | null
  temporalContext?: {
    dayGanZhi: string
    jieQi: string
    yearGanZhi: string
  } | null
  lang: 'zh-TW' | 'en'
  onSelectSuggestion: (prompt: string) => void
}

export function MasterWelcomeBoard({
  greeting,
  viewingReadingQuestions = [],
  isReadingMode,
  temporalInsight,
  userProfileSummary,
  temporalContext,
  lang,
  onSelectSuggestion,
}: MasterWelcomeBoardProps) {
  // Mode A: Reading in-context (展卷細推)
  if (isReadingMode) {
    const defaultReadingSuggestions = [
      T(lang, '請解析此盤核心格局', 'Analyze the core pattern of this chart'),
      T(lang, '此盤當前關鍵轉機在何處？', 'Where is the key turning point in this chart?'),
      T(lang, '此盤五行喜忌與調候要旨', 'Explain the favorable elements and climate adjustments'),
    ]
    const suggestions = viewingReadingQuestions.length > 0
      ? viewingReadingQuestions
      : defaultReadingSuggestions

    return (
      <div
        data-testid="welcome-board-reading"
        className="w-full max-w-lg mx-auto flex flex-col items-center text-center py-4 px-3 sm:px-4 rounded-xl border border-[var(--border-gold,rgba(212,175,55,0.2))] bg-[var(--card-bg)] backdrop-blur-sm shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] sm:text-xs font-serif tracking-wider px-2.5 py-0.5 rounded-full border border-[var(--border-gold,rgba(212,175,55,0.3))] text-[var(--gold)] bg-[rgba(212,175,55,0.06)]">
            {T(lang, '展卷細推 · 當前命盤研讀', 'Reading in Context · Deep Inquiry')}
          </span>
        </div>

        <p className="font-serif text-xs sm:text-sm leading-relaxed text-[var(--text-secondary,#c0b8ac)] max-w-md mb-3">
          {T(
            lang,
            '道友若對此盤有疑，可直接提問，或參考以下推演方向：',
            'Feel free to ask about this reading directly, or explore the directions below:',
          )}
        </p>

        <div className="w-12 h-px mb-3" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectSuggestion(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-gold,rgba(212,175,55,0.25))] text-[var(--gold)] hover:bg-[rgba(212,175,55,0.1)] transition-colors active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Mode B: Established User (天命掌樞)
  if (greeting.state === 2) {
    const rawBlocks = greeting.text.split('\n\n')
    const opener = rawBlocks[0] || ''
    const closer = rawBlocks[rawBlocks.length - 1] || ''

    const dayMaster = userProfileSummary?.dayMasterOrMainStar
      ? T(lang, userProfileSummary.dayMasterOrMainStar['zh-TW'], userProfileSummary.dayMasterOrMainStar.en)
      : null
    const realm = userProfileSummary?.realmTitle
      ? T(lang, userProfileSummary.realmTitle['zh-TW'], userProfileSummary.realmTitle.en)
      : null
    const topic = userProfileSummary?.recentTopic
      ? T(lang, userProfileSummary.recentTopic['zh-TW'], userProfileSummary.recentTopic.en)
      : null

    const cosmicInsight = temporalInsight
      ? T(lang, temporalInsight['zh-TW'], temporalInsight.en)
      : null

    return (
      <div
        data-testid="welcome-board-established"
        className="w-full max-w-lg mx-auto flex flex-col items-center text-center py-4 px-3 sm:px-4 rounded-xl border border-[var(--border-gold,rgba(212,175,55,0.2))] bg-[var(--card-bg)] backdrop-blur-sm shadow-sm space-y-3"
      >
        {/* Opener text */}
        <p className="font-serif text-xs sm:text-sm leading-relaxed text-[var(--text-primary,#e0e0e0)] max-w-md">
          {opener}
        </p>

        {/* User Profile / Metaphysics Resonance Badges */}
        {(dayMaster || realm || topic) && (
          <div className="flex flex-wrap justify-center items-center gap-1.5">
            {dayMaster && (
              <span className="text-[11px] font-serif px-2 py-0.5 rounded-full border border-[var(--border-gold,rgba(212,175,55,0.3))] text-[var(--gold)] bg-[rgba(212,175,55,0.06)]">
                {T(lang, `本命 · ${dayMaster}`, `Natal · ${dayMaster}`)}
              </span>
            )}
            {realm && (
              <span className="text-[11px] font-serif px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.2)] text-[var(--text-secondary,#c0b8ac)] bg-[rgba(255,255,255,0.03)]">
                {T(lang, `境界 · ${realm}`, `Realm · ${realm}`)}
              </span>
            )}
            {topic && (
              <span className="text-[11px] font-serif px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.2)] text-[var(--text-secondary,#c0b8ac)] bg-[rgba(255,255,255,0.03)]">
                {T(lang, `關切 · ${topic}`, `Focus · ${topic}`)}
              </span>
            )}
          </div>
        )}

        {/* Celestial Resonance Box (天地時序 + 五行點撥) */}
        {temporalContext && (
          <div className="w-full max-w-md px-3 py-2 rounded-lg border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.03)] text-left sm:text-center space-y-1">
            <div className="text-[11px] sm:text-xs font-serif text-[var(--text-secondary,#c0b8ac)] flex flex-wrap justify-center items-center gap-x-2">
              <span>{T(lang, `今日：${temporalContext.dayGanZhi}日 · ${temporalContext.jieQi}`, `Today: ${temporalContext.dayGanZhi} · ${temporalContext.jieQi}`)}</span>
              <span className="opacity-40">｜</span>
              <span>{T(lang, `流年：${temporalContext.yearGanZhi}`, `Annual: ${temporalContext.yearGanZhi}`)}</span>
            </div>
            {cosmicInsight && (
              <p className="text-[11px] sm:text-xs font-serif leading-relaxed text-[var(--gold)] opacity-90 italic">
                {cosmicInsight}
              </p>
            )}
          </div>
        )}

        {/* Closer Prompt */}
        <p className="font-serif text-xs sm:text-sm text-[var(--text-secondary,#c0b8ac)]">
          {closer}
        </p>

        <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

        {/* Suggestion Chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {greeting.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectSuggestion(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-gold,rgba(212,175,55,0.25))] text-[var(--gold)] hover:bg-[rgba(212,175,55,0.1)] transition-colors active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Mode C: First-time User (一念啟道)
  return (
    <div
      data-testid="welcome-board-first-time"
      className="w-full max-w-lg mx-auto flex flex-col items-center text-center py-4 px-3 sm:px-4 rounded-xl border border-[var(--border-gold,rgba(212,175,55,0.2))] bg-[var(--card-bg)] backdrop-blur-sm shadow-sm space-y-3"
    >
      <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

      <p className="font-serif text-xs sm:text-sm leading-relaxed whitespace-pre-line text-[var(--text-primary,#e0e0e0)] max-w-md">
        {greeting.text}
      </p>

      <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

      <div className="flex flex-wrap justify-center gap-2">
        {greeting.suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectSuggestion(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-gold,rgba(212,175,55,0.25))] text-[var(--gold)] hover:bg-[rgba(212,175,55,0.1)] transition-colors active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
