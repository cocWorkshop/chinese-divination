'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import YinYangIcon from '@/components/YinYangIcon'
import StarField from '@/components/StarField'

interface VisibilityItem {
  type: string
  visible: boolean
  order: number
}

const serviceMap: Record<string, { symbol: string; twName: string; enName: string; twDesc: string; enDesc: string }> = {
  bazi: { symbol: '☰', twName: '八字命理', enName: 'BaZi', twDesc: '四柱八字，推演命運', enDesc: 'Four Pillars of Destiny' },
  iching: { symbol: '☯', twName: '易經占卜', enName: 'I Ching', twDesc: '六十四卦，洞察先機', enDesc: 'Book of Changes Oracle' },
  liuyao: { symbol: '☯', twName: '六爻占卜', enName: 'Liu Yao', twDesc: '銅錢搖卦，精準斷事', enDesc: 'Six Lines Divination' },
  ziwei: { symbol: '⭐', twName: '紫微斗數', enName: 'Zi Wei', twDesc: '星盤命宮，紫微護命', enDesc: 'Purple Star Astrology' },
  qimen: { symbol: '⚡', twName: '奇門遁甲', enName: 'Qi Men', twDesc: '奇門佈局，謀事在天', enDesc: 'Qi Men Dun Jia' },
  fengshui: { symbol: '🏯', twName: '風水佈局', enName: 'Feng Shui', twDesc: '藏風聚氣，宅運興旺', enDesc: 'Wind & Water Harmony' },
  meihua: { symbol: '🌸', twName: '梅花六壬', enName: 'Mei Hua', twDesc: '梅花易數·六壬神課', enDesc: 'Plum Blossom & Liu Ren' },
}

// Map visibility type keys to route ids (meihua routes to /divination/other)
const routeIdMap: Record<string, string> = { meihua: 'other' }
const getRouteId = (type: string) => routeIdMap[type] || type

export default function HomePage() {
  const { lang } = useLang()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [visibleServices, setVisibleServices] = useState<{ id: string; symbol: string; twName: string; enName: string; twDesc: string; enDesc: string }[]>([])

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
        // Fallback: show all
        setVisibleServices(Object.entries(serviceMap).map(([type, info]) => ({ id: getRouteId(type), ...info })))
      })
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/divination')
    }
  }, [status, session, router])

  return (
    <div className="flex-1 bg-navy-950">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
        <StarField />
        <div className="relative z-10 text-center px-3 sm:px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-serif text-gold mb-4" style={{ textShadow: '0 0 40px rgba(212,168,83,0.5)' }}>
              玄機
            </h1>
            <p className="text-xl md:text-2xl text-white/70 mb-2 font-serif">
              {lang === 'zh-TW' ? '古法智慧，現代傳承' : 'Ancient Wisdom, Modern Clarity'}
            </p>
            <p className="text-white/50 mb-10 max-w-xl mx-auto">
              {lang === 'zh-TW'
                ? '融匯八字、易經、紫微、奇門、風水等傳統預測學，以AI智慧為您解讀命運玄機'
                : 'BaZi, I Ching, Zi Wei, Qi Men, Feng Shui — classical divination powered by AI insight'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/divination"
              className="px-8 py-3 bg-gold text-navy-950 rounded-xl font-semibold text-lg hover:bg-gold-light transition-all shadow-lg shadow-gold/20"
            >
              {lang === 'zh-TW' ? '開始占卜' : 'Start Divination'}
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 border border-gold/50 text-gold rounded-xl font-semibold text-lg hover:border-gold hover:bg-gold/10 transition-all"
            >
              {lang === 'zh-TW' ? '免費註冊' : 'Register Free'}
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gold/50"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </section>

      {/* Services grid */}
      <section className="py-12 sm:py-20 px-3 sm:px-4 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-serif text-center text-gold mb-4"
        >
          {lang === 'zh-TW' ? '六大命理體系' : 'Six Divination Systems'}
        </motion.h2>
        <p className="text-center text-white/50 mb-12">
          {lang === 'zh-TW' ? '千年傳承，AI解讀' : 'Millennia of wisdom, AI-powered analysis'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleServices.map((svc, i) => (
            <motion.div
              key={svc.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/divination/${svc.id}`}>
                <div className="glass-card rounded-2xl p-6 hover:border-gold/50 hover:shadow-lg hover:shadow-gold/10 transition-all group cursor-pointer">
                  <div className="text-5xl mb-4"> {svc.symbol}</div>
                  <h3 className="text-xl font-serif text-gold mb-1 group-hover:text-gold-light">
                    {lang === 'en' ? svc.enName : svc.twName}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {lang === 'en' ? svc.enDesc : svc.twDesc}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="py-12 sm:py-20 px-3 sm:px-4 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl p-10"
        >
          <div className="mb-6"><YinYangIcon size={48} /></div>
          <h2 className="text-3xl font-serif text-gold mb-4">
            {lang === 'zh-TW' ? '關於玄機' : 'About Xuanji'}
          </h2>
          <p className="text-white/70 leading-relaxed mb-4">
            {lang === 'zh-TW'
              ? '玄機融合中國傳統命理學與現代AI技術，提供專業、深入的命理分析。我們傳承數千年的預測智慧，以現代語言為您解讀生命的玄機。'
              : 'Xuanji combines traditional Chinese metaphysics with modern AI to deliver professional, in-depth divination analysis. We carry forward millennia of wisdom in a format for today.'}
          </p>
          <p className="text-white/50 text-sm">
            {lang === 'zh-TW' ? '僅供參考，不構成任何決策建議' : 'For reference only. Not a substitute for professional advice.'}
          </p>
        </motion.div>
      </section>
    </div>
  )
}
