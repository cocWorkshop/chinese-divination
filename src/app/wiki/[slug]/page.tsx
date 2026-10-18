'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import BackButton from '@/components/BackButton'
import MysticalLoader from '@/components/MysticalLoader'
import { DivinationIcon } from '@/components/DivinationIcons'
import { useLang } from '@/components/LanguageContext'
import { T } from '@/lib/i18n'

const CATEGORY_LABELS: Record<string, { zh: string; en: string }> = {
  general:  { zh: '綜合易學', en: 'General' },
  bazi:     { zh: '八字命理', en: 'BaZi' },
  ziwei:    { zh: '紫微斗數', en: 'Zi Wei' },
  iching:   { zh: '易經占卜', en: 'I Ching' },
  qimen:    { zh: '奇門遁甲', en: 'Qi Men' },
  fengshui: { zh: '環境風水', en: 'Feng Shui' },
  meihua:   { zh: '梅花易數', en: 'Mei Hua' },
  liuyao:   { zh: '六爻占卜', en: 'Liu Yao' },
}

const CATEGORY_ROUTES: Record<string, { route: string; ctaZh: string; ctaEn: string; descZh: string; descEn: string }> = {
  bazi:     { route: '/bazi', ctaZh: '立即排演八字命盤', ctaEn: 'Calculate BaZi Chart', descZh: '四柱排盤，詳解陰陽五行衰旺與一生運勢', descEn: 'Analyze the Four Pillars and lifetime destiny' },
  ziwei:    { route: '/ziwei', ctaZh: '立即排演紫微星盤', ctaEn: 'Cast Zi Wei Chart', descZh: '安星布盤，洞悉十二宮位神煞星宿佈局', descEn: 'Explore your 12 palaces and star constellations' },
  iching:   { route: '/iching', ctaZh: '立即易經金錢起卦', ctaEn: 'Consult I Ching', descZh: '感應六十四卦吉凶消長，通天地玄機', descEn: 'Seek wisdom from the 64 Hexagrams' },
  qimen:    { route: '/qimen', ctaZh: '立即布列奇門遁甲', ctaEn: 'Deploy Qi Men Chart', descZh: '天地人神四盤運轉，決勝時空局象', descEn: 'Unveil celestial gates and timely opportunities' },
  fengshui: { route: '/fengshui', ctaZh: '立即勘定陽宅風水', ctaEn: 'Analyze Feng Shui', descZh: '辨九宮飛星旺衰，化煞納吉增益家運', descEn: 'Harmonize your living environment energy' },
  meihua:   { route: '/meihua', ctaZh: '立即梅花易數推演', ctaEn: 'Cast Mei Hua Divination', descZh: '心易觸機，萬物取象以明事理吉凶', descEn: 'Spontaneous divination based on synchronicity' },
  liuyao:   { route: '/liuyao', ctaZh: '立即三枚銅錢搖卦', ctaEn: 'Cast Liu Yao Coins', descZh: '擲銅錢立卦爻，專斷一事吉凶成敗', descEn: 'Cast coins for precise inquiry resolution' },
  general:  { route: '/divination', ctaZh: '進入易學占卜大廳', ctaEn: 'Enter Divination Hall', descZh: '七大易學古法，探問心中所思之境', descEn: 'Explore 7 classic Chinese divination systems' },
}

interface Article {
  slug: string
  title: string
  summary: string | null
  content: string
  category: string
  coverImage: string | null
  updatedAt: string
}

