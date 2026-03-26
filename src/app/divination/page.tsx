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
  bazi: { symbol: '☰', twName: '八字命理', enName: 'BaZi (Four Pillars)', twDesc: '以生辰八字為基礎，分析命主的命運走向、性格特點、事業財運與婚姻', enDesc: 'Analyze destiny through birth date and time — career, wealth, relationships and personality' },
  liuyao: { symbol: '☯', twName: '六爻占卜', enName: 'Liu Yao Divination', twDesc: '以銅錢搖卦起六爻，配合六親、世應、用神，精準斷事吉凶', enDesc: 'Cast hexagrams with coins, analyze six lines with six relatives for precise event prediction' },
  iching: { symbol: '☯', twName: '易經占卜', enName: 'I Ching Oracle', twDesc: '通過六十四卦解讀當下疑惑，洞察事物發展趨勢，指引前行方向', enDesc: 'Consult the 64 hexagrams for insight on current situations and future trends' },
  ziwei: { symbol: '⭐', twName: '紫微斗數', enName: 'Zi Wei Dou Shu', twDesc: '以出生時間排列星盤，分析十二宮位，全面揭示人生各方面的吉凶', enDesc: 'Birth chart of stars across 12 palaces — a comprehensive life analysis system' },
  qimen: { symbol: '⚡', twName: '奇門遁甲', enName: 'Qi Men Dun Jia', twDesc: '古代最高級預測術，用於擇時、選地、謀事，把握最佳時機', enDesc: 'Advanced divination for timing decisions, choosing directions, and strategic planning' },
  fengshui: { symbol: '🏯', twName: '風水佈局', enName: 'Feng Shui', twDesc: '分析居所風水格局，優化環境氣場，助旺家宅運勢與健康財運', enDesc: 'Analyze your home or office layout to optimize energy flow and improve luck' },
  meihua: { symbol: '🌸', twName: '梅花易數', enName: 'Plum Blossom', twDesc: '以數起卦，體用生克，精準預測具體事項', enDesc: 'Plum Blossom numerology for precise event prediction' },
}

// Map visibility type keys to route ids
const routeIdMap: Record<string, string> = {}
const getRouteId = (type: string) => routeIdMap[type] || type

export default function DivinationPage() {
  const { lang } = useLang()
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [visibleServices, setVisibleServices] = useState<{ id: string; symbol: string; twName: string; enName: string; twDesc: string; enDesc: string }[]>([])
  const [masterMode, setMasterMode] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MasterChat onClose={() => setMasterMode(false)} lang={langShort} />
          </motion.div>
        ) : (
          <motion.div
            key="services-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {lang === 'zh-TW' ? '選擇占卜方式' : 'Choose Your Oracle'}
              </h1>
              <p style={{ color: 'var(--text-muted)' }}>
                {lang === 'zh-TW' ? '六大傳統命理體系，AI深度解讀' : 'Six classical systems, powered by AI'}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleServices.map((svc, i) => (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div
                    onClick={(e) => handleClick(svc.id, e)}
                    className="glass-card rounded-2xl p-5 sm:p-8 h-full hover:shadow-xl transition-all group cursor-pointer relative"
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    <div className="text-5xl mb-4">{svc.symbol}</div>
                    <h2 className="text-xl font-serif mb-2 transition-colors" style={{ color: 'var(--gold)' }}>
                      {lang === 'en' ? svc.enName : svc.twName}
                    </h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {lang === 'en' ? svc.enDesc : svc.twDesc}
                    </p>
                    <div className="mt-4 text-sm flex items-center gap-1 transition-colors" style={{ color: 'var(--text-muted)' }}>
                      {lang === 'zh-TW' ? '開始占卜' : 'Start'} →
                    </div>
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
