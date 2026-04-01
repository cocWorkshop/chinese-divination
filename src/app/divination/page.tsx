'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DivinationIcon } from '@/components/DivinationIcons'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import MasterEntry from '@/components/MasterEntry'
import MasterChat from '@/components/MasterChat'

const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

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

const categoryColors: Record<string, string> = {
  bazi: "rgba(212,175,55,0.06)",
  ziwei: "rgba(212,175,55,0.06)",
  liuyao: "rgba(100,149,237,0.06)",
  iching: "rgba(100,149,237,0.06)",
  qimen: "rgba(147,112,219,0.06)",
  meihua: "rgba(147,112,219,0.06)",
  fengshui: "rgba(76,175,80,0.06)",
}

// Map visibility type keys to route ids
const routeIdMap: Record<string, string> = {}
const getRouteId = (type: string) => routeIdMap[type] || type

interface WelcomeItem {
  zh: string
  en: string
  recommendType: string | null
}

export default function DivinationPage() {
  const { lang } = useLang()
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [visibleServices, setVisibleServices] = useState<{ id: string; symbol: string; twName: string; enName: string; twDesc: string; enDesc: string }[]>([])
  const [masterMode, setMasterMode] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [welcomeMessages, setWelcomeMessages] = useState<WelcomeItem[]>([])
  const [welcomeIndex, setWelcomeIndex] = useState(0)
  const langShort = lang === 'en' ? 'en' : 'zh'

  useEffect(() => {
    if (session?.user) {
      fetch('/api/profile')
        .then(r => r.json())
        .then(data => { if (data.isAdmin) setIsAdmin(true) })
        .catch(() => {})
    }
  }, [session])

  useEffect(() => {
    if (searchParams.get('master') === 'true' && isAdmin) {
      setMasterMode(true)
    }
  }, [searchParams, isAdmin])

  useEffect(() => {
    fetch('/api/welcome')
      .then(r => r.json())
      .then((data: { messages?: WelcomeItem[] }) => {
        if (data.messages && data.messages.length > 0) {
          setWelcomeMessages(data.messages)
        }
      })
      .catch(() => {})
  }, [])

  // Auto-rotate welcome messages every 6 seconds
  useEffect(() => {
    if (welcomeMessages.length <= 1) return
    const timer = setInterval(() => {
      setWelcomeIndex(prev => (prev + 1) % welcomeMessages.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [welcomeMessages.length])

  useEffect(() => {
    fetch('/api/divination/visibility')
      .then(r => r.json())
      .then((items: VisibilityItem[]) => {
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

  const handleClick = (svcId: string, _e: React.MouseEvent) => {
    router.push(`/divination/${svcId}`)
  }

  return (
    <div className="py-8 sm:py-12 px-3 sm:px-4 max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        {masterMode ? (
          <motion.div
            key="master-chat"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <MasterChat onClose={() => setMasterMode(false)} lang={langShort} />
          </motion.div>
        ) : (
          <motion.div
            key="services-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Title — always at the top */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <h1 className="text-3xl sm:text-4xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
                {lang === 'zh-TW' ? '選擇占卜方式' : 'Choose Your Oracle'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {lang === 'zh-TW' ? '六大傳統命理體系，AI深度解讀' : 'Six classical systems, powered by AI'}
              </p>
            </motion.div>

            {/* Welcome carousel */}
            {welcomeMessages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                className="glass-card rounded-2xl p-4 sm:p-5 mb-8 max-w-2xl mx-auto relative overflow-hidden"
                style={{ borderColor: 'var(--border-gold)', borderWidth: '1px' }}
              >
                <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
                <div className="relative min-h-[3.5rem]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={welcomeIndex}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="text-sm sm:text-base leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {lang === 'en' ? welcomeMessages[welcomeIndex].en : welcomeMessages[welcomeIndex].zh}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    {(() => {
                      const rec = welcomeMessages[welcomeIndex]?.recommendType
                      if (!rec || !serviceMap[rec]) return null
                      return (
                        <button
                          onClick={() => router.push(`/divination/${rec}`)}
                          className="text-sm font-semibold px-4 py-1.5 rounded-xl transition-all hover:scale-105 hover:shadow-lg"
                          style={{ backgroundColor: 'rgba(var(--gold-rgb, 212,168,83), 0.15)', color: 'var(--gold)', border: '1px solid var(--border-gold)' }}
                        >
                          {lang === 'en'
                            ? `Try ${serviceMap[rec].enName} →`
                            : `試試${serviceMap[rec].twName} →`}
                        </button>
                      )
                    })()}
                  </div>
                  {welcomeMessages.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setWelcomeIndex(prev => (prev - 1 + welcomeMessages.length) % welcomeMessages.length)}
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        ‹
                      </button>
                      <div className="flex gap-1">
                        {welcomeMessages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setWelcomeIndex(i)}
                            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                            style={{ backgroundColor: i === welcomeIndex ? 'var(--gold)' : 'var(--text-muted)', opacity: i === welcomeIndex ? 1 : 0.3, transform: i === welcomeIndex ? 'scale(1.3)' : 'scale(1)' }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setWelcomeIndex(prev => (prev + 1) % welcomeMessages.length)}
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {visibleServices.map((svc, i) => (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <div
                    onClick={(e) => handleClick(svc.id, e)}
                    className="glass-card rounded-2xl p-5 sm:p-6 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                    style={{ borderColor: 'var(--card-border)', background: categoryColors[svc.id] || undefined }}
                  >
                    {svc.id === "bazi" && (
                      <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full font-medium animate-pulse" style={{ background: "var(--gold)", color: "#1a1a2e" }}>
                        {lang === "en" ? "Popular" : "推薦"}
                      </span>
                    )}
                    <div className="text-4xl sm:text-5xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">{svc.symbol}</div>
                    <h2 className="text-lg sm:text-xl font-serif mb-1.5 transition-colors group-hover:text-gold" style={{ color: 'var(--gold)' }}>
                      {lang === 'en' ? svc.enName : svc.twName}
                    </h2>
                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {lang === 'en' ? svc.enDesc : svc.twDesc}
                    </p>
                    <div className="mt-3 text-sm flex items-center gap-1 transition-all group-hover:gap-2" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                      {lang === 'zh-TW' ? '開始占卜' : 'Start'} <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                    {/* Subtle hover glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(212,168,83,0.05)' }} />
                  </div>
                </motion.div>
              ))}
            </div>

            <MasterEntry
              isAdmin={isAdmin}
              onEnter={() => setMasterMode(true)}
              lang={langShort}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
