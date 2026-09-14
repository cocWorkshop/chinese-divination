'use client'

import { useRouter } from 'next/navigation'
import { NoticeIcon, LockSealIcon } from '@/components/DivinationIcons'
import { useDivination } from '../DivinationContext'
import { T } from '../constants'

/**
 * The form's primary action. Shows a "go to Karma shop" CTA when the user
 * lacks enough credits (and isn't in free paipanOnly mode), otherwise the
 * submit button with type-specific disabled rules (six lines required for
 * iching/liuyao, southern hemisphere blocked for bazi/ziwei).
 */
export default function SubmitButton() {
  const router = useRouter()
  const { type, lang, session, credits, paipanOnly, form, isSouthernHemisphere } = useDivination()

  const remaining = credits?.credits ?? credits?.divination?.remaining ?? 0
  const cost = credits?.costs?.[type] ?? 5
  const isAdmin = remaining === 999
  const hasEnough = isAdmin || paipanOnly || remaining >= cost

  if (session && credits && !isAdmin && !paipanOnly && !hasEnough) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => router.push('/subscribe')}
          className="w-full py-4 min-h-[48px] rounded-xl font-serif font-bold text-base sm:text-lg transition-all bg-gradient-to-r from-amber-600 via-gold to-amber-500 text-navy-950 hover:brightness-110 shadow-lg shadow-amber-600/20 active:scale-[0.99]"
        >
          {T(lang, `機緣不足（需要 ${cost}）· 前往機緣商店 →`, `Not enough Karma (need ${cost}) · Karma Shop →`)}
        </button>
        <p className="text-xs text-center flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <NoticeIcon className="w-3.5 h-3.5 text-gold flex-shrink-0" />
          <span>
            {T(lang,
              '每日登入 +2 | 分享給朋友 +機緣 | 更多方式見機緣商店',
              'Daily login +2 | Share with friends | More at Credits Store'
            )}
          </span>
        </p>
      </div>
    )
  }

  return (
    <button
      type="submit"
      disabled={(isSouthernHemisphere && ['bazi', 'ziwei'].includes(type)) || (type === 'liuyao' && (!form.liuyaoLines || (JSON.parse(form.liuyaoLines || '[]')).length < 6)) || (type === 'iching' && (!form.ichingLines || (JSON.parse(form.ichingLines || '[]')).length < 6))}
      className="w-full py-4 min-h-[48px] bg-gradient-to-r from-gold via-gold-light to-gold text-navy-950 rounded-xl font-serif font-bold text-base sm:text-lg hover:brightness-105 active:scale-[0.99] transition-all shadow-lg shadow-gold/15 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2"
    >
      {!session ? (
        <>
          <LockSealIcon className="w-4 h-4 text-navy-950" />
          <span>{T(lang, '登入並解卦 →', 'Sign in & Consult →')}</span>
        </>
      ) : paipanOnly ? (
        <span>{T(lang, '排盤 →', 'Calculate →')}</span>
      ) : !isAdmin ? (
        <span>{`${T(lang, '解卦', 'Consult Oracle')} (${cost} ${T(lang, '點', 'pts')}) →`}</span>
      ) : (
        <span>{T(lang, '解卦 →', 'Consult Oracle →')}</span>
      )}
    </button>
  )
}
