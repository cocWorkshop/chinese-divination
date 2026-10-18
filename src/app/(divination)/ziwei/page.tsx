import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Zi Wei Dou Shu (紫微斗數) - Purple Star Astrology Reading',
  description:
    'Discover Zi Wei Dou Shu, the ancient Chinese Purple Star Astrology system. Explore your 12 life palaces, major stars, and destiny through AI-powered birth chart analysis.',
  keywords: [
    'Zi Wei Dou Shu',
    '紫微斗數',
    'Purple Star Astrology',
    'Chinese astrology',
    'birth chart',
    '12 palaces',
    'star chart reading',
    'destiny analysis',
    'Emperor astrology',
    'fortune telling',
    'life path analysis',
    'Chinese metaphysics',
  ],
  openGraph: {
    title: 'Zi Wei Dou Shu (紫微斗數) - Purple Star Astrology Reading',
    description:
      'Discover Zi Wei Dou Shu, the ancient Chinese Purple Star Astrology system. Explore your 12 life palaces, major stars, and destiny through AI-powered birth chart analysis.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Xuanji - 玄機',
    url: '/ziwei',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zi Wei Dou Shu (紫微斗數) - Purple Star Astrology Reading',
    description:
      'Discover Zi Wei Dou Shu, the ancient Chinese Purple Star Astrology. Explore 12 life palaces and major stars through AI-powered chart analysis.',
  },
}

