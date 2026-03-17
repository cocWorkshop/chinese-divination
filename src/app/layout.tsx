import type { Metadata } from 'next'
import { Inter, Noto_Serif_SC } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/components/LanguageContext'
import Navbar from '@/components/Navbar'
import ChatWidget from '@/components/ChatWidget'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto-serif',
})

export const metadata: Metadata = {
  title: '玄机 - 古法智慧，现代传承',
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
    <html lang="zh">
      <body className={`${inter.variable} ${notoSerifSC.variable} bg-navy-950 text-white min-h-screen`}>
        <SessionProvider>
          <LanguageProvider>
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
            <ChatWidget />
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
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
