import type { Metadata } from 'next'
import { Inter, Noto_Serif_SC } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/components/LanguageContext'
import Navbar from '@/components/Navbar'
import ChatWidget from '@/components/ChatWidget'
import ThemeProvider from '@/components/ThemeProvider'
import ConsentPopup from '@/components/ConsentPopup'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto-serif',
})

export const metadata: Metadata = {
  title: '玄機 - 古法智慧，現代傳承',
  description: 'Chinese divination platform - BaZi, I Ching, Zi Wei, Qi Men, Feng Shui',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" className="dark">
      <body className={`${inter.variable} ${notoSerifSC.variable} min-h-screen`}>
        <SessionProvider>
          <LanguageProvider>
            <ThemeProvider>
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
            <ChatWidget />
            <ConsentPopup />
            <CookieBanner />
            <footer className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              <a href="/privacy" className="hover:underline" style={{ color: 'var(--text-muted)' }}>隱私政策</a>
              <span className="mx-2">·</span>
              <a href="/terms" className="hover:underline" style={{ color: 'var(--text-muted)' }}>用戶協議</a>
              <span className="mx-2">·</span>
              <span>© {new Date().getFullYear()} 玄機</span>
            </footer>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#111d35',
                  color: '#e8c278',
                  border: '1px solid rgba(212, 168, 83, 0.3)',
                },
              }}
            />
          </ThemeProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
