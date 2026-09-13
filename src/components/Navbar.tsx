'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useLang } from './LanguageContext'
import { useTheme } from './ThemeProvider'
import toast from 'react-hot-toast'
import NotificationBell from './NotificationBell'
import FeedbackModal from './FeedbackModal'

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
          const lKey = lang === 'en' ? 'en' : 'zh-TW'
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
    document.title = lang === 'en' ? 'XuanJi - Ancient Wisdom, Modern Heritage' : '玄機 - 古法智慧，現代傳承'
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
        toast.error(data.error || (lang === 'en' ? 'Failed' : '操作失敗'))
      }
    } catch {
      toast.error(lang === 'en' ? 'Network error' : '網絡錯誤')
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
            <Link href="/divination" className="text-white/80 hover:text-gold transition-colors">
              {lang === 'en' ? 'Divination' : '占卜'}
            </Link>
            {session && (
              <Link href="/dashboard" className="text-white/80 hover:text-gold transition-colors">
                {lang === 'zh-TW' ? '歷史' : 'History'}
              </Link>
            )}
            <Link href="/subscribe" className="text-white/80 hover:text-gold transition-colors">
              {lang === 'en' ? 'Karma Shop' : '機緣商店'}
            </Link>
            {session && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="text-white/80 hover:text-gold transition-colors disabled:opacity-50"
              >
                {lang === 'en' ? '🔗 Share for Karma' : '🔗 分享賺機緣'}
              </button>
            )}
            {showWiki && (
              <Link href="/wiki" className="text-white/80 hover:text-gold transition-colors">
                {lang === 'en' ? 'Wiki' : '知識庫'}
              </Link>
            )}

            <NotificationBell />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="px-2 py-1 rounded border border-gold/40 text-gold/80 hover:border-gold hover:text-gold text-sm transition-colors"
              aria-label={theme === 'dark'
                ? (lang === 'zh-TW' ? '切換為淺色模式' : 'Switch to light mode')
                : (lang === 'zh-TW' ? '切換為深色模式' : 'Switch to dark mode')}
              title={theme === 'dark'
                ? (lang === 'zh-TW' ? '切換為淺色模式' : 'Switch to light mode')
                : (lang === 'zh-TW' ? '切換為深色模式' : 'Switch to dark mode')}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'zh-TW' ? 'en' : 'zh-TW')}
              className="px-3 py-1 rounded border border-gold/40 text-gold/80 hover:border-gold hover:text-gold text-sm transition-colors"
              aria-label={lang === 'zh-TW' ? 'Switch to English' : '切換為繁體中文'}
            >
              {lang === 'zh-TW' ? 'EN' : '繁'}
            </button>

            {session ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-white/80 hover:text-gold transition-colors"
                  aria-label={lang === 'zh-TW' ? '用戶選單' : 'User menu'}
                  aria-expanded={userMenuOpen}
                >
                  <span className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                    {session.user?.name?.[0] || session.user?.email?.[0] || '?'}
                  </span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-lg shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-gold)' }}>
                    {growthBadge && (
                      <Link
                        href="/profile?tab=growth"
                        className="block px-4 py-2.5 border-b hover:bg-gold/5 transition-colors"
                        style={{ borderColor: 'rgba(212,168,83,0.15)' }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans">
                          {lang === 'zh-TW' ? '術數修為境界' : 'Divination Realm'}
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
                      {lang === 'zh-TW' ? '個人資料' : 'Profile'}
                    </Link>
                    <Link
                      href="/profile?tab=growth"
                      className="block px-4 py-2 hover:opacity-80 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {lang === 'zh-TW' ? '術數修為' : 'Divination Mastery'}
                    </Link>
                    <button
                      onClick={() => { setFeedbackOpen(true); setUserMenuOpen(false) }}
                      className="w-full text-left px-4 py-2 hover:opacity-80 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {lang === 'zh-TW' ? '意見反饋' : 'Feedback'}
                    </button>
                    <button
                      onClick={() => { fetch('/api/auth/logout', { method: 'POST' }).finally(() => signOut({ redirect: false }).then(() => window.location.href = '/')); setUserMenuOpen(false) }}
                      className="w-full text-left px-4 py-2 hover:opacity-80 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {lang === 'zh-TW' ? '登出' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-white/80 hover:text-gold transition-colors"
                >
                  {lang === 'zh-TW' ? '登入' : 'Login'}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 bg-gold text-navy-950 rounded-lg font-medium hover:bg-gold-light transition-colors text-sm"
                >
                  {lang === 'zh-TW' ? '註冊' : 'Register'}
                </Link>
              </div>
            )}
          </div>

          {/* Compact tablet nav (768–1023px) — the three core destinations
              stay visible instead of vanishing into the hamburger; everything
              else (share/wiki/toggles/account) remains in the menu. */}
          <div className="hidden md:flex lg:hidden items-center gap-4 mr-2">
            <Link href="/divination" className="text-sm text-white/80 hover:text-gold transition-colors">
              {lang === 'en' ? 'Divination' : '占卜'}
            </Link>
            {session && (
              <Link href="/dashboard" className="text-sm text-white/80 hover:text-gold transition-colors">
                {lang === 'zh-TW' ? '歷史' : 'History'}
              </Link>
            )}
            <Link href="/subscribe" className="text-sm text-white/80 hover:text-gold transition-colors">
              {lang === 'en' ? 'Karma Shop' : '機緣商店'}
            </Link>
            <NotificationBell />
          </div>

          {/* Mobile hamburger */}
          <button
            ref={mobileToggleRef}
            className="lg:hidden text-white/80 hover:text-gold min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen
              ? (lang === 'zh-TW' ? '關閉選單' : 'Close menu')
              : (lang === 'zh-TW' ? '開啟選單' : 'Open menu')}
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
          <Link href="/divination" className="text-white/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
            {lang === 'en' ? 'Divination' : '占卜'}
          </Link>
          {session && (
            <Link href="/dashboard" className="text-white/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
              {lang === 'zh-TW' ? '歷史' : 'History'}
            </Link>
          )}
          <Link href="/subscribe" className="text-white/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
            {lang === 'en' ? 'Karma Shop' : '機緣商店'}
          </Link>
          {session && (
            <button onClick={() => { handleShare(); setMenuOpen(false) }} className="text-left text-white/80 hover:text-gold py-1.5">
              {lang === 'en' ? '🔗 Share for Karma' : '🔗 分享賺機緣'}
            </button>
          )}
          {showWiki && (
            <Link href="/wiki" className="text-white/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
              {lang === 'en' ? '📚 Wiki' : '📚 知識庫'}
            </Link>
          )}
          <button
            onClick={() => { toggleTheme(); setMenuOpen(false) }}
            className="text-left text-gold/80 hover:text-gold py-1.5"
          >
            {theme === 'dark'
              ? (lang === 'zh-TW' ? '☀️ 淺色模式' : '☀️ Light Mode')
              : (lang === 'zh-TW' ? '🌙 深色模式' : '🌙 Dark Mode')}
          </button>
          <button
            onClick={() => setLang(lang === 'zh-TW' ? 'en' : 'zh-TW')}
            className="text-left text-gold/80 hover:text-gold py-1.5"
          >
            {lang === 'zh-TW' ? 'Switch to English' : '切換到繁體中文'}
          </button>
          {session && (
            <Link href="/profile" className="text-white/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
              {lang === 'zh-TW' ? '個人資料' : 'Profile'}
            </Link>
          )}
          {session && (
            <Link href="/profile?tab=growth" className="text-white/80 hover:text-gold py-1.5 flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <span>{growthBadge?.badge || '☯️'}</span>
              <span>{growthBadge ? growthBadge.title : (lang === 'zh-TW' ? '術數修為' : 'Divination Mastery')}</span>
            </Link>
          )}
          {session && (
            <button onClick={() => { setFeedbackOpen(true); setMenuOpen(false) }} className="text-left text-white/80 hover:text-gold py-1.5">
              {lang === 'zh-TW' ? '意見反饋' : 'Feedback'}
            </button>
          )}
          {session ? (
            <button onClick={() => fetch('/api/auth/logout', { method: 'POST' }).finally(() => signOut({ redirect: false }).then(() => window.location.href = '/'))} className="text-left text-white/80 hover:text-gold py-1.5">
              {lang === 'zh-TW' ? '登出' : 'Sign Out'}
            </button>
          ) : (
            <>
              <Link href="/login" className="text-white/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
                {lang === 'zh-TW' ? '登入' : 'Login'}
              </Link>
              <Link href="/register" className="text-white/80 hover:text-gold py-1.5" onClick={() => setMenuOpen(false)}>
                {lang === 'zh-TW' ? '註冊' : 'Register'}
              </Link>
            </>
          )}
        </div>
      )}

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </nav>
  )
}