const faqs = [
  {
    question: 'What is the difference between Zi Wei Dou Shu and BaZi?',
    answer:
      'While both systems use your birth date and time, they differ fundamentally in approach. BaZi (Four Pillars of Destiny) focuses on the interplay of Five Elements derived from the Heavenly Stems and Earthly Branches of your birth data. Zi Wei Dou Shu, on the other hand, maps over 100 stars across 12 palaces to create a detailed life chart. BaZi excels at understanding elemental balance and timing, while Zi Wei Dou Shu provides a more granular, palace-by-palace analysis of specific life domains such as career, marriage, wealth, and health. Many practitioners use both systems together for a comprehensive reading.',
  },
  {
    question: 'What are the 12 palaces in Zi Wei Dou Shu?',
    answer:
      'The 12 palaces (十二宮) form the structural foundation of every Zi Wei Dou Shu chart. They are: Life Palace (命宮) — your core personality and destiny; Siblings Palace (兄弟宮) — relationships with brothers and sisters; Spouse Palace (夫妻宮) — marriage and romantic partnerships; Children Palace (子女宮) — offspring and fertility; Wealth Palace (財帛宮) — finances and earning ability; Health Palace (疾厄宮) — physical constitution and illness; Travel Palace (遷移宮) — movement, relocation, and outer social life; Friends Palace (交友宮) — friendships and social connections; Career Palace (官祿宮) — profession, achievements, and ambitions; Property Palace (田宅宮) — real estate and living environment; Fortune Palace (福德宮) — spiritual well-being and inner happiness; and Parents Palace (父母宮) — relationship with parents and upbringing.',
  },
  {
    question: 'Do I need my exact birth time for a Zi Wei Dou Shu reading?',
    answer:
      'Yes, an accurate birth time is highly important for Zi Wei Dou Shu. The system divides each day into twelve two-hour periods (時辰) based on the traditional Chinese time system. Your birth hour determines which zodiac sign occupies your Life Palace and how all other palaces are arranged. Even a difference of one hour can shift stars between palaces and significantly alter the reading. If you are unsure of your exact birth time, a skilled practitioner can sometimes help narrow it down through life event verification, but the most accurate readings come from a confirmed birth hour.',
  },
  {
    question: 'Can Zi Wei Dou Shu predict marriage and relationships?',
    answer:
      'Zi Wei Dou Shu offers detailed insights into romantic relationships and marriage through several palaces. The Spouse Palace (夫妻宮) is the primary indicator, revealing the nature of your marriage, your partner\'s characteristics, and the overall quality of the relationship. The Life Palace and Fortune Palace also contribute to understanding your emotional tendencies and capacity for happiness. The system can indicate favorable periods for meeting a partner, potential challenges in marriage, and compatibility factors. However, it is best understood as a guide to tendencies and potentials rather than fixed predictions — personal choices always play a vital role in shaping your relationships.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Xuanji Zi Wei Dou Shu Reading',
  description:
    'AI-powered Zi Wei Dou Shu (Purple Star Astrology) birth chart analysis based on classical Chinese astrology.',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  url: '/divination/ziwei',
}

export default function ZiWeiLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
        {/* Hero Section */}
        <section className="card-quiet rounded-2xl p-8 text-center">
          <p className="text-gold/60 text-lg tracking-widest mb-2 font-serif">
            ✦ Purple Star Astrology
          </p>
          <h1 className="text-4xl md:text-5xl font-serif text-gold mb-3">
            Zi Wei Dou Shu — Purple Star Astrology
          </h1>
          <p className="text-3xl md:text-4xl font-serif text-gold/80 mb-6">
            紫微斗數
          </p>
          <p className="text-foreground/80 text-lg max-w-2xl mx-auto leading-relaxed">
            The &quot;Emperor&apos;s Astrology&quot; — a thousand-year-old star
            chart system that maps your destiny across twelve life palaces.
            Discover your life path, career potential, and relationship patterns
            through one of the most sophisticated divination systems ever
            created.
          </p>
        </section>

        {/* English Content */}
        <section className="card-quiet rounded-2xl p-8">
          <h2 className="text-2xl font-serif text-gold mb-6">
            What Is Zi Wei Dou Shu?
          </h2>
          <div className="space-y-4 text-foreground/80 leading-relaxed">
            <p>
              Zi Wei Dou Shu (紫微斗數), often translated as &quot;Purple Star
              Astrology,&quot; is one of the most revered and comprehensive
              fortune-telling systems in Chinese metaphysics. Developed during
              the Tang and Song dynasties over a thousand years ago, it is
              sometimes called the &quot;Emperor&apos;s Astrology&quot; because
              it was originally reserved for the imperial court. The system is
              attributed to the legendary Taoist sage Chen Tuan (陳摶), who is
              said to have synthesized astronomical observation, numerology, and
              Taoist philosophy into a unified method for reading human destiny.
              Unlike Western astrology, which focuses primarily on the position
              of planets at the time of birth, Zi Wei Dou Shu constructs an
              intricate chart of over 100 stars arranged across 12 distinct life
              palaces, each governing a specific domain of human experience.
            </p>

            <p>
              At the heart of every Zi Wei Dou Shu chart are the 12 palaces
              (十二宮), which together form a complete map of a person&apos;s
              life. The Life Palace (命宮) represents your core personality,
              innate talents, and overarching destiny. The Siblings Palace
              (兄弟宮) reveals your relationship with brothers and sisters, while
              the Spouse Palace (夫妻宮) governs marriage and romantic
              partnerships. The Children Palace (子女宮) speaks to offspring and
              fertility. The Wealth Palace (財帛宮) indicates your earning
              capacity and financial fortune, and the Health Palace (疾厄宮)
              describes your physical constitution and susceptibility to illness.
              The Travel Palace (遷移宮) covers relocation and your outer social
              persona. The Friends Palace (交友宮) governs friendships and social
              networks. The Career Palace (官祿宮) addresses professional
              achievements and ambitions. The Property Palace (田宅宮) relates to
              real estate and living environment. The Fortune Palace (福德宮)
              reflects inner happiness and spiritual well-being. Finally, the
              Parents Palace (父母宮) describes your relationship with parents
              and the influence of your upbringing.
            </p>

            <p>
              The stars in Zi Wei Dou Shu are not celestial bodies in the
              astronomical sense but rather symbolic archetypes that carry
              specific energies and meanings. The most important star is Zi Wei
              (紫微星), the &quot;Emperor Star,&quot; which represents leadership,
              authority, and noble character. Where Zi Wei lands in your chart
              sets the tone for the entire reading. Other major stars include
              Tian Ji (天機), the star of wisdom and strategy; Tai Yang (太陽),
              the Sun Star representing outward energy, generosity, and public
              life; Tai Yin (太陰), the Moon Star governing intuition, inner
              emotion, and subtlety; Wu Qu (武曲), the star of financial acumen
              and determination; and Tian Tong (天同), a star of comfort,
              gentleness, and artistic inclination. Each star interacts with the
              palace it occupies and with neighboring stars, creating a
              multilayered portrait of strengths, challenges, and timing in a
              person&apos;s life. Minor stars, auxiliary stars, and
              transformation stars add further nuance, making each chart as
              unique as a fingerprint.
            </p>

            <p>
              To generate a Zi Wei Dou Shu chart, a practitioner needs your year,
              month, day, and hour of birth according to the Chinese lunar
              calendar. The birth data is converted into a specific &quot;life
              number&quot; that determines where the Zi Wei star is placed, and
              from that anchor point all other stars are calculated and
              distributed across the 12 palaces. Because the system uses
              two-hour increments (時辰) based on the traditional Chinese clock,
              even a small difference in birth time can shift stars between
              palaces and produce a significantly different reading. Once the
              chart is constructed, a practitioner can analyze your innate
              personality, forecast major life events across different decades
              and years, evaluate career suitability, assess relationship
              compatibility, and identify periods of opportunity or caution. Zi
              Wei Dou Shu does not claim to dictate a fixed fate; rather, it
              illuminates tendencies, potentials, and the natural rhythm of your
              life, empowering you to make more informed choices. Today,
              AI-powered analysis makes this ancient wisdom accessible to
              everyone — you can receive a detailed, personalized Zi Wei Dou Shu
              reading in minutes, drawing on the same classical principles that
              guided emperors and scholars for centuries.
            </p>
          </div>
        </section>

        {/* Gold Decorative Separator */}
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-gold/60" />
          <span className="text-gold/80 text-2xl">✦</span>
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-gold/60" />
        </div>

        {/* Chinese Content */}
        <section className="card-quiet rounded-2xl p-8">
          <h2 className="text-2xl font-serif text-gold mb-6">
            紫微斗數簡介
          </h2>
          <div className="space-y-4 text-foreground/80 leading-relaxed">
            <p>
              紫微斗數是中國傳統命理學中最為精密的預測體系之一，起源於唐宋時期，距今已有千餘年的歷史。相傳由道家高人陳摶老祖所創，融合了天文觀測、數理推演與道家哲學思想。因其精準度極高，歷代皇室多以此術推算國運與個人命格，故有「帝王之學」的美譽。紫微斗數以出生的年、月、日、時為基礎，依據農曆曆法將超過一百顆星曜排布於十二宮位之中，形成一張獨一無二的命盤，全面揭示命主一生的吉凶禍福。
            </p>

            <p>
              十二宮位是紫微斗數命盤的核心架構。命宮主掌先天性格與人生格局；兄弟宮反映手足情誼；夫妻宮論斷婚姻與感情；子女宮涉及子嗣與親子關係；財帛宮主理財運與理財能力；疾厄宮關乎健康與體質；遷移宮掌管出行、遷居與外在人際；交友宮論社交圈與人脈；官祿宮主事業成就與功名；田宅宮與不動產及居家環境有關；福德宮反映精神層面的幸福與內在修養；父母宮則揭示與長輩的緣分及成長背景。每一宮位中的星曜組合各有不同，交織出千變萬化的命運圖景。
            </p>

            <p>
              紫微斗數中的星曜並非實際天體，而是具有特定象徵意義的能量符號。其中最重要的是紫微星，代表領導力、尊貴與權威，其落入的宮位奠定了整張命盤的基調。天機星主智慧謀略；太陽星象徵光明正大、熱情外放；太陰星主內斂細膩、直覺敏銳；武曲星代表財經才能與堅毅果敢；天同星則主溫和安逸、藝術天分。主星之外，還有眾多輔星、煞星與化曜，使每張命盤的解讀層次豐富、細緻入微。
            </p>

            <p>
              現代AI技術讓紫微斗數這門古老的智慧煥發新生。您只需輸入準確的出生時間，系統即可在數分鐘內完成排盤與解讀，為您呈現詳盡的命理分析報告。無論是探索事業方向、了解感情運勢、還是把握人生大運流年的起伏節奏，紫微斗數都能為您提供深具參考價值的洞見。古法智慧與現代科技的結合，讓每個人都能便捷地觸及這門曾經只屬於帝王將相的命理瑰寶。
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-4">
          <Link
            href="/divination/ziwei"
            className="inline-block bg-gold hover:bg-gold/90 text-navy-950 font-semibold px-8 py-3 rounded-xl text-lg transition-all shadow-lg shadow-gold/20"
          >
            Start Your Zi Wei Dou Shu Reading →
          </Link>
          <p className="text-foreground/50 text-sm mt-4">
            Free AI-powered Purple Star Astrology analysis based on your birth
            chart
          </p>
        </section>

        {/* FAQ Section */}
        <section className="card-quiet rounded-2xl p-8">
          <h2 className="text-2xl font-serif text-gold mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="text-lg font-semibold text-gold/90 mb-2">
                  {faq.question}
                </h3>
                <p className="text-foreground/70 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <p className="text-center text-foreground/40 text-xs pb-8">
          For reference and entertainment only. Not a substitute for
          professional advice.
        </p>
      </div>
    </div>
  )
}
