'use client'

import { useMasterChat } from '@/components/master/MasterChatContext'
import { motion } from 'framer-motion'
import { MasterSageIcon } from '@/components/DivinationIcons'
import { T } from '@/lib/i18n'
import { useMemo, useEffect } from 'react'

interface InContextMasterPromptProps {
  divinationType: string
  readingId?: string | null
  lang?: string
  result?: string | Record<string, unknown> | null
}

export default function InContextMasterPrompt({
  divinationType,
  readingId,
  lang = 'zh-TW',
  result,
}: InContextMasterPromptProps) {
  const { setShape, sendMessage, loading, setViewingReading } = useMasterChat()

  const getPrompts = (): string[] => {
    switch (divinationType) {
      case 'bazi':
        return T(
          lang,
          [
            '以我的命局喜用神來看，近一兩年適合換工作或創業嗎？',
            '我命中正緣與婚姻宮有何特徵？大約在何時有應期？',
            '此盤大運流年是否有相沖之處？具體該如何防範化解？',
          ],
          [
            'Based on my favorable elements, is now a good time for a career change?',
            'What are the key traits and timing for my marriage/relationship palace?',
            'Are there major elemental clashes in my current cycle, and how can I mitigate them?',
          ]
        )
      case 'ziwei':
        return T(
          lang,
          [
            '我命宮主星與三方四正配合，生平最核心的天賦長板在哪裡？',
            '當前這步十年大限，我的財帛宮與官祿宮氣數如何？',
            '星盤中化忌星落在何處？日常修身有何指引建議？',
          ],
          [
            'What is the core strength and life purpose shown by my Life Palace?',
            'How are my Wealth and Career palaces faring in my current 10-year limit?',
            'Where does the obstacle star (Hua-Ji) fall, and how can I harmonize it?',
          ]
        )
      case 'liuyao':
        return T(
          lang,
          [
            '此卦世應生剋如何？對方或外界對此事的真實態度是什麼？',
            '卦中動爻生變，此事的關鍵轉折與結果應期大概在何時？',
            '若我要全力推動此事，在人事或時機上有何趨吉避凶之法？',
          ],
          [
            'What is the true dynamic between the subject and object lines?',
            'With changing lines active, what is the critical timeline and turning point?',
            'What practical adjustments in timing or allies will maximize success?',
          ]
        )
      case 'meihua':
        return T(
          lang,
          [
            '體用五行生剋中，此事是速決順利，還是遲緩多阻？',
            '從互卦與變卦的演進來看，最終格局是吉是凶？',
            '若想化被動為主動，有何物象、顏色或時辰可為我所用？',
          ],
          [
            'In host and guest interplay, will this unfold rapidly or with delays?',
            'Looking at the mutual and resulting hexagrams, what is the final outcome?',
            'What environmental cues or optimal hours should I utilize?',
          ]
        )
      default:
        return T(
          lang,
          [
            '請大師為我精闢提煉此盤中最重要的天時玄機。',
            '面對這項結果，我當下最該防範的心性盲點是什麼？',
            '接下來的一步，大師建議我採取主動出擊還是靜觀其變？',
          ],
          [
            'Master, please summarize the single most pivotal insight of this chart.',
            'What is the core personal blind spot I should guard against right now?',
            'For my immediate next step, do you advise taking bold action or patient observation?',
          ]
        )
    }
  }

  // Dynamic LLM-generated suggested questions from divination result
  const dynamicQuestions: string[] = useMemo(() => {
    if (!result) return []
    try {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result
      if (Array.isArray(parsed?.suggestedQuestions) && parsed.suggestedQuestions.length > 0) {
        return parsed.suggestedQuestions
          .filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 0)
      }
    } catch {
      // not valid JSON yet or streaming
    }
    return []
  }, [result])

  const prompts = dynamicQuestions.length > 0 ? dynamicQuestions : getPrompts()

  useEffect(() => {
    if (readingId && setViewingReading) {
      setViewingReading(readingId, dynamicQuestions.length > 0 ? dynamicQuestions : undefined)
    }
  }, [readingId, setViewingReading, dynamicQuestions])

  const handleAsk = (promptText: string) => {
    if (readingId && setViewingReading) {
      setViewingReading(readingId, dynamicQuestions.length > 0 ? dynamicQuestions : undefined)
    }
    setShape('expanded')
    if (!loading) {
      void sendMessage(promptText, { immediate: true })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="oriental-sanctuary-card p-5 sm:p-7 my-6 rounded-2xl relative overflow-hidden"
    >
      {/* Subtle corner badge */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <MasterSageIcon size={24} color="var(--gold)" />
          <h3 className="font-serif text-base sm:text-lg text-gold-light font-medium tracking-wide">
            {T(lang, '玄機大師 · 依盤解惑', 'Master Xuanji · In-Depth Consultation')}
          </h3>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-gold/20 text-gold/80 bg-gold/5 font-serif hidden sm:inline-block">
          {T(lang, '連貫上下文解盤', 'Context-Aware')}
        </span>
      </div>

      <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-light leading-relaxed mb-4">
        {T(
          lang,
          '大師已研讀您的這份推演。若心中尚有未明之結，可直接點選下方要點向大師追問：',
          'The Master has examined your reading. Click any key inquiry below to continue the consultation in real time:'
        )}
      </p>

      {/* In-context question chips */}
      <div className="flex flex-col gap-2.5">
        {prompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(q)}
            disabled={loading}
            className="w-full text-left p-3 sm:py-3 sm:px-4 rounded-xl bg-[var(--accent-bg)] hover:bg-gold/10 border border-gold/20 hover:border-gold/40 text-[var(--text-primary)] hover:text-gold transition-all duration-200 text-xs sm:text-sm font-light flex items-center justify-between gap-3 group cursor-pointer disabled:opacity-50"
          >
            <span className="flex-1 leading-relaxed">
              <span className="text-gold/60 mr-2 font-serif">#{idx + 1}</span>
              {q}
            </span>
            <span className="text-gold/40 group-hover:text-gold group-hover:translate-x-1 transition-all duration-200 text-sm font-sans flex-shrink-0">
              →
            </span>
          </button>
        ))}
      </div>

      {/* Manual open prompt */}
      <div className="mt-4 pt-3 border-t border-gold/15 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{T(lang, '亦可自定義向大師提問', 'Or type your own custom question')}</span>
        <button
          onClick={() => setShape('expanded')}
          className="text-gold/80 hover:text-gold transition-colors font-medium cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>{T(lang, '展開大師對話', 'Open Master Chat')}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </motion.div>
  )
}
