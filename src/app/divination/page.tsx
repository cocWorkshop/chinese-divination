'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import StarField from '@/components/StarField'
import MasterEntryCard from './MasterEntryCard'

interface VisibilityItem {
  type: string
  visible: boolean
  order: number
}

const serviceMap: Record<string, { symbol: string; twName: string; enName: string; twDesc: string; enDesc: string }> = {
  bazi: { symbol: '🏛️', twName: '八字命理', enName: 'BaZi (Four Pillars)', twDesc: '以生辰八字為基礎，分析命主的命運走向、性格特點、事業財運與婚姻', enDesc: 'Analyze destiny through birth date and time — career, wealth, relationships and personality' },
  liuyao: { symbol: '🪙', twName: '六爻占卜', enName: 'Liu Yao Divination', twDesc: '以銅錢搖卦起六爻，配合六親、世應、用神，精準斷事吉凶', enDesc: 'Cast hexagrams with coins, analyze six lines with six relatives for precise event prediction' },
  iching: { symbol: '📖', twName: '易經占卜', enName: 'I Ching Oracle', twDesc: '通過六十四卦解讀當下疑惑，洞察事物發展趨勢，指引前行方向', enDesc: 'Consult the 64 hexagrams for insight on current situations and future trends' },
  ziwei: { symbol: '⭐', twName: '紫微斗數', enName: 'Zi Wei Dou Shu', twDesc: '以出生時間排列星盤，分析十二宮位，全面揭示人生各方面的吉凶', enDesc: 'Birth chart of stars across 12 palaces — a comprehensive life analysis system' },
  qimen: { symbol: '🧭', twName: '奇門遁甲', enName: 'Qi Men Dun Jia', twDesc: '古代最高級預測術，用於擇時、選地、謀事，把握最佳時機', enDesc: 'Advanced divination for timing decisions, choosing directions, and strategic planning' },
  fengshui: { symbol: '🏯', twName: '風水佈局', enName: 'Feng Shui', twDesc: '分析居所風水格局，優化環境氣場，助旺家宅運勢與健康財運', enDesc: 'Analyze your home or office layout to optimize energy flow and improve luck' },
  meihua: { symbol: '🌸', twName: '梅花易數', enName: 'Plum Blossom', twDesc: '以數起卦，體用生克，精準預測具體事項', enDesc: 'Plum Blossom numerology for precise event prediction' },
}

// Map visibility type keys to route ids
const routeIdMap: Record<string, string> = {}
const getRouteId = (type: string) => routeIdMap[type] || type

export default function DivinationPage() {
  const { lang } = useLang()
  const [visibleServices, setVisibleServices] = useState<{ id: string; symbol: string; twName: string; enName: string; twDesc: string; enDesc: string }[]>([])
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
    <div className="relative flex-1 bg-navy-950">
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
            {/* Title — hidden on mobile (the divination grid is self-explanatory
                at small widths and the heading just eats vertical space). */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden sm:block text-center mb-6"
            >
              <h1 className="text-2xl sm:text-3xl font-serif" style={{ color: 'var(--gold)' }}>
                {lang === 'zh-TW' ? '選擇占卜' : 'Choose Your Oracle'}
              </h1>
            </motion.div>

            {/* Master Xuanji Entrance */}
            <MasterEntryCard />

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {visibleServices.map((svc, i) => (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <Link
                    href={`/divination/${svc.id}`}
                    className="glass-card rounded-2xl p-5 sm:p-6 h-full w-full text-left block hover:shadow-2xl hover:shadow-gold/10 hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                    style={{ borderColor: 'rgba(212, 168, 83, 0.16)' }}
                  >
                    {svc.id === "bazi" && (
                      <span className="absolute top-3 right-3 text-[10px] px-2.5 py-0.5 rounded-full font-serif font-medium border border-gold/30 bg-gold/15 text-gold-light tracking-wider">
                        {lang === "en" ? "Popular" : "推薦"}
                      </span>
                    )}
                    <div className="text-4xl sm:text-5xl mb-3 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2">{svc.symbol}</div>
                    <h2 className="text-lg sm:text-xl font-serif mb-1.5 transition-colors group-hover:text-gold" style={{ color: 'var(--gold)' }}>
                      {lang === 'en' ? svc.enName : svc.twName}
                    </h2>
                    <p className="text-xs sm:text-sm leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                      {lang === 'en' ? svc.enDesc : svc.twDesc}
                    </p>
                    <div className="flex items-center justify-between">
                      {costs[svc.id] != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-serif" style={{ background: 'rgba(212,175,55,0.08)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.18)' }}>
                          <span>✧</span>
                          <span>{costs[svc.id]} {lang === 'en' ? 'pts' : '點機緣'}</span>
                        </span>
                      )}
                      <span className="text-gold/40 group-hover:text-gold transition-colors text-sm font-sans">→</span>
                    </div>

                    {/* Subtle hover glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(212,168,83,0.05)' }} />
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
