import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Liu Yao Divination (六爻) - Six Lines Coin Casting Oracle',
  description:
    'Discover Liu Yao (六爻), the ancient Chinese coin-casting divination method. Build hexagrams line by line with three coins, analyze six relatives, and get precise answers.',
  keywords: [
    'Liu Yao',
    '六爻',
    'six lines divination',
    'coin casting',
    'I Ching hexagram',
    'Chinese divination',
    'six relatives',
    '六親',
    'moving lines',
    'oracle coins',
    'hexagram reading',
    'fortune telling',
  ],
  openGraph: {
    title: 'Liu Yao Divination (六爻) - Six Lines Coin Casting Oracle',
    description:
      'Discover Liu Yao (六爻), the ancient Chinese coin-casting divination method. Build hexagrams line by line with three coins for precise, situation-specific answers.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Xuanji - Ancient Wisdom, Modern Clarity',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Liu Yao Divination (六爻) - Six Lines Coin Casting Oracle',
    description:
      'Discover Liu Yao (六爻), the ancient Chinese coin-casting divination method. Build hexagrams line by line with three coins for precise answers.',
  },
}

const faqItems = [
  {
    question: 'How does coin casting work in Liu Yao?',
    answer:
      'In Liu Yao divination, you toss three coins simultaneously six times. Each toss produces one line of the hexagram. The combination of heads and tails determines whether the line is yin (broken) or yang (solid), and whether it is a static or moving line. You build the hexagram from the bottom up, with the first toss forming the lowest line and the sixth toss forming the top.',
  },
  {
    question: "What is the difference between Liu Yao and the I Ching?",
    answer:
      'The I Ching (易經) is the foundational text containing the 64 hexagrams and their interpretations. Liu Yao (六爻) is a specific divination method that uses the I Ching hexagrams but adds a sophisticated analytical framework: the Six Relatives system (六親), the Earthly Branches, the Five Elements cycle, and moving-line transformation analysis. While the I Ching offers philosophical wisdom, Liu Yao provides a structured system for precise, event-specific predictions.',
  },
  {
    question: 'Can I ask yes or no questions with Liu Yao?',
    answer:
      'Yes, Liu Yao is exceptionally well-suited for yes-or-no questions. By examining the relationship between the subject line (世爻) and the useful spirit (用神), along with the presence of moving lines and the Five Elements cycle, a Liu Yao reading can give clear directional answers about whether a situation will develop favorably or unfavorably.',
  },
  {
    question: 'How specific can my question be?',
    answer:
      'Liu Yao excels with specific, focused questions. Rather than asking "What does my future look like?", you get much better results asking things like "Will I get the job I interviewed for last Tuesday?" or "Is this a good time to sign the lease on the new apartment?" The more specific your question, the more precise and actionable the reading becomes.',
  },
]

