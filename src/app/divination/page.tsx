'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DivinationIcon } from '@/components/DivinationIcons'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'

const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

const services = [
  { id: 'bazi', symbol: '☰', twName: '八字命理', enName: 'BaZi (Four Pillars)', twDesc: '以生辰八字為基礎，分析命主的命運走向、性格特點、事業財運與婚姻', enDesc: 'Analyze destiny through birth date and time — career, wealth, relationships and personality' },
  { id: 'iching', symbol: '☯', twName: '易經占卜', enName: 'I Ching Oracle', twDesc: '通過六十四卦解讀當下疑惑，洞察事物發展趨勢，指引前行方向', enDesc: 'Consult the 64 hexagrams for insight on current situations and future trends' },
  { id: 'ziwei', symbol: '⭐', twName: '紫微斗數', enName: 'Zi Wei Dou Shu', twDesc: '以出生時間排列星盤，分析十二宮位，全面揭示人生各方面的吉凶', enDesc: 'Birth chart of stars across 12 palaces — a comprehensive life analysis system' },
  { id: 'qimen', symbol: '⚡', twName: '奇門遁甲', enName: 'Qi Men Dun Jia', twDesc: '古代最高級預測術，用於擇時、選地、謀事，把握最佳時機', enDesc: 'Advanced divination for timing decisions, choosing directions, and strategic planning' },
  { id: 'fengshui', symbol: '🏯', twName: '風水佈局', enName: 'Feng Shui', twDesc: '分析居所風水格局，優化環境氣場，助旺家宅運勢與健康財運', enDesc: 'Analyze your home or office layout to optimize energy flow and improve luck' },
  { id: 'other', symbol: '🌸', twName: '梅花六壬', enName: 'Plum & Liu Ren', twDesc: '包含梅花易數與六壬神課，以數起卦或以時起課，精準預測具體事項', enDesc: 'Plum Blossom numerology and Liu Ren oracle for precise event prediction' },
]

export default function DivinationPage() {
  const { lang } = useLang()
  const { data: session } = useSession()
  const router = useRouter()
  const [tiers, setTiers] = useState<Record<string, string>>({})
  const [userRole, setUserRole] = useState<string>('arcane')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/divination-tiers').then(r => r.json()).then(setTiers).catch(() => {})
  }, [])

  useEffect(() => {
    if (!session) return
    fetch('/api/profile').then(r => r.json()).then(data => {
      if (data?.role) setUserRole(data.role)
      if (data?.isAdmin) setIsAdmin(true)
    }).catch(() => {})
  }, [session])

  const roleLevel: Record<string, number> = { admin: 3, prestige: 3, ethereal: 2, arcane: 1 }
  const tierLevel: Record<string, number> = { prestige: 3, ethereal: 2, arcane: 1 }
  const userLvl = roleLevel[userRole] || 1

  const handleClick = (svcId: string, e: React.MouseEvent) => {
    const requiredLvl = tierLevel[tiers[svcId]] || 1
    if (!isAdmin && userLvl < requiredLvl) {
      e.preventDefault()
      const tierNames: Record<string, string> = { prestige: T(lang, '大師', 'Prestige'), ethereal: T(lang, '洞察', 'Ethereal') }
      toast.error(T(lang, `此功能需要${tierNames[tiers[svcId]] || '更高'}等級`, `Requires ${tiers[svcId] || 'higher'} access`), { icon: '✦' })
      return
    }
    router.push(`/divination/${svcId}`)
  }

  return (
    <div className="min-h-screen py-12 px-4 max-w-6xl mx-auto">
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
        {services.map((svc, i) => (
          <motion.div
            key={svc.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div
              onClick={(e) => handleClick(svc.id, e)}
              className="glass-card rounded-2xl p-8 h-full hover:shadow-xl transition-all group cursor-pointer relative"
              style={{ borderColor: 'var(--card-border)' }}
            >
              {tiers[svc.id] && tiers[svc.id] !== 'arcane' && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(212, 168, 83, 0.15)', color: 'var(--gold)' }}>
                  {tiers[svc.id] === 'prestige' ? `✦ ${T(lang, '大師', 'Prestige')}` : `✧ ${T(lang, '洞察', 'Ethereal')}`}
                </span>
              )}
              <div className="mb-4"><DivinationIcon type={svc.id} size={48} /></div>
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
    </div>
  )
}
