'use client'

import { motion } from 'framer-motion'
import { useDivination } from '../DivinationContext'
import { T } from '../constants'
import { PAIPAN_EXPLANATION } from '../../guidanceConfig'
import HelpTooltip from '@/components/HelpTooltip'
import BaziForm from './BaziForm'
import ZiweiForm from './ZiweiForm'
import IChingForm from './IChingForm'
import LiuYaoForm from './LiuYaoForm'
import QimenForm from './QimenForm'
import FengshuiForm from './FengshuiForm'
import MeihuaForm from './MeihuaForm'
import OtherForm from './OtherForm'
import TargetPersonSelect from './TargetPersonSelect'
import CreditsDisplay from './CreditsDisplay'
import PrivacySettings from './PrivacySettings'
import SubmitButton from './SubmitButton'

const PAIPAN_TYPES = ['bazi', 'ziwei', 'qimen', 'meihua']

function PerTypeFields({ type }: { type: string }) {
  switch (type) {
    case 'bazi': return <BaziForm />
    case 'iching': return <IChingForm />
    case 'liuyao': return <LiuYaoForm />
    case 'ziwei': return <ZiweiForm />
    case 'qimen': return <QimenForm />
    case 'fengshui': return <FengshuiForm />
    case 'meihua': return <MeihuaForm />
    case 'other': return <OtherForm />
    default: return null
  }
}

/**
 * Stage 1 — the input form. Composes the mode switch, target-person
 * selector, per-type fields, credits, privacy controls and submit button.
 * Dispatches the per-type section via PerTypeFields (mirrors ResultRenderer).
 */
export default function DivinationForm() {
  const { type, lang, paipanOnly, setPaipanOnly, handleSubmit } = useDivination()

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit}
      className="oriental-sanctuary-card rounded-2xl p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-xl"
    >
      {/* Mode switch — Full Reading vs Chart Only. Shown to everyone; the
          auth check happens on submit. */}
      {PAIPAN_TYPES.includes(type) && (
        <div className="flex items-center justify-center gap-2 mx-auto w-fit">
          <div className="flex rounded-full border overflow-hidden w-fit" style={{ borderColor: 'var(--border-gold)' }}>
            <button type="button" onClick={() => setPaipanOnly(false)}
              className={`px-4 sm:px-4 py-2 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors cursor-pointer ${!paipanOnly ? 'bg-gold text-navy-950' : ''}`}
              style={paipanOnly ? { color: 'var(--text-muted)' } : {}}
            >{T(lang, PAIPAN_EXPLANATION.fullReadingLabel.zh, PAIPAN_EXPLANATION.fullReadingLabel.en)}</button>
            <button type="button" onClick={() => setPaipanOnly(true)}
              className={`px-4 sm:px-4 py-2 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors cursor-pointer ${paipanOnly ? 'bg-gold text-navy-950' : ''}`}
              style={!paipanOnly ? { color: 'var(--text-muted)' } : {}}
            >{T(lang, PAIPAN_EXPLANATION.buttonLabel.zh, PAIPAN_EXPLANATION.buttonLabel.en)}</button>
          </div>
          <HelpTooltip
            content={T(lang, PAIPAN_EXPLANATION.tooltip.zh, PAIPAN_EXPLANATION.tooltip.en)}
            title={T(lang, '只排盤模式說明', 'Chart Only Mode Note')}
          />
        </div>
      )}

      {/* Target Person Selection — bazi/ziwei only */}
      {['bazi', 'ziwei'].includes(type) && <TargetPersonSelect />}

      {/* Per-type fields */}
      <PerTypeFields type={type} />

      {/* Karma balance */}
      <CreditsDisplay />

      {/* Privacy controls */}
      <PrivacySettings />

      <SubmitButton />
    </motion.form>
  )
}
