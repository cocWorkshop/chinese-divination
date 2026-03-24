import Script from 'next/script'
import type { Metadata } from 'next'
import { Inter, Noto_Serif_SC } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/components/LanguageContext'
import Navbar from '@/components/Navbar'
// ChatWidget removed — chat is now embedded in result pages as "玄機" tab
import ThemeProvider from '@/components/ThemeProvider'
import ConsentPopup from '@/components/ConsentPopup'
import CookieBanner from '@/components/CookieBanner'
import Footer from '@/components/Footer'
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
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-E4G738MBCX" strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-E4G738MBCX');
        `}</Script>
      </head>
      <body className={`${inter.variable} ${notoSerifSC.variable} min-h-screen flex flex-col`}>
        <SessionProvider>
          <LanguageProvider>
            <ThemeProvider>
            <Navbar />
            <main className="pt-16 flex-1 flex flex-col">
              {children}
            </main>

            <ConsentPopup />
            <CookieBanner />
            <Footer />
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
