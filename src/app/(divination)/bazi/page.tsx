import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'BaZi Reading (四柱八字) - Four Pillars of Destiny Analysis',
  description:
    'Discover your destiny with a free AI-powered BaZi (Four Pillars) reading. Analyze birth date and time using Chinese metaphysics to reveal career, love, and wealth insights.',
  keywords: [
    'BaZi',
    'Four Pillars of Destiny',
    '八字',
    '四柱八字',
    'BaZi reading',
    'Chinese astrology',
    'birth chart analysis',
    'five elements',
    'destiny analysis',
    'BaZi calculator',
    'four pillars chart',
    'Chinese metaphysics',
    'AI BaZi reading',
    'free BaZi analysis',
    'BaZi compatibility',
    'career astrology',
    'wealth luck cycle',
  ],
  openGraph: {
    type: 'website',
    url: 'https://chinese-divination.com/bazi',
    title: 'BaZi Reading (四柱八字) - Four Pillars of Destiny Analysis',
    description:
      'Discover your destiny with a free AI-powered BaZi (Four Pillars) reading. Analyze birth date and time using Chinese metaphysics to reveal career, love, and wealth insights.',
    images: [
      {
        url: 'https://chinese-divination.com/og-bazi.png',
        width: 1200,
        height: 630,
        alt: 'BaZi Four Pillars of Destiny Reading',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaZi Reading (四柱八字) - Four Pillars of Destiny Analysis',
    description:
      'Discover your destiny with a free AI-powered BaZi reading. Analyze your birth chart using the ancient Four Pillars system.',
    images: ['https://chinese-divination.com/og-bazi.png'],
  },
}

const faqs = [
  {
    question: 'What do I need for a BaZi reading?',
    answer:
      'You need your exact birth date (year, month, and day) and ideally your birth hour. In BaZi, the birth hour determines one of the four pillars, so having it produces a more complete and accurate chart. If you do not know your birth hour, a partial reading based on three pillars is still possible and can yield valuable insights.',
  },
  {
    question: 'How accurate is BaZi?',
    answer:
      'BaZi has been refined over more than a thousand years of practice and scholarly study. Its accuracy depends on the precision of your birth data and the skill of the interpreter. Our AI draws on classical BaZi theory combined with modern analytical methods to deliver readings that are consistent, thorough, and highly regarded by users. While no system can predict events with certainty, BaZi excels at mapping tendencies, timing, and the interplay of elemental forces in your life.',
  },
  {
    question: "What is the difference between BaZi and Western astrology?",
    answer:
      'Western astrology is based on the position of planets and zodiac constellations at your time of birth. BaZi, by contrast, is rooted in the Chinese calendar system and the theory of the Five Elements (Wood, Fire, Earth, Metal, and Water). Rather than planetary transits, BaZi analyzes the cyclical interaction of Heavenly Stems and Earthly Branches to map your destiny. The two systems use entirely different frameworks but can be complementary.',
  },
  {
    question: 'Can BaZi predict the future?',
    answer:
      'BaZi does not predict specific events in the way a fortune teller might. Instead, it maps the energetic landscape of your life across time through Luck Pillars (大運) and annual cycles. It reveals periods of opportunity, challenge, growth, and rest, allowing you to make better decisions about career moves, relationships, investments, and personal development. Think of it as a strategic roadmap rather than a crystal ball.',
  },
]

export default function BaZiPage() {
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
    name: 'Xuanji BaZi Reading',
    url: 'https://chinese-divination.com/bazi',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      'Free AI-powered BaZi (Four Pillars of Destiny) reading based on Chinese metaphysics. Get personalized insights into your career, relationships, health, and wealth timing.',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1260',
    },
  }

  return (
    <div className="min-h-screen bg-navy-950">
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
        <section className="glass-card rounded-2xl p-8 md:p-12 text-center mb-12">
          <p className="text-white/50 text-sm uppercase tracking-widest mb-4">
            Ancient Wisdom, Modern Insight
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-gold mb-4">
            BaZi &mdash; Four Pillars of Destiny
          </h1>
          <p className="text-2xl md:text-3xl text-gold/70 font-serif mb-6">
            四柱八字
          </p>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Unlock the blueprint of your life encoded in the moment of your
            birth. BaZi reveals the elemental forces that shape your personality,
            career, relationships, and fortune.
          </p>
        </section>

        {/* English Content */}
        <section className="glass-card rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gold mb-6">
            What Is BaZi (Four Pillars of Destiny)?
          </h2>
          <div className="space-y-5 text-white/80 leading-relaxed">
            <p>
              BaZi, literally meaning &ldquo;Eight Characters,&rdquo; is one of
              the most sophisticated systems of destiny analysis in Chinese
              metaphysics. Developed over centuries of observation and
              refinement, it constructs a personal chart from four pillars, each
              composed of two characters: a Heavenly Stem and an Earthly Branch.
              These four pillars correspond to the year, month, day, and hour of
              your birth, producing an eight-character code that maps the
              elemental energies present at the exact moment you entered the
              world. Practitioners and scholars consider BaZi the cornerstone of
              Chinese astrological practice, alongside Zi Wei Dou Shu and Qi Men
              Dun Jia.
            </p>
            <p>
              At the heart of BaZi lies the theory of the Five Elements: Wood,
              Fire, Earth, Metal, and Water. These elements interact through
              cycles of generation and control&mdash;Wood feeds Fire, Fire
              creates Earth, Earth yields Metal, Metal collects Water, and Water
              nourishes Wood. Conversely, each element also restrains another.
              Your BaZi chart reveals how these elemental forces are distributed
              and balanced within your personal constitution. A chart strong in
              Water but lacking Fire, for example, suggests a person of deep
              intellect and adaptability who may need to cultivate warmth,
              passion, and visibility. Understanding this elemental balance is
              the first step toward aligning your choices with your innate
              strengths.
            </p>
            <p>
              What makes BaZi especially powerful is its ability to map the
              timing of life events through Luck Pillars (大運) and annual
              pillars. Your Luck Pillars unfold in ten-year cycles, each
              governed by a different elemental combination that interacts with
              your natal chart. This means BaZi does not simply describe who you
              are&mdash;it illuminates <em>when</em> certain opportunities and
              challenges are most likely to arise. Career breakthroughs,
              relationship milestones, financial windfalls, and health concerns
              all have their seasons. By understanding these cycles, you can make
              strategic decisions: when to launch a business, when to invest,
              when to focus on health, and when to nurture relationships.
            </p>
            <p>
              Our platform combines the depth of classical BaZi analysis with
              the speed and consistency of artificial intelligence. The AI
              interprets your chart against a vast body of traditional
              principles, examining the relationships between your Day Master,
              the Ten Gods, hidden stems, element clashes, combinations, and
              current luck cycles. The result is a comprehensive, personalized
              reading that would traditionally take an experienced practitioner
              hours to compile. Whether you are exploring BaZi for the first
              time or seeking a second opinion on a chart you already know, our
              AI-powered analysis provides clear, actionable insights grounded in
              authentic Chinese metaphysical tradition.
            </p>
          </div>
        </section>

        {/* Decorative Separator */}
        <div className="flex items-center justify-center my-12">
          <div className="h-px w-16 bg-gold/30" />
          <span className="mx-4 text-gold/60 text-2xl">&#9753;</span>
          <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span className="mx-4 text-gold/40 text-sm tracking-widest">
            &#20013;&#25991;
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-gold/40 to-transparent" />
          <span className="mx-4 text-gold/60 text-2xl">&#9753;</span>
          <div className="h-px w-16 bg-gold/30" />
        </div>

        {/* Chinese Content */}
        <section className="glass-card rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gold mb-6">
            什么是八字命理？
          </h2>
          <div className="space-y-5 text-white/80 leading-relaxed">
            <p>
              八字，又称四柱命理，是中国传统命理学中最核心的分析体系之一。所谓"四柱"，即年柱、月柱、日柱、时柱，每柱由一个天干和一个地支组成，共八个字，因此得名"八字"。通过出生年月日时所对应的干支组合，八字构建出一个人独一无二的命盘，揭示其先天禀赋、性格特质以及一生的运势走向。八字命理与紫微斗数、奇门遁甲并称为中国命理学三大体系。
            </p>
            <p>
              八字命理的根基在于五行学说——木、火、土、金、水五种元素之间的生克制化关系。木生火、火生土、土生金、金生水、水生木，形成相生循环；同时木克土、火克金、土克水、金克木、水克火，构成相克制衡。一个人的八字命盘中，五行的分布与平衡决定了其性格倾向和人生际遇。例如，命中水旺火弱之人，往往聪慧深沉、适应力强，但可能需要在表达力与行动力方面加以培养。理解自身的五行格局，是做出正确人生选择的重要基础。
            </p>
            <p>
              八字命理的独特之处在于"大运"与"流年"的推演。大运以十年为一个周期，每个大运带来不同的五行能量，与命盘中的原局产生交互作用。这意味着八字不仅描绘一个人"是什么样的人"，更揭示"什么时候"会遇到关键的机遇与挑战。事业突破、感情转折、财运起伏、健康变化，都有其对应的时间窗口。借助大运和流年的分析，你可以更有策略地规划人生——何时创业、何时投资、何时养生、何时经营关系。
            </p>
            <p>
              我们的平台将传统八字命理的深度解析与人工智能的高效运算相结合。AI系统依据海量的经典命理法则，全面分析你的日主强弱、十神配置、藏干透出、刑冲合害以及当前大运流年的影响，生成一份详尽而个性化的命理报告。无论你是初次接触八字，还是希望获得专业级的命盘分析，我们的AI解读都能为你提供清晰、实用、根植于正统命理传承的洞见。
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mb-16">
          <Link
            href="/divination/bazi"
            className="inline-block bg-gold hover:bg-gold/90 text-navy-950 font-semibold px-8 py-3 rounded-xl text-lg transition-colors duration-200"
          >
            Start Your Free BaZi Reading
          </Link>
          <p className="text-white/50 text-sm mt-3">
            No registration required for your first reading
          </p>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="glass-card rounded-2xl p-6 border border-gold/20"
              >
                <h3 className="text-lg font-semibold text-gold mb-3">
                  {faq.question}
                </h3>
                <p className="text-white/70 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Navigation */}
        <nav className="text-center text-white/50 text-sm">
          <Link href="/" className="hover:text-gold transition-colors">
            Home
          </Link>
          <span className="mx-2">&middot;</span>
          <Link
            href="/divination"
            className="hover:text-gold transition-colors"
          >
            All Divination Services
          </Link>
          <span className="mx-2">&middot;</span>
          <Link href="/iching" className="hover:text-gold transition-colors">
            I Ching
          </Link>
          <span className="mx-2">&middot;</span>
          <Link href="/ziwei" className="hover:text-gold transition-colors">
            Zi Wei Dou Shu
          </Link>
        </nav>
      </div>
    </div>
  )
}
