'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import { DivinationIcon } from '@/components/DivinationIcons'
import StarField from '@/components/StarField'
import MasterEntryCard from './MasterEntryCard'
import { T } from '@/lib/i18n'

interface VisibilityItem {
  type: string
  visible: boolean
  order: number
}

const serviceMap: Record<string, { twName: string; enName: string; twDesc: string; enDesc: string }> = {
  bazi: { twName: '八字命理', enName: 'BaZi (Four Pillars)', twDesc: '以生辰八字為基礎，分析命主的命運走向、性格特點、事業財運與婚姻', enDesc: 'Analyze destiny through birth date and time — career, wealth, relationships and personality' },
  liuyao: { twName: '六爻占卜', enName: 'Liu Yao Divination', twDesc: '以銅錢搖卦起六爻，配合六親、世應、用神，精準斷事吉凶', enDesc: 'Cast hexagrams with coins, analyze six lines with six relatives for precise event prediction' },
  iching: { twName: '易經占卜', enName: 'I Ching Oracle', twDesc: '通過六十四卦解讀當下疑惑，洞察事物發展趨勢，指引前行方向', enDesc: 'Consult the 64 hexagrams for insight on current situations and future trends' },
  ziwei: { twName: '紫微斗數', enName: 'Zi Wei Dou Shu', twDesc: '以出生時間排列星盤，分析十二宮位，全面揭示人生各方面的吉凶', enDesc: 'Birth chart of stars across 12 palaces — a comprehensive life analysis system' },
  qimen: { twName: '奇門遁甲', enName: 'Qi Men Dun Jia', twDesc: '古代最高級預測術，用於擇時、選地、謀事，把握最佳時機', enDesc: 'Advanced divination for timing decisions, choosing directions, and strategic planning' },
  fengshui: { twName: '風水佈局', enName: 'Feng Shui', twDesc: '分析居所風水格局，優化環境氣場，助旺家宅運勢與健康財運', enDesc: 'Analyze your home or office layout to optimize energy flow and improve luck' },
  meihua: { twName: '梅花易數', enName: 'Plum Blossom', twDesc: '以數起卦，體用生克，精準預測具體事項', enDesc: 'Plum Blossom numerology for precise event prediction' },
}

// Map visibility type keys to route ids
const routeIdMap: Record<string, string> = {}
const getRouteId = (type: string) => routeIdMap[type] || type

export default function DivinationPage() {
  const { lang } = useLang()
  const [visibleServices, setVisibleServices] = useState<{ id: string; twName: string; enName: string; twDesc: string; enDesc: string }[]>([])
  const [costs, setCosts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/divination/visibility')
      .then(r => r.json())
      .then((items: (VisibilityItem & { cost?: number })[]) => {
        const costMap: Record<string, number> = {}
        items.forEach(item => { if (item.cost != null) costMap[item.type] = item.cost })
        setCosts(costMap)
        const ordered = items
          .filter(item => item.visible && serviceMap[item.type])
          .sort((a, b) => a.order - b.order)
          .map(item => ({
            id: getRouteId(item.type),
            ...serviceMap[item.type],
          }))
        setVisibleServices(ordered)
      })
      .catch(() => {
        setVisibleServices(Object.entries(serviceMap).map(([type, info]) => ({ id: getRouteId(type), ...info })))
      })
  }, [])

  return (
    <div className="relative flex-1 bg-background">
      <StarField />
      <div className="relative z-10 py-8 sm:py-12 px-3 sm:px-4 max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        {(
          <motion.div
            key="services-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Title — hidden on mobile */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden sm:block text-center mb-8"
            >
              <h1 className="text-2xl sm:text-3xl font-serif text-gold-light tracking-wide">
                {T(lang, '正統術數 · 叩問天機', 'Choose Your Metaphysical Oracle')}
              </h1>
              <p className="text-xs text-foreground/50 font-serif tracking-widest mt-1.5 uppercase">
                {T(lang, '六派源流 · 靜心求索', 'Classical Systems of Insight')}
              </p>
            </motion.div>

            {/* Master Xuanji Entrance */}
            <MasterEntryCard />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              {visibleServices.map((svc, i) => (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  <Link
                    href={`/divination/${svc.id}`}
                    className="oriental-sanctuary-card p-5 sm:p-6 h-full w-full text-left block hover:shadow-2xl hover:shadow-gold/15 hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                  >
                    {svc.id === "bazi" && (
                      <span className="absolute top-3 right-3 text-[10px] px-2.5 py-0.5 rounded-full font-serif font-medium border border-gold/30 bg-gold/15 text-gold-light tracking-wider">
                        {T(lang, "常叩", "Popular")}
                      </span>
                    )}
                    <div className="mb-3.5 transition-transform duration-300 group-hover:scale-105 flex items-center justify-start">
                      <DivinationIcon type={svc.id} size={42} className="text-gold" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-serif mb-1.5 transition-colors group-hover:text-gold-light text-foreground/95">
                      {T(lang, svc.twName, svc.enName)}
                    </h2>
                    <p className="text-xs sm:text-sm leading-relaxed mb-4 text-foreground/60 font-light min-h-[2.5rem]">
                      {T(lang, svc.twDesc, svc.enDesc)}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-gold/10">
                      {costs[svc.id] != null ? (
                        <span className="stamp-gold text-[10px] py-0.5 px-2 select-none">
                          ✧ {costs[svc.id]} {T(lang, '機緣', 'Karma')}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-gold/50 group-hover:text-gold transition-colors text-sm font-sans flex items-center gap-1">
                        <span className="text-xs font-serif hidden group-hover:inline-block transition-opacity">
                          {T(lang, '入局', 'Inquire')}
                        </span>
                        <span>→</span>
                      </span>
                    </div>

                    {/* Subtle hover glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(212,168,83,0.06)' }} />
                  </Link>
                </motion.div>
              ))}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
