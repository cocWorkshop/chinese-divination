'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useLang } from './LanguageContext'
import { useTheme } from './ThemeProvider'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { data: session } = useSession()
  const { lang, setLang } = useLang()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    document.title = lang === 'en' ? 'Chinese Divination - Ancient Wisdom, Modern Heritage' : '玄機 - 古法智慧，現代傳承'
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
        toast.error(data.error || 'Failed')
      }
    } catch {
      toast.error('Network error')
    }
    setSharing(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-serif text-gold hover:text-gold-light transition-colors">
            玄機
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/divination" className="text-white/80 hover:text-gold transition-colors">
              {lang === 'en' ? 'Divination' : '占卜'}
            </Link>
            {session && (
              <Link href="/dashboard" className="text-white/80 hover:text-gold transition-colors">
                {lang === 'zh-TW' ? '歷史' : 'History'}
              </Link>
            )}
            <Link href="/subscribe" className="text-white/80 hover:text-gold transition-colors">
              {lang === 'en' ? 'Subscribe' : '訂閱'}
            </Link>
            {session && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="text-white/80 hover:text-gold transition-colors disabled:opacity-50"
              >
                {lang === 'en' ? '🔗 Share' : '🔗 分享'}
              </button>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="px-2 py-1 rounded border border-gold/40 text-gold/80 hover:border-gold hover:text-gold text-sm transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'zh-TW' ? 'en' : 'zh-TW')}
              className="px-3 py-1 rounded border border-gold/40 text-gold/80 hover:border-gold hover:text-gold text-sm transition-colors"
            >
              {lang === 'zh-TW' ? 'EN' : '繁'}
            </button>

            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-white/80 hover:text-gold transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                    {session.user?.name?.[0] || session.user?.email?.[0] || '?'}
                  </span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-gold)' }}>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 hover:opacity-80 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {lang === 'zh-TW' ? '個人資料' : 'Profile'}
                    </Link>
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white/80 hover:text-gold"
            onClick={() => setMenuOpen(!menuOpen)}
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
        <div className="md:hidden border-t px-4 py-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-gold)' }}>
          <Link href="/divination" className="text-white/80 hover:text-gold" onClick={() => setMenuOpen(false)}>
            {lang === 'en' ? 'Divination' : '占卜'}
          </Link>
          <Link href="/subscribe" className="text-white/80 hover:text-gold" onClick={() => setMenuOpen(false)}>
            {lang === 'en' ? 'Subscribe' : '訂閱'}
          </Link>
          {session && (
            <Link href="/dashboard" className="text-white/80 hover:text-gold" onClick={() => setMenuOpen(false)}>
              {lang === 'zh-TW' ? '歷史' : 'History'}
            </Link>
          )}
          {session && (
            <Link href="/profile" className="text-white/80 hover:text-gold" onClick={() => setMenuOpen(false)}>
              {lang === 'zh-TW' ? '個人資料' : 'Profile'}
            </Link>
          )}
          {session && (
            <button onClick={() => { handleShare(); setMenuOpen(false) }} className="text-left text-white/80 hover:text-gold">
              {lang === 'en' ? '🔗 Share & Earn' : '🔗 分享賺次數'}
            </button>
          )}
          <button
            onClick={() => { toggleTheme(); setMenuOpen(false) }}
            className="text-left text-gold/80 hover:text-gold"
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button
            onClick={() => setLang(lang === 'zh-TW' ? 'en' : 'zh-TW')}
            className="text-left text-gold/80 hover:text-gold"
          >
            {lang === 'zh-TW' ? 'Switch to English' : '切換到繁體中文'}
          </button>
          {session ? (
            <button onClick={() => fetch('/api/auth/logout', { method: 'POST' }).finally(() => signOut({ redirect: false }).then(() => window.location.href = '/'))} className="text-left text-white/80 hover:text-gold">
              {lang === 'zh-TW' ? '登出' : 'Sign Out'}
            </button>
          ) : (
            <>
              <Link href="/login" className="text-white/80 hover:text-gold" onClick={() => setMenuOpen(false)}>
                {lang === 'zh-TW' ? '登入' : 'Login'}
              </Link>
              <Link href="/register" className="text-white/80 hover:text-gold" onClick={() => setMenuOpen(false)}>
                {lang === 'zh-TW' ? '註冊' : 'Register'}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
