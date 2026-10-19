'use client'

import { LockSealIcon, AlertIcon } from '@/components/DivinationIcons'
import { useDivination } from '../DivinationContext'
import { T } from '../constants'

/**
 * Privacy controls — "save to history" and (bazi/ziwei) "save birth info
 * to profile". Collapsed by default to reduce form length. Shown to
 * everyone; the auth check happens on submit.
 */
export default function PrivacySettings() {
  const {
    type, lang,
    saveHistory, setSaveHistory,
    saveProfile, setSaveProfile,
  } = useDivination()

  return (
    <details className="oriental-sanctuary-card rounded-xl group shadow-sm">
      <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between text-gold-light/90 text-sm font-serif font-medium tracking-wide hover:text-gold transition-colors">
        <span className="flex items-center gap-1.5">
          <LockSealIcon className="w-3.5 h-3.5 text-gold" />
          <span>{T(lang, '隱私設置', 'Privacy Settings')}</span>
        </span>
        <svg className="w-4 h-4 text-gold/60 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gold/10">

      {/* Save to History */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 flex-shrink-0">
          <input
            type="checkbox"
            checked={saveHistory}
            onChange={e => setSaveHistory(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              saveHistory ? 'bg-gold border-gold' : 'bg-transparent border-line/30 group-hover:border-gold/50'
            }`}
          >
            {saveHistory && <svg className="w-3 h-3 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
          </div>
        </div>
        <div>
          <p className="text-foreground/80 text-sm font-medium leading-tight">
            {T(lang, '儲存到歷史記錄', 'Save to reading history')}
          </p>
          <p className="text-foreground/60 text-xs mt-0.5">
            {T(lang, '允許儲存本次解卦結果，可在「歷史」中查看', 'Store this reading in your history for future reference')}
          </p>
        </div>
      </label>

      {/* Save profile info — only for types with personal birth data */}
      {['bazi', 'ziwei'].includes(type) && (
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={saveProfile}
              onChange={e => setSaveProfile(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                saveProfile ? 'bg-gold border-gold' : 'bg-transparent border-line/30 group-hover:border-gold/50'
              }`}
            >
              {saveProfile && <svg className="w-3 h-3 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            </div>
          </div>
          <div>
            <p className="text-foreground/80 text-sm font-medium leading-tight">
              {T(lang, '儲存生辰資訊到我的資料', 'Save birth info to my profile')}
            </p>
            <p className="text-foreground/60 text-xs mt-0.5">
              {T(lang, '將出生日期、時辰、出生地、性別儲存至個人資料，下次自動填充', 'Store birth date, hour, place & gender in your profile for auto-fill next time')}
            </p>
          </div>
        </label>
      )}

      {(!saveHistory && !saveProfile) && (
        <p className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5 pt-1">
          <AlertIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>{T(lang, '本次占卜結果不會被儲存，請自行記錄', 'This reading will not be stored anywhere. Please note it down if needed.')}</span>
        </p>
      )}
      </div>
    </details>
  )
}
