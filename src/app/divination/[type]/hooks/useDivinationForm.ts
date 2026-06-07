'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { POPULAR_CITIES } from '@/lib/cities'
import { T, type DivinationFormState, type SelfProfile } from '../constants'

/**
 * Owns all form-field state for the divination flow plus the one-time
 * query-param hydration (used when the Xuanji Master CTA redirects here
 * with prefilled fields). Self-contained — server data (credits, family
 * members, profile auto-fill) lives in useDivinationInit.
 */
export function useDivinationForm(type: string, lang: string) {
  const searchParams = useSearchParams()

  const [form, setForm] = useState<DivinationFormState>({
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: '',
    question: '',
    hexagram: '',
    direction: '',
    yearBuilt: '',
    ownerInfo: '',
    readingDateTime: (() => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })(),
    liuyaoLines: '', // JSON string of 6 lines, each {coins: [0|1, 0|1, 0|1], value: 6|7|8|9}
    ichingLines: '', // same shape as liuyaoLines — proper three-coin cast (replaces legacy single-number `hexagram` field)
    subType: 'meihua',
    lunarToggle: 'solar',
    birthEnvironment: '',
    timeMode: 'fuzzy',
    exactTime: '',
  })

  const [saveProfile, setSaveProfile] = useState(true)
  const [saveHistory, setSaveHistory] = useState(true)
  const [paipanOnly, setPaipanOnly] = useState(false)
  const [targetType, setTargetType] = useState<'self' | 'family'>('self')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [newMemberRelation, setNewMemberRelation] = useState('')
  const [newMemberRelationDetail, setNewMemberRelationDetail] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [birthLat, setBirthLat] = useState<number | null>(null)
  const [birthLng, setBirthLng] = useState<number | null>(null)
  const [isSouthernHemisphere, setIsSouthernHemisphere] = useState(false)

  const selfProfileRef = useRef<SelfProfile | null>(null)
  // True once the query-param hydration effect has seeded the form from
  // the master's CTA card. Used to prevent /api/init's profile auto-fill
  // from clobbering hydrated values (especially when target=family).
  const paramsHydratedRef = useRef(false)

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Reset the cast (used by 重新起卦 button on iching panel).
  const resetIchingCast = () => {
    setField('ichingLines', '')
    setField('hexagram', '')
  }

  // Query-param hydration — runs once on mount. Used by the master's
  // prefill_divination_form tool to seed the form when the user is
  // redirected here from a CTA card in the Xuanji Master chat.
  useEffect(() => {
    if (paramsHydratedRef.current) return
    if (!searchParams || searchParams.toString() === '') return
    paramsHydratedRef.current = true

    const updates: Record<string, string> = {}
    const formKeys = [
      'birthDate', 'birthTime', 'exactTime', 'timeMode', 'birthPlace',
      'gender', 'question',
    ] as const
    for (const k of formKeys) {
      const v = searchParams.get(k)
      if (v) updates[k] = v
    }
    // calendarType → lunarToggle field
    const ct = searchParams.get('calendarType')
    if (ct) updates.lunarToggle = ct
    if (Object.keys(updates).length > 0) {
      setForm(f => ({ ...f, ...updates }))
    }

    // Resolve birthPlace to lat/lng from the POPULAR_CITIES preset list.
    // Without this, submission with timeMode=precise fails the birthLat
    // null-check because BirthplaceInput only sets lat/lng when a user
    // manually picks from the search dropdown. For cities not in presets,
    // the user can still edit the birthplace field to pick from search.
    const bp = updates.birthPlace
    if (bp) {
      const q = bp.trim().toLowerCase()
      const match =
        POPULAR_CITIES.find((c) => c.name_zh === bp.trim() || c.name_en.toLowerCase() === q) ??
        POPULAR_CITIES.find((c) => bp.includes(c.name_zh) || q.includes(c.name_en.toLowerCase()))
      if (match) {
        setBirthLat(match.lat)
        setBirthLng(match.lon)
      }
    }

    // Target (self / family) and family member selection
    const target = searchParams.get('target')
    if (target === 'family') {
      setTargetType('family')
      const fid = searchParams.get('familyMemberId')
      if (fid) setSelectedMemberId(fid)
      if (fid === '__new__') {
        const rel = searchParams.get('relation')
        if (rel) setNewMemberRelation(rel)
        const relDetail = searchParams.get('relationDetail')
        if (relDetail) setNewMemberRelationDetail(relDetail)
        const nm = searchParams.get('memberName')
        if (nm) setNewMemberName(nm)
      }
    } else if (target === 'self') {
      setTargetType('self')
    }

    if (Object.keys(updates).length > 0 || target) {
      toast(T(lang, '已從玄機大師對話中自動填入資訊', 'Fields pre-filled from Master Xuanji'), { icon: '✨', duration: 3000 })
    }
  }, [searchParams, lang])

  return {
    form, setForm, setField,
    saveProfile, setSaveProfile,
    saveHistory, setSaveHistory,
    paipanOnly, setPaipanOnly,
    targetType, setTargetType,
    selectedMemberId, setSelectedMemberId,
    newMemberRelation, setNewMemberRelation,
    newMemberRelationDetail, setNewMemberRelationDetail,
    newMemberName, setNewMemberName,
    birthLat, setBirthLat,
    birthLng, setBirthLng,
    isSouthernHemisphere, setIsSouthernHemisphere,
    selfProfileRef,
    paramsHydratedRef,
    resetIchingCast,
  }
}

export type UseDivinationForm = ReturnType<typeof useDivinationForm>
