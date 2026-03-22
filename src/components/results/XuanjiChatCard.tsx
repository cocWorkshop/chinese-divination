'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useLang } from '../LanguageContext'

const XuanjiChat = dynamic(() => import('./XuanjiChat'), { ssr: false })

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

interface XuanjiChatCardProps {
  readingResult: string
  readingType: string
  isShared?: boolean
  delay?: number
}

export default function XuanjiChatCard({ readingResult, readingType, isShared, delay = 0.15 }: XuanjiChatCardProps) {
  const { lang } = useLang()

  if (isShared) return null

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="glass-card rounded-xl p-4 sm:p-6 border-2 border-gold/30">
        <h3 className="flex items-center gap-2 text-gold font-serif text-base sm:text-lg mb-3">
          <span className="text-xl">☯</span>
          <span className="bg-gradient-to-r from-amber-400 to-gold bg-clip-text text-transparent font-semibold">
            {T(lang, '玄機破', 'Xuanji Po')}
          </span>
        </h3>
        <XuanjiChat readingResult={readingResult} readingType={readingType} />
      </div>
    </motion.div>
  )
}
