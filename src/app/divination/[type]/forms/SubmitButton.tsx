'use client'

import { useRouter } from 'next/navigation'
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
          className="w-full py-4 rounded-xl font-semibold text-lg transition-colors bg-gradient-to-r from-amber-600 to-gold text-navy-950 hover:opacity-90"
        >
          {T(lang, `機緣不足（需要 ${cost}）· 前往機緣商店 →`, `Not enough Karma (need ${cost}) · Karma Shop →`)}
        </button>
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          {T(lang,
            '💡 每日登入 +2 | 分享給朋友 +機緣 | 更多方式見機緣商店',
            '💡 Daily login +2 | Share with friends | More at Credits Store'
          )}
        </p>
      </div>
    )
  }

  return (
    <button
      type="submit"
      disabled={(isSouthernHemisphere && ['bazi', 'ziwei'].includes(type)) || (type === 'liuyao' && (!form.liuyaoLines || (JSON.parse(form.liuyaoLines || '[]')).length < 6)) || (type === 'iching' && (!form.ichingLines || (JSON.parse(form.ichingLines || '[]')).length < 6))}
      className="w-full py-4 bg-gold text-navy-950 rounded-xl font-semibold text-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {!session
        ? T(lang, '🔒 登入並解卦 →', '🔒 Sign in & Consult →')
        : paipanOnly
          ? T(lang, '排盤 →', 'Calculate →')
          : (!isAdmin
            ? `${T(lang, '解卦', 'Consult Oracle')} (${cost} ${T(lang, '點', 'pts')}) →`
            : T(lang, '解卦 →', 'Consult Oracle →'))
      }
    </button>
  )
}