export default function WikiArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { lang } = useLang()
  const isEn = lang === 'en'
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/wiki/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setArticle(d.article); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24" style={{ background: 'var(--bg-primary)' }}>
      <MysticalLoader lang={lang} />
    </div>
  )

  if (notFound || !article) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24" style={{ background: 'var(--bg-primary)' }}>
      <p className="text-foreground/50 font-serif">{T(lang, '文章不存在或已下架', 'Article not found')}</p>
      <Link href="/wiki" className="text-sm font-serif hover:underline" style={{ color: 'var(--gold)' }}>
        ← {T(lang, '返回知識庫', 'Back to Wiki')}
      </Link>
    </div>
  )

  const catInfo = CATEGORY_LABELS[article.category] || { zh: article.category, en: article.category }
  const ctaConfig = CATEGORY_ROUTES[article.category] || CATEGORY_ROUTES.general

  return (
    <div className="flex-1 py-8 sm:py-12 pb-24 px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top Navigation & Breadcrumbs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(212,168,83,0.16)]">
          <div className="flex items-center gap-3">
            <BackButton fallbackHref="/wiki" label={T(lang, '返回知識庫', 'Back to Wiki')} />
            <nav className="flex items-center gap-1.5 text-xs text-foreground/50 font-serif" aria-label="Breadcrumb">
              <Link href="/wiki" className="hover:text-gold transition-colors">
                {T(lang, '知識庫', 'Wiki')}
              </Link>
              <span>/</span>
              <span>{T(lang, catInfo.zh, catInfo.en)}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={ctaConfig.route}
              className="px-3.5 py-1.5 rounded-full text-xs font-serif flex items-center gap-1.5 transition-all border border-gold/30 hover:border-gold/60 text-gold bg-gold/10 hover:bg-gold/20 min-h-[36px]"
            >
              <DivinationIcon type={article.category} size={14} color="currentColor" />
              <span>{T(lang, ctaConfig.ctaZh, ctaConfig.ctaEn)}</span>
            </Link>
          </div>
        </div>

        {/* Cover image */}
        {article.coverImage && (
          <div
            className="w-full h-48 md:h-64 rounded-2xl mb-6 bg-cover bg-center border border-[rgba(212,168,83,0.2)] shadow-lg"
            style={{ backgroundImage: `url(${article.coverImage})` }}
          />
        )}

        {/* Header Title Section */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="stamp-gold text-[10px]">
              {T(lang, catInfo.zh, catInfo.en)}
            </span>
            <span className="text-xs text-foreground/40 font-serif">
              {T(lang, '更新於', 'Updated')} {new Date(article.updatedAt).toLocaleDateString(T(lang, 'zh-TW', 'en-US'))}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[var(--gold)]">
            {article.title}
          </h1>
          {article.summary && (
            <p className="text-sm font-serif text-foreground/70 leading-relaxed pt-1">
              {article.summary}
            </p>
          )}
        </motion.div>

        {/* Article Markdown Content */}
        <motion.article
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8"
        >
          <div className="prose prose-invert prose-sm sm:prose-base max-w-none
            prose-headings:text-gold prose-headings:font-serif
            prose-a:text-gold-light prose-a:underline hover:prose-a:text-gold
            prose-strong:text-gold-light prose-strong:font-serif
            prose-table:text-sm prose-th:text-gold prose-th:font-serif
            prose-blockquote:border-gold/50 prose-blockquote:text-foreground/80 prose-blockquote:font-serif">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </div>
        </motion.article>

        {/* Contextual Divination Conversion CTA Card */}
        <div className="oriental-sanctuary-card p-5 sm:p-6 rounded-2xl border border-[rgba(212,168,83,0.3)] bg-gradient-to-r from-[rgba(212,168,83,0.08)] to-[rgba(13,21,38,0.9)] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold flex-shrink-0 shadow-sm">
              <DivinationIcon type={article.category} size={26} />
            </div>
            <div>
              <h3 className="font-serif text-sm sm:text-base text-gold font-medium">
                {T(lang, ctaConfig.ctaZh, ctaConfig.ctaEn)}
              </h3>
              <p className="text-xs text-foreground/60 mt-0.5 font-serif">
                {T(lang, ctaConfig.descZh, ctaConfig.descEn)}
              </p>
            </div>
          </div>
          <Link
            href={ctaConfig.route}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-serif font-medium text-xs transition-all bg-gold hover:bg-gold-light text-navy-950 shadow-md min-h-[44px] flex items-center justify-center gap-2 flex-shrink-0 active:scale-[0.98]"
          >
            <span>✦</span>
            <span>{T(lang, '立即體驗排盤', 'Start Reading')}</span>
          </Link>
        </div>

        {/* Bottom Nav */}
        <div className="text-center pt-4">
          <Link href="/wiki" className="text-xs text-gold/70 hover:text-gold transition-colors font-serif inline-flex items-center gap-1 min-h-[36px]">
            <span>←</span>
            <span>{T(lang, '返回易學知識庫總覽', 'Back to Knowledge Base')}</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