export default function LiuYaoPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Xuanji Liu Yao Divination',
    description:
      'AI-powered Liu Yao (六爻) coin-casting divination with Six Relatives analysis and moving line interpretation.',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }

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

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-gold mb-4">
            Liu Yao - Six Lines Divination
          </h1>
          <p className="text-2xl md:text-3xl font-serif text-gold/80 mb-6">
            六爻占卜
          </p>
          <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
            The ancient art of building hexagrams through coin casting — one of
            the most precise and practical divination methods in Chinese
            metaphysics.
          </p>
        </section>

        {/* English Content */}
        <section className="card-quiet rounded-2xl p-8 md:p-10 mb-8">
          <h2 className="text-2xl font-serif text-gold mb-6">
            What is Liu Yao Divination?
          </h2>

          <div className="space-y-5 text-foreground/80 leading-relaxed">
            <p>
              Liu Yao (六爻), literally meaning &ldquo;six lines,&rdquo; is one of the
              most widely practiced forms of Chinese divination. Rooted in the
              I Ching (Book of Changes) tradition, it was refined during the
              Han Dynasty and has been used for over two thousand years by
              scholars, strategists, and everyday people seeking clarity about
              specific life situations. Unlike natal chart methods such as BaZi
              or Zi Wei Dou Shu that analyze your overall destiny, Liu Yao is
              designed to answer concrete questions about particular events,
              decisions, and outcomes — making it one of the most practical
              divination tools in the Chinese metaphysical tradition.
            </p>

            <p>
              The method centers on the casting of three coins, repeated six
              times to construct a hexagram from the bottom line upward. Each
              toss of the three coins produces a numerical value that
              determines whether the resulting line is yin (broken) or yang
              (solid), and crucially, whether it is a &ldquo;moving line&rdquo; — a line
              in a state of transformation. When a moving line appears, the
              original hexagram transforms into a second hexagram, and it is
              the interplay between these two hexagrams that reveals the
              trajectory of the situation being asked about.
            </p>

            <p>
              What sets Liu Yao apart from simpler I Ching readings is its
              sophisticated analytical framework known as the Six Relatives
              system (六親). Each line of the hexagram is assigned one of six
              relational roles — Parent (父母), Sibling (兄弟), Offspring (子孫),
              Wealth (妻財), Authority (官鬼), and Self — based on the
              interaction of the Five Elements (wood, fire, earth, metal,
              water). These relationships create a dynamic map of the forces
              at play in your situation. For example, when asking about a
              career opportunity, the Authority line represents bosses and
              official matters, the Wealth line represents salary and
              financial gain, and the Sibling line may indicate competition
              from peers.
            </p>

            <p>
              Practical applications of Liu Yao are remarkably broad. It
              excels at answering yes-or-no questions, evaluating the timing
              of events, assessing relationships, predicting the outcome of
              business ventures, and gauging whether a particular course of
              action is favorable. Because each reading is cast at a specific
              moment in time for a specific question, Liu Yao captures the
              unique energetic signature of that moment — a principle the
              Chinese call &ldquo;the mechanism of heaven responding to the
              sincerity of the questioner&rdquo; (天機感應). This makes every
              reading deeply personal and situationally relevant.
            </p>
          </div>
        </section>

        {/* Gold Separator */}
        <div className="flex items-center justify-center my-12">
          <div className="h-px w-16 bg-gold/30" />
          <div className="mx-4 text-gold/60 text-2xl">&#9753;</div>
          <div className="h-px w-16 bg-gold/30" />
        </div>

        {/* Chinese Content */}
        <section className="card-quiet rounded-2xl p-8 md:p-10 mb-8">
          <h2 className="text-2xl font-serif text-gold mb-6">
            六爻占卜簡介
          </h2>

          <div className="space-y-5 text-foreground/80 leading-relaxed">
            <p>
              六爻占卜是中國傳統預測學中最為精準實用的方法之一，源自《周易》，經漢代京房等易學大家發展完善，至今已有兩千餘年的歷史。與八字、紫微斗數等推算先天命運的方法不同，六爻擅長針對具體事件進行預測——無論是求職面試的結果、投資決策的吉凶，還是感情走向的判斷，六爻都能給出清晰的方向指引。正因其「一事一占」的特點，六爻在民間廣受歡迎，被譽為「卜筮之王」。
            </p>

            <p>
              六爻的起卦方式簡單而莊重：搖動三枚銅錢（或硬幣），連擲六次，由下而上逐步構建出一個六爻卦象。每次投擲的結果決定該爻是陰爻（斷開）還是陽爻（實線），以及是否為「動爻」。動爻是六爻預測的關鍵——當某爻發動時，本卦會變化為之卦，而本卦與之卦之間的關係正是揭示事物發展軌跡的核心密碼。這種「以變觀變」的思維方式，體現了《易經》「變易」的根本精神。
            </p>

            <p>
              六爻分析的精髓在於「六親」體系。每一爻根據五行生克關係被賦予父母、兄弟、子孫、妻財、官鬼五種六親屬性。不同的問題對應不同的「用神」——問事業看官鬼，問財運看妻財，問考試看父母，問子女看子孫。通過分析用神的旺衰、與世爻（代表求測者）的關係、動爻的影響以及日月建的作用，便能對事情的吉凶成敗做出準確判斷。這套完整的分析系統使六爻遠超一般的占卜方法，達到了相當高的預測精度。
            </p>

            <p>
              在實際應用中，六爻占卜的適用範圍非常廣泛。它可以回答明確的是非題，例如「這次面試能否成功？」；可以判斷事件發生的時機，例如「這筆款項何時能到賬？」；也可以分析複雜的情境，例如「這段合作關係的前景如何？」。六爻講究「心誠則靈」——在搖卦的當下，心中專注於所問之事，天地間的信息便會透過銅錢的陰陽組合，呈現在卦象之中。這既是古人的智慧結晶，也是宇宙萬物息息相關的深刻體現。
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center my-16">
          <div className="card-quiet rounded-2xl p-10">
            <h2 className="text-2xl font-serif text-gold mb-4">
              Ready to Cast Your Hexagram?
            </h2>
            <p className="text-foreground/60 mb-8 max-w-xl mx-auto">
              Focus on your question, cast the coins, and let the ancient
              wisdom of Liu Yao reveal the answer. Our AI-powered analysis
              interprets the Six Relatives, moving lines, and Five Elements
              to deliver a clear, actionable reading.
            </p>
            <Link
              href="/divination/liuyao"
              className="inline-block px-10 py-4 bg-gold hover:bg-gold/90 text-navy-950 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-gold/20"
            >
              Start Liu Yao Divination
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-serif text-gold mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <div key={index} className="card-quiet rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-semibold text-gold mb-3">
                  {item.question}
                </h3>
                <p className="text-foreground/80 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Note */}
        <div className="text-center text-foreground/40 text-sm pb-8">
          <p>For reference and entertainment purposes only. Not a substitute for professional advice.</p>
          <p className="mt-1">僅供參考與娛樂用途，不構成任何專業建議。</p>
        </div>
      </div>
    </div>
  )
}
