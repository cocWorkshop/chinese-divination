import Script from 'next/script'
import type { Metadata } from 'next'
import { Inter, Noto_Serif_SC } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/components/LanguageContext'
import Navbar from '@/components/Navbar'
// ChatWidget removed — chat is now embedded in result pages as "玄機" tab
import { MasterChatProvider } from '@/components/master/MasterChatContext'
import MasterChatWidget from '@/components/master/MasterChatWidget'
import ThemeProvider from '@/components/ThemeProvider'
import ConsentPopup from '@/components/ConsentPopup'
import CookieBanner from '@/components/CookieBanner'
import Footer from '@/components/Footer'
import NotificationPopup from '@/components/NotificationPopup'
import NativeInitializer from '@/components/NativeInitializer'
import InstallPrompt from '@/components/InstallPrompt'
import ScrollToTop from '@/components/ScrollToTop'
import SentryClientInit from '@/components/SentryClientInit'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto-serif',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://chinese-divination.com'),
  title: {
    default: '玄機 XuanJi - Free AI Chinese Divination | BaZi, I Ching, Zi Wei Dou Shu',
    template: '%s | 玄機 XuanJi',
  },
  description:
    'Free AI-powered Chinese divination platform. Get personalized BaZi (Four Pillars), I Ching, Zi Wei Dou Shu, Qi Men Dun Jia, Feng Shui, Liu Yao, and Mei Hua readings with expert AI interpretation.',
  keywords: [
    'Chinese divination',
    'BaZi',
    'Four Pillars of Destiny',
    'I Ching',
    'Zi Wei Dou Shu',
    'Purple Star Astrology',
    'Qi Men Dun Jia',
    'Feng Shui',
    'Liu Yao',
    'Mei Hua Yi Shu',
    'AI divination',
    'free divination',
    '八字',
    '易經',
    '紫微斗數',
    '奇門遁甲',
    '風水',
    '六爻',
    '梅花易數',
    '玄機',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chinese-divination.com',
    siteName: '玄機 XuanJi',
    title: '玄機 XuanJi - Free AI Chinese Divination',
    description:
      'Free AI-powered Chinese divination: BaZi, I Ching, Zi Wei Dou Shu, Qi Men Dun Jia, Feng Shui, and more. Ancient wisdom meets modern AI.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '玄機 XuanJi - AI Chinese Divination Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '玄機 XuanJi - Free AI Chinese Divination',
    description:
      'Free AI-powered Chinese divination: BaZi, I Ching, Zi Wei Dou Shu, Qi Men Dun Jia, Feng Shui, and more.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://chinese-divination.com',
    languages: {
      'en': 'https://chinese-divination.com',
      'zh-TW': 'https://chinese-divination.com',
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.className=t}catch(e){document.documentElement.className='dark'}})()` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: '玄機 XuanJi',
              url: 'https://chinese-divination.com',
              description:
                'Free AI-powered Chinese divination platform offering BaZi, I Ching, Zi Wei Dou Shu, Qi Men Dun Jia, Feng Shui, Liu Yao, and Mei Hua readings.',
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '150',
              },
            }),
          }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `}</Script>
          </>
        )}
      </head>
      <body className={`${inter.variable} ${notoSerifSC.variable} min-h-screen flex flex-col`}>
        <SessionProvider>
          <LanguageProvider>
            <ThemeProvider>
            <MasterChatProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gold focus:text-navy-950 focus:rounded-lg focus:text-sm focus:font-medium">
              Skip to content
            </a>
            <Navbar />
            <main id="main-content" className="pt-16 flex-1 flex flex-col pb-20">
              {children}
            </main>

            <SentryClientInit />
            <NativeInitializer />
            <NotificationPopup />
            <InstallPrompt />
            <ConsentPopup />
            <CookieBanner />
            <Footer />
            <MasterChatWidget />
            <ScrollToTop />
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: '#111d35',
                  color: '#e8c278',
                  border: '1px solid rgba(212, 168, 83, 0.3)',
                },
              }}
            />
            </MasterChatProvider>
          </ThemeProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
