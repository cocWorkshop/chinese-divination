'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useLang } from './LanguageContext'
import { useTheme } from './ThemeProvider'
import { T } from '@/lib/i18n'
import toast from 'react-hot-toast'
import NotificationBell from './NotificationBell'
import FeedbackModal from './FeedbackModal'
import { SunMoonIcon, ScrollIcon } from './DivinationIcons'
import YinYangIcon from './YinYangIcon'

export default function Navbar() {
  const { data: session } = useSession()
  const { lang, setLang } = useLang()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showWiki, setShowWiki] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileToggleRef = useRef<HTMLButtonElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Hide the navbar entirely on the /start ad funnel. Tentative users
  // walking through it should see a clean self-contained UX without
  // competing CTAs (Login / Register / Karma Shop) in the top bar.
  const pathname = usePathname()
  const isFunnel = pathname?.startsWith('/start') ?? false

  const [growthBadge, setGrowthBadge] = useState<{ badge: string; name: string; title: string } | null>(null)

  useEffect(() => {
    fetch('/api/config/nav').then(r => r.json()).then(data => {
      if (data.showWikiNav) setShowWiki(true)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setGrowthBadge(null)
      return
    }
    fetch('/api/user/growth')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.currentRealm) {
          let lKey: 'en' | 'zh-TW' = 'zh-TW'
          if (lang === 'en') lKey = 'en'
          setGrowthBadge({
            badge: data.currentRealm.badge,
            name: data.currentRealm.name[lKey],
            title: data.currentRealm.title[lKey],
          })
        }
      })
      .catch(() => {})
  }, [session, lang])

  useEffect(() => {
    if (!menuOpen && !userMenuOpen) return
    const handlePointer = (e: Event) => {
      const target = e.target as Node
      if (
        menuOpen &&
        mobileMenuRef.current && !mobileMenuRef.current.contains(target) &&
        mobileToggleRef.current && !mobileToggleRef.current.contains(target)
      ) {
        setMenuOpen(false)
      }
      if (
        userMenuOpen &&
        userMenuRef.current && !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false)
      }
    }
    const handleScroll = () => {
      if (menuOpen) setMenuOpen(false)
      if (userMenuOpen) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [menuOpen, userMenuOpen])

  useEffect(() => {
    document.title = T(lang, '玄機 - 古法智慧，現代傳承', 'XuanJi - Ancient Wisdom, Modern Heritage')
  }, [lang])

  const handleShare = async () => {
    if (!session) return
    setSharing(true)
    try {
      const res = await fetch('/api/share', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        router.push(`/share/${data.code}`)
      } else {
        toast.error(data.error || T(lang, '操作失敗', 'Failed'))
      }
    } catch {
      toast.error(T(lang, '網絡錯誤', 'Network error'))
    }
    setSharing(false)
  }

  if (isFunnel) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-serif text-gold hover:text-gold-light transition-colors">
            玄機
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-6">
            <Link href="/divination" className="text-foreground/80 hover:text-gold transition-colors">
              {T(lang, '占卜', 'Divination')}
            </Link>
            {session && (
              <Link href="/dashboard" className="text-foreground/80 hover:text-gold transition-colors">
                {T(lang, '歷史', 'History')}
              </Link>
            )}
            <Link href="/subscribe" className="text-foreground/80 hover:text-gold transition-colors">
              {T(lang, '機緣商店', 'Karma Shop')}
            </Link>
            {session && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="text-foreground/80 hover:text-gold transition-colors disabled:opacity-50 inline-flex items-center gap-1 font-serif text-sm"
              >
                <span className="text-gold/70 text-xs">✧</span>
                <span>{T(lang, '分享賺機緣', 'Share for Karma')}</span>
              </button>
            )}
            {showWiki && (
              <Link href="/wiki" className="text-foreground/80 hover:text-gold transition-colors inline-flex items-center gap-1 font-serif text-sm">
                <ScrollIcon size={14} className="text-gold/70" />
                <span>{T(lang, '知識庫', 'Wiki')}</span>
              </Link>
            )}

            <NotificationBell />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="px-2 py-1.5 rounded-lg border border-gold/30 text-gold/80 hover:border-gold hover:text-gold transition-colors flex items-center justify-center"
              aria-label={theme === 'dark'
                ? T(lang, '切換為淺色模式', 'Switch to light mode')
                : T(lang, '切換為深色模式', 'Switch to dark mode')}
              title={theme === 'dark'
                ? T(lang, '切換為淺色模式', 'Switch to light mode')
                : T(lang, '切換為深色模式', 'Switch to dark mode')}
            >
              <SunMoonIcon isDark={theme === 'dark'} size={15} className="text-gold" />
            </button>

            {/* Language toggle */}
            <button
              onClick={() => { if (lang === 'zh-TW') setLang('en'); else setLang('zh-TW') }}
              className="px-2.5 py-1 rounded-lg border border-gold/30 text-gold/80 hover:border-gold hover:text-gold text-xs font-serif transition-colors"
              aria-label={T(lang, 'Switch to English', '切換到繁體中文')}
              title={T(lang, 'Switch to English', '切換到繁體中文')}
            >
              {T(lang, 'Switch to English', '切換到繁體中文')}
            </button>

            {session ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-foreground/80 hover:text-gold transition-colors"
                  aria-label={T(lang, '用戶選單', 'User menu')}
                  aria-expanded={userMenuOpen}
                >
                  <span className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold relative">
                    {session.user?.name?.[0] || session.user?.email?.[0] || '?'}
                    {session.user?.isPaid && (
                      <span
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-full flex items-center justify-center text-[8px] text-navy-950 font-bold shadow"
                        title={T(lang, '尊享結緣緣主', 'Paid Patron')}
                      >
                        ✦
                      </span>
                    )}
                  </span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-lg shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-gold)' }}>
                    {session.user?.isPaid && (
                      <div className="px-4 py-2 border-b flex items-center gap-1.5 text-xs text-amber-300 font-serif bg-gradient-to-r from-amber-500/10 to-transparent" style={{ borderColor: 'rgba(212,168,83,0.15)' }}>
                        <span>✦</span>
                        <span>{T(lang, '尊享結緣緣主', 'VIP Patron')}</span>
                      </div>
                    )}
                    {growthBadge && (
                      <Link
                        href="/profile?tab=growth"
                        className="block px-4 py-2.5 border-b hover:bg-gold/5 transition-colors"
                        style={{ borderColor: 'rgba(212,168,83,0.15)' }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div className="text-[10px] text-foreground/50 uppercase tracking-wider font-sans">
                          {T(lang, '術數修為境界', 'Divination Realm')}
                        </div>
                        <div className="text-xs font-serif text-gold font-medium mt-0.5 flex items-center gap-1.5">
                          <span>{growthBadge.badge}</span>
                          <span className="truncate">{growthBadge.title}</span>
                        </div>
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      className="block px-4 py-2 hover:opacity-80 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {T(lang, '個人資料', 'Profile')}
                    </Link>
                    <Link
                      href="/profile?tab=growth"
                      className="block px-4 py-2 hover:opacity-80 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {T(lang, '術數修為', 'Divination Mastery')}
                    </Link>
                    <button
                      onClick={() => { setFeedbackOpen(true); setUserMenuOpen(false) }}
                      className="w-full text-left px-4 py-2 hover:opacity-80 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {T(lang, '意見反饋', 'Feedback')}
                    </button>
                    <button
                      onClick={() => { fetch('/api/auth/logout', { method: 'POST' }).finally(() => signOut({ redirect: false }).then(() => window.location.href = '/')); setUserMenuOpen(false) }}
                      className="w-full text-left px-4 py-2 hover:opacity-80 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {T(lang, '登出', 'Sign Out')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-foreground/80 hover:text-gold transition-colors"
                >
                  {T(lang, '登入', 'Login')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 bg-gold text-navy-950 rounded-lg font-medium hover:bg-gold-light transition-colors text-sm"
                >
                  {T(lang, '註冊', 'Register')}
                </Link>
              </div>
            )}
          </div>

          {/* Compact tablet nav (768–1023px) — the three core destinations
              stay visible instead of vanishing into the hamburger; everything
              else (share/wiki/toggles/account) remains in the menu. */}
          <div className="hidden md:flex lg:hidden items-center gap-4 mr-2">
            <Link href="/divination" className="text-sm text-foreground/80 hover:text-gold transition-colors">
              {T(lang, '占卜', 'Divination')}
            </Link>
            {session && (
              <Link href="/dashboard" className="text-sm text-foreground/80 hover:text-gold transition-colors">
                {T(lang, '歷史', 'History')}
              </Link>
            )}
            <Link href="/subscribe" className="text-sm text-foreground/80 hover:text-gold transition-colors">
              {T(lang, '機緣商店', 'Karma Shop')}
            </Link>
            <NotificationBell />
          </div>

          {/* Mobile hamburger */}
          <button
            ref={mobileToggleRef}
            className="lg:hidden text-foreground/80 hover:text-gold min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen
              ? T(lang, '關閉選單', 'Close menu')
              : T(lang, '開啟選單', 'Open menu')}
            aria-expanded={menuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div ref={mobileMenuRef} className="lg:hidden border-t px-4 py-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-gold)' }}>
          <Link href="/divination" className="text-foreground/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
            {T(lang, '占卜', 'Divination')}
          </Link>
          {session && (
            <Link href="/dashboard" className="text-foreground/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
                {T(lang, '歷史', 'History')}
            </Link>
          )}
          <Link href="/subscribe" className="text-foreground/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
              {T(lang, '機緣商店', 'Karma Shop')}
          </Link>
          {session && (
            <button onClick={() => { handleShare(); setMenuOpen(false) }} className="text-left text-foreground/80 hover:text-gold py-1.5 inline-flex items-center gap-2 font-serif text-sm">
              <span className="text-gold">✧</span>
                <span>{T(lang, '分享賺機緣', 'Share for Karma')}</span>
            </button>
          )}
          {showWiki && (
            <Link href="/wiki" className="text-foreground/80 hover:text-gold py-1.5 inline-flex items-center gap-2 font-serif text-sm" onClick={() => setMenuOpen(false)}>
              <ScrollIcon size={15} className="text-gold" />
              <span>{T(lang, '知識庫', 'Wiki')}</span>
            </Link>
          )}
          <button
            onClick={() => { toggleTheme(); setMenuOpen(false) }}
            className="text-left text-gold/80 hover:text-gold py-1.5 inline-flex items-center gap-2 font-serif text-sm"
          >
            <SunMoonIcon isDark={theme === 'dark'} size={15} className="text-gold" />
            <span>
              {theme === 'dark'
                ? T(lang, '淺色模式', 'Light Mode')
                : T(lang, '深色模式', 'Dark Mode')}
            </span>
          </button>
          <button
            onClick={() => { if (lang === 'zh-TW') setLang('en'); else setLang('zh-TW') }}
            className="text-left text-gold/80 hover:text-gold py-1.5 font-serif text-sm"
          >
            {T(lang, 'Switch to English', '切換到繁體中文')}
          </button>
          {session && (
            <Link href="/profile" className="text-foreground/80 hover:text-gold py-1.5 font-serif text-sm flex items-center justify-between" onClick={() => setMenuOpen(false)}>
                <span>{T(lang, '個人資料', 'Profile')}</span>
              {session.user?.isPaid && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">
                  ✦ {T(lang, '尊享緣主', 'VIP')}
                </span>
              )}
            </Link>
          )}
          {session && (
            <Link href="/profile?tab=growth" className="text-foreground/80 hover:text-gold py-1.5 flex items-center gap-2 font-serif text-sm" onClick={() => setMenuOpen(false)}>
              <span>{growthBadge?.badge || '✧'}</span>
              <span>{growthBadge ? growthBadge.title : T(lang, '術數修為', 'Divination Mastery')}</span>
            </Link>
          )}
          {session && (
            <button onClick={() => { setFeedbackOpen(true); setMenuOpen(false) }} className="text-left text-foreground/80 hover:text-gold py-1.5">
              {T(lang, '意見反饋', 'Feedback')}
            </button>
          )}
          {session ? (
            <button onClick={() => fetch('/api/auth/logout', { method: 'POST' }).finally(() => signOut({ redirect: false }).then(() => window.location.href = '/'))} className="text-left text-foreground/80 hover:text-gold py-1.5">
              {T(lang, '登出', 'Sign Out')}
            </button>
          ) : (
            <>
              <Link href="/login" className="text-foreground/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
                {T(lang, '登入', 'Login')}
              </Link>
              <Link href="/register" className="text-foreground/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
                {T(lang, '註冊', 'Register')}
              </Link>
            </>
          )}
        </div>
      )}

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </nav>
  )
}
