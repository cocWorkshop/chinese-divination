'use client'

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLang } from '@/components/LanguageContext'
import { typeInfo } from './constants'
import { useDivinationForm, type UseDivinationForm } from './hooks/useDivinationForm'
import { useDivinationInit, type UseDivinationInit } from './hooks/useDivinationInit'
import { useDivinationStream, type UseDivinationStream } from './hooks/useDivinationStream'

type TypeInfo = { zhName?: string; twName?: string; enName: string; symbol: string }

interface DivinationContextValue extends
  UseDivinationForm,
  UseDivinationInit,
  UseDivinationStream {
  type: string
  lang: string
  session: ReturnType<typeof useSession>['data']
  info: TypeInfo
  handleMemberSelect: (memberId: string) => void
}

const DivinationContext = createContext<DivinationContextValue | null>(null)

export function useDivination(): DivinationContextValue {
  const ctx = useContext(DivinationContext)
  if (!ctx) throw new Error('useDivination must be used within <DivinationProvider>')
  return ctx
}

/**
 * Composes the form / init / stream hooks into one provider so the form,
 * generating, and result stages can each read exactly the slice they need
 * without prop-drilling through the page. Mirrors the master feature's
 * MasterChatContext pattern.
 */
export function DivinationProvider({ children }: { children: ReactNode }) {
  const { type } = useParams<{ type: string }>()
  const { data: session } = useSession()
  const { lang } = useLang()

  const info: TypeInfo = typeInfo[type] || { enName: 'Divination', symbol: '📖' }

  const formState = useDivinationForm(type, lang)
  const init = useDivinationInit({
    session,
    type,
    lang,
    setForm: formState.setForm,
    setBirthLat: formState.setBirthLat,
    setBirthLng: formState.setBirthLng,
    selfProfileRef: formState.selfProfileRef,
    paramsHydratedRef: formState.paramsHydratedRef,
  })
  const stream = useDivinationStream({
    type,
    lang,
    session,
    form: formState.form,
    birthLat: formState.birthLat,
    birthLng: formState.birthLng,
    isSouthernHemisphere: formState.isSouthernHemisphere,
    targetType: formState.targetType,
    selectedMemberId: formState.selectedMemberId,
    newMemberRelation: formState.newMemberRelation,
    newMemberRelationDetail: formState.newMemberRelationDetail,
    newMemberName: formState.newMemberName,
    saveProfile: formState.saveProfile,
    saveHistory: formState.saveHistory,
    paipanOnly: formState.paipanOnly,
    llmTimeoutMs: init.llmTimeoutMs,
    setCredits: init.setCredits,
  })

  // Repeat-CTA reset: when the Xuanji Master emits another CTA for the SAME
  // /divination/[type] the user is already viewing a result on, router.push is
  // a same-route no-op for the flow — so the result keeps showing and the form
  // never re-appears. Watch the query string (CTAs carry a `_cta` nonce so it
  // always changes) and, if a result / in-flight stream is showing, reset back
  // to the form stage. The form's own hydration effect re-seeds the fields.
  const searchParams = useSearchParams()
  const streamRef = useRef(stream)
  streamRef.current = stream
  const prevQueryRef = useRef<string | null>(null)
  useEffect(() => {
    const qs = searchParams?.toString() ?? ''
    const prev = prevQueryRef.current
    prevQueryRef.current = qs
    if (prev === null) return // first mount — fresh page, nothing to reset
    if (qs === '' || qs === prev) return // no new prefill navigation
    const s = streamRef.current
    if (s.result || s.hasLLMContent || s.streaming || s.loading) s.resetToForm()
  }, [searchParams])

  const handleMemberSelect = (memberId: string) => {
    formState.setSelectedMemberId(memberId)
    if (memberId && memberId !== '__new__') {
      const member = init.familyMembers.find(m => m.id === memberId)
      if (member) {
        formState.setForm(f => ({
          ...f,
          birthDate: member.birthDate || '',
          birthTime: member.birthTime || '',
          birthPlace: member.birthPlace || '',
          gender: member.gender || '',
          lunarToggle: member.calendarType || 'solar',
          timeMode: member.timeMode || 'fuzzy',
          exactTime: member.exactTime || '',
          birthEnvironment: member.birthEnvironment || '',
        }))
        // Use stored geocoded coordinates from family member if available
        formState.setBirthLat(member.birthLat ?? null)
        formState.setBirthLng(member.birthLng ?? null)
      }
    } else if (memberId === '__new__') {
      // Clear form for new member
      formState.setForm(f => ({
        ...f,
        birthDate: '',
        birthTime: '',
        birthPlace: '',
        gender: '',
        lunarToggle: 'solar',
        timeMode: 'fuzzy',
        exactTime: '',
        birthEnvironment: '',
      }))
      formState.setBirthLat(null)
      formState.setBirthLng(null)
    }
  }

  const value: DivinationContextValue = {
    ...formState,
    ...init,
    ...stream,
    type,
    lang,
    session,
    info,
    handleMemberSelect,
  }

  return (
    <DivinationContext.Provider value={value}>
      {children}
    </DivinationContext.Provider>
  )
}
