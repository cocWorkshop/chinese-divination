'use client'

import { useState, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from 'react'
import toast from 'react-hot-toast'
import { catchAndReport } from '@/lib/errorReporter'
import {
  T,
  type DivinationFormState,
  type FamilyMember,
  type SelfProfile,
  type CreditsInfo,
} from '../constants'

interface InitDeps {
  session: unknown
  type: string
  lang: string
  setForm: Dispatch<SetStateAction<DivinationFormState>>
  setBirthLat: Dispatch<SetStateAction<number | null>>
  setBirthLng: Dispatch<SetStateAction<number | null>>
  selfProfileRef: MutableRefObject<SelfProfile | null>
  paramsHydratedRef: MutableRefObject<boolean>
}

/**
 * Unified init fetch — pulls profile, credits, share bonus and family
 * members from /api/init in one round-trip, surfaces the daily-login
 * bonus toast, and auto-fills bazi/ziwei birth info from the saved
 * profile (unless the form was already hydrated from CTA query params).
 */
export function useDivinationInit({
  session, type, lang, setForm, setBirthLat, setBirthLng, selfProfileRef, paramsHydratedRef,
}: InitDeps) {
  const [credits, setCredits] = useState<CreditsInfo | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [shareBonus, setShareBonus] = useState<{ divination: number, chat: number } | null>(null)
  const [llmTimeoutMs, setLlmTimeoutMs] = useState(240000)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!session) return
    fetch('/api/init')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return

        // Daily bonus toast
        if (data.dailyBonusGranted && data.dailyBonus) {
          const c = data.dailyBonus.credits
          toast.success(T(lang, `每日登入獎勵：+${c} 點機緣`, `Daily login bonus: +${c} Karma`), { duration: 4000 })
        }

        // Credits
        if (data.credits) {
          setCredits(data.credits)
          if (data.credits.llmTimeoutSeconds) setLlmTimeoutMs(data.credits.llmTimeoutSeconds * 1000)
        }

        // Share bonus
        if (data.shareBonus) setShareBonus(data.shareBonus)

        // Family members
        if (data.familyMembers) setFamilyMembers(data.familyMembers)

        // Profile auto-fill (bazi & ziwei only). Skipped when the form has
        // already been hydrated from CTA query params — otherwise we would
        // overwrite prefilled values (e.g. a father's birth info) with the
        // authenticated user's own profile.
        if (!profileLoaded && ['bazi', 'ziwei'].includes(type) && data.profile && !paramsHydratedRef.current) {
          const p = data.profile
          setForm(f => ({
            ...f,
            birthDate:  p.birthDate  || f.birthDate,
            birthTime:  p.birthTime  || f.birthTime,
            birthPlace: p.birthPlace || f.birthPlace,
            gender:     p.gender     || f.gender,
            lunarToggle: p.calendarType || f.lunarToggle,
            timeMode:   p.timeMode   || f.timeMode,
            exactTime:  p.exactTime  || f.exactTime,
            birthEnvironment: p.birthEnvironment || f.birthEnvironment,
          }))
          if (p.birthLat != null) setBirthLat(p.birthLat)
          if (p.birthLng != null) setBirthLng(p.birthLng)
          selfProfileRef.current = {
            birthDate: p.birthDate || '',
            birthTime: p.birthTime || '',
            birthPlace: p.birthPlace || '',
            gender: p.gender || '',
            lunarToggle: p.calendarType || 'solar',
            timeMode: p.timeMode || 'fuzzy',
            exactTime: p.exactTime || '',
            birthEnvironment: p.birthEnvironment || '',
            birthLat: p.birthLat ?? null,
            birthLng: p.birthLng ?? null,
          }
          setProfileLoaded(true)
          if (p.birthDate || p.birthTime) {
            toast.success(T(lang, '已從檔案自動填充生辰資訊', 'Profile info auto-filled'))
          }
        }
      })
      .catch(catchAndReport('/api/init'))
    // refs + useState setters are identity-stable — listing them satisfies
    // exhaustive-deps without changing when the effect runs.
  }, [session, type, profileLoaded, lang, paramsHydratedRef, selfProfileRef, setBirthLat, setBirthLng, setForm])

  return {
    credits, setCredits,
    familyMembers, setFamilyMembers,
    shareBonus,
    llmTimeoutMs,
  }
}

export type UseDivinationInit = ReturnType<typeof useDivinationInit>
