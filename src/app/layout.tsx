import Script from 'next/script'
import type { Metadata } from 'next'
import { Quicksand, Noto_Sans_SC, ZCOOL_XiaoWei, Zhi_Mang_Xing } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/components/LanguageContext'
import Navbar from '@/components/Navbar'
// ChatWidget removed — chat is now embedded in result pages as "玄機" tab
import ThemeProvider from '@/components/ThemeProvider'
import ConsentPopup from '@/components/ConsentPopup'
import CookieBanner from '@/components/CookieBanner'
import Footer from '@/components/Footer'
import NotificationPopup from '@/components/NotificationPopup'
import './globals.css'

const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand', weight: ['400', '600', '700'] })
const notoSansSC = Noto_Sans_SC({ subsets: ['latin'], variable: '--font-noto-sans', weight: ['400', '700'] })
const zcoolXiaoWei = ZCOOL_XiaoWei({ subsets: ['latin'], variable: '--font-heading', weight: '400' })
const zhiMangXing = Zhi_Mang_Xing({ subsets: ['latin'], variable: '--font-brand', weight: '400' })

export const metadata: Metadata = {
  metadataBase: new URL('https://chinese-divination.com'),
  title: {
    default: '玄機 Xuanji - Free AI Chinese Divination | BaZi, I Ching, Zi Wei Dou Shu',
    template: '%s | 玄機 Xuanji',
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
    siteName: '玄機 Xuanji',
    title: '玄機 Xuanji - Free AI Chinese Divination',
    description:
      'Free AI-powered Chinese divination: BaZi, I Ching, Zi Wei Dou Shu, Qi Men Dun Jia, Feng Shui, and more. Ancient wisdom meets modern AI.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '玄機 Xuanji - AI Chinese Divination Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '玄機 Xuanji - Free AI Chinese Divination',
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
    apple: '/favicon.svg',
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
    <html lang="zh" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.className=t}catch(e){document.documentElement.className='dark'}})()` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: '玄機 Xuanji',
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
      <body className={`${quicksand.variable} ${notoSansSC.variable} ${zcoolXiaoWei.variable} ${zhiMangXing.variable} min-h-screen flex flex-col`}>
        <SessionProvider>
          <LanguageProvider>
            <ThemeProvider>
            <Navbar />
            <main className="pt-16 flex-1 flex flex-col">
              {children}
            </main>

            <NotificationPopup />
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
