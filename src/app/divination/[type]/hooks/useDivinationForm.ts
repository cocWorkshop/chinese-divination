'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { POPULAR_CITIES } from '@/lib/cities'
import { T, type DivinationFormState, type SelfProfile } from '../constants'
import { shouldHydrateFromQuery } from './queryHydration'

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
    meihuaMethod: 'numbers',
    num1: '',
    num2: '',
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
  // True after the user has actually typed/selected something — gates the
  // draft autosave so the initial (empty / profile-auto-filled) state never
  // overwrites a stored draft.
  const userEditedRef = useRef(false)
  const draftKey = `divinationDraft:${type}`

  const setField = (k: string, v: string) => {
    userEditedRef.current = true
    setForm(f => ({ ...f, [k]: v }))
  }

  // Reset the cast (used by 重新起卦 button on iching panel).
  const resetIchingCast = () => {
    setField('ichingLines', '')
    setField('hexagram', '')
  }

  // Draft restore — runs once on mount, BEFORE query-param hydration is
  // considered (params win: CTA prefill / retry carry explicit intent).
  // Drafts are written by the debounced autosave below and cleared on
  // successful submission (useDivinationStream) — so an abandoned tab or a
  // mid-form crash no longer costs the user their inputs.
  useEffect(() => {
    if (searchParams && searchParams.toString() !== '') return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const saved = JSON.parse(raw) as { ts?: number; form?: Partial<DivinationFormState> }
      if (!saved?.form || Date.now() - (saved.ts || 0) > 24 * 3600 * 1000) {
        localStorage.removeItem(draftKey)
        return
      }
      // readingDateTime intentionally NOT restored — a stale event time is
      // worse than the fresh "now" default for event-based casts.
      const updates: Record<string, string> = {}
      for (const [k, v] of Object.entries(saved.form)) {
        if (k !== 'readingDateTime' && typeof v === 'string' && v) updates[k] = v
      }
      if (Object.keys(updates).length === 0) return
      setForm(f => ({ ...f, ...updates }))
      paramsHydratedRef.current = true // keep /api/init auto-fill from clobbering the draft
      toast(T(lang, '已恢復未完成的表單草稿', 'Restored your unfinished draft'), { duration: 3000 })
    } catch { /* corrupt draft — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced draft autosave — only after a real user edit.
  useEffect(() => {
    if (!userEditedRef.current) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ ts: Date.now(), form }))
      } catch { /* storage full / private mode — non-fatal */ }
    }, 800)
    return () => clearTimeout(t)
  }, [form, draftKey])

  // Query-param hydration. Used by the master's prefill_divination_form tool
  // (CTA card) and the failed-reading retry flow. Re-runs whenever the query
  // string CHANGES — not just once — so a repeat CTA navigation to the SAME
  // /divination/[type] route (e.g. already viewing a ziwei result, master
  // emits another ziwei CTA) re-seeds the form instead of being blocked by a
  // one-time guard. The CTA carries a `_cta` nonce so the query always differs.
  const lastHydratedQueryRef = useRef<string>('')
  useEffect(() => {
    const qs = searchParams?.toString() ?? ''
    if (!shouldHydrateFromQuery(lastHydratedQueryRef.current, qs)) return
    lastHydratedQueryRef.current = qs
    paramsHydratedRef.current = true

    const updates: Record<string, string> = {}
    const formKeys = [
      'birthDate', 'birthTime', 'exactTime', 'timeMode', 'birthPlace',
      'gender', 'question',
      // Event-type fields — used by the failed-reading retry flow, which
      // re-seeds the form from the original reading's inputData.
      'readingDateTime', 'direction', 'yearBuilt', 'ownerInfo', 'hexagram',
      'meihuaMethod', 'num1', 'num2',
    ] as const
    for (const k of formKeys) {
      const v = searchParams.get(k)
      if (v) updates[k] = v
    }
    // Cast-line fields hold JSON arrays that CoinCastPanel JSON.parses during
    // render — only hydrate values that actually parse, so a hand-crafted URL
    // can't crash the form.
    for (const k of ['liuyaoLines', 'ichingLines'] as const) {
      const v = searchParams.get(k)
      if (!v) continue
      try {
        if (Array.isArray(JSON.parse(v))) updates[k] = v
      } catch { /* skip malformed */ }
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
      // Generic wording — hydration is used by both the Master CTA flow and
      // the failed-reading retry flow.
      toast(T(lang, '已自動填入先前資訊', 'Fields pre-filled'), { duration: 3000 })
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
