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
    <div className="relative flex-1 bg-background flex flex-col min-h-[calc(100vh-4rem)]">
      <StarField />
      {/* Oracle Cards Container: Centered vertically when height is sufficient, with bottom padding for fixed dock */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-4 sm:py-6 px-3 sm:px-4 max-w-4xl mx-auto w-full pb-32 sm:pb-36">
        <AnimatePresence mode="wait">
          <motion.div
            key="services-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col justify-center"
          >
            {/* Subtle Divider (Text removed per user request) */}
            <div className="flex items-center gap-3 mb-3 sm:mb-5 w-full px-2" aria-hidden="true">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
            </div>

            {/* Oracle Cards Grid: 2 columns on mobile, 3 columns on desktop, styled after DivinationLayout Demo */}
            <div className="w-full grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4.5">
              {visibleServices.map((svc, i) => (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                >
                  <Link
                    href={`/divination/${svc.id}`}
                    className="oriental-sanctuary-card p-3 sm:p-5 h-full w-full text-left flex flex-col justify-between hover:border-gold/45 hover:shadow-lg hover:shadow-gold/10 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer relative overflow-hidden rounded-2xl"
                  >
                    {svc.id === 'bazi' && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 rounded-full font-serif font-medium border border-gold/30 bg-gold/15 text-gold-light tracking-wider">
                        {T(lang, '常叩', 'Popular')}
                      </span>
                    )}
                    <div>
                      <div className="text-xl sm:text-2xl mb-1.5 transition-transform duration-200 group-hover:scale-105 flex items-center justify-start">
                        <DivinationIcon type={svc.id} size={26} className="text-xl sm:text-2xl" />
                      </div>
                      <h2 className="text-sm sm:text-lg font-serif font-medium text-foreground/95 group-hover:text-gold transition-colors truncate sm:overflow-visible">
                        {T(lang, svc.twName, svc.enName)}
                      </h2>
                      <p className="text-[11px] sm:text-xs text-foreground/60 font-light mt-1 line-clamp-2 leading-relaxed min-h-[2rem] sm:min-h-[2.25rem]">
                        {T(lang, svc.twDesc, svc.enDesc)}
                      </p>
                    </div>
                    <div className="pt-2 mt-2 border-t border-gold/10 flex items-center justify-between text-[10px] sm:text-xs">
                      {costs[svc.id] != null ? (
                        <span className="text-amber-300/80 font-serif select-none">
                          ✧ {costs[svc.id]} {T(lang, '機緣', 'Karma')}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-gold font-serif flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>{T(lang, '入局', 'Inquire')}</span>
                        <span>→</span>
                      </span>
                    </div>

                    {/* Subtle hover glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: 'inset 0 0 24px rgba(212,168,83,0.05)' }} />
                  </Link>
                </motion.div>
              ))}
            </div>

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Master Xuanji Entrance: Fixed at the bottom of viewport across all screen sizes, layered on top (z-30) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none pb-2 sm:pb-3 pt-6 px-3 sm:px-4 bg-gradient-to-t from-[var(--bg-primary,#070b14)] via-[var(--bg-primary,#070b14)]/95 to-transparent">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <MasterEntryCard />
        </div>
      </div>
    </div>
  )
}
