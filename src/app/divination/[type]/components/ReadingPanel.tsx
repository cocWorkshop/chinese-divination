'use client'

import ReadingResultView from '@/components/ReadingResultView'
import { useDivination } from '../DivinationContext'

/**
 * Stage 3 — the reading result. A thin adapter mapping the divination flow's
 * context onto the shared <ReadingResultView>, the exact same view the
 * saved-reading page (/reading/[id]) renders. The only differences are
 * internal: `streaming` (live flame border) and the back action (reset to
 * the form here vs navigate to history there).
 */
export default function ReadingPanel() {
  const {
    type, lang, session, result, resultType, readingId, streaming,
    form, targetType, selectedMemberId, familyMembers, resetToForm,
  } = useDivination()

  const familyMember =
    targetType === 'family' && selectedMemberId && selectedMemberId !== '__new__'
      ? (() => {
          const m = familyMembers.find(m => m.id === selectedMemberId)
          return m ? { relation: m.relation, name: m.name } : null
        })()
      : null

  const subjectName = familyMember
    ? familyMember.name || familyMember.relation
    : session?.user?.name || null

  return (
    <ReadingResultView
      type={resultType || type}
      result={result ?? '{}'}
      readingId={readingId}
      lang={lang}
      question={form.question || null}
      subjectName={subjectName}
      birthInfo={{
        birthDate: form.birthDate,
        birthTime: form.birthTime,
        gender: form.gender,
        calendarType: form.lunarToggle,
        birthPlace: form.birthPlace,
        exactTime: form.timeMode === 'precise' ? form.exactTime : undefined,
      }}
      createdAt={new Date().toISOString()}
      targetType={targetType}
      familyMember={familyMember}
      streaming={streaming}
      onBack={resetToForm}
    />
  )
}
