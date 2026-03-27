import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Qi Men Dun Jia (奇門遁甲) - Strategic Divination & Timing',
  description:
    'Explore Qi Men Dun Jia, the ancient Chinese art of strategic timing. Master the 9 palaces, 8 doors, and 3 wonders for business, travel, and life decisions.',
  keywords: [
    'Qi Men Dun Jia',
    '奇門遁甲',
    'Chinese divination',
    'strategic timing',
    '9 palaces',
    '8 doors',
    '8 gods',
    '3 wonders',
    '6 Yi',
    'Zhuge Liang strategy',
    'Chinese metaphysics',
    'timing chart',
    'feng shui',
    'business divination',
    'ancient Chinese wisdom',
  ],
  openGraph: {
    title: 'Qi Men Dun Jia (奇門遁甲) - Strategic Divination & Timing',
    description:
      'Explore Qi Men Dun Jia, the ancient Chinese art of strategic timing. Master the 9 palaces, 8 doors, and 3 wonders for business, travel, and life decisions.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qi Men Dun Jia (奇門遁甲) - Strategic Divination & Timing',
    description:
      'Explore Qi Men Dun Jia, the ancient Chinese art of strategic timing. Master the 9 palaces, 8 doors, and 3 wonders for business, travel, and life decisions.',
  },
}

const faqs = [
  {
    question: 'What is Qi Men Dun Jia used for?',
    answer:
      'Qi Men Dun Jia is used for strategic decision-making and optimal timing. Historically employed by military strategists like Zhuge Liang, it is now widely applied to business negotiations, travel planning, career moves, relationship decisions, and any situation where choosing the right moment is critical. The system maps cosmic energies across nine palaces to reveal which directions and timeframes are most auspicious for a given action.',
  },
  {
    question: 'Is Qi Men Dun Jia related to Feng Shui?',
    answer:
      'While both Qi Men Dun Jia and Feng Shui belong to the broader family of Chinese metaphysics and share foundational concepts like the Five Elements and the Lo Shu magic square, they serve different purposes. Feng Shui focuses on the arrangement of space and environment to harmonize energy flow, whereas Qi Men Dun Jia is primarily concerned with the dimension of time, identifying the most favorable moments and directions for taking action. Practitioners often use both systems together for comprehensive guidance.',
  },
  {
    question: 'How does the Qi Men Dun Jia timing chart work?',
    answer:
      'A Qi Men Dun Jia chart is constructed based on the precise date and time of a question or event. The chart maps the positions of the 8 Doors, 8 Gods, 9 Stars, 3 Wonders, and 6 Yi across the 9 Palaces of the Lo Shu grid. Each palace represents a direction and a set of influences. By analyzing the interactions between these elements, a practitioner determines which directions carry favorable energy and which time windows are optimal for the intended action.',
  },
  {
    question: 'Can Qi Men Dun Jia help with business decisions?',
    answer:
      'Absolutely. Qi Men Dun Jia has been applied to business strategy for centuries. Modern practitioners use it to select auspicious dates for launching products, signing contracts, opening new offices, and entering negotiations. The system reveals favorable directions for meetings and identifies time periods where certain types of business activities are more likely to succeed. Many entrepreneurs in East Asia routinely consult Qi Men charts before major commercial decisions.',
  },
]

export default function QimenPage() {
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
    name: 'Qi Men Dun Jia Divination',
    description:
      'Interactive Qi Men Dun Jia strategic timing and divination tool based on ancient Chinese metaphysics.',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
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
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-gold mb-4">
            Qi Men Dun Jia - The Art of Strategic Timing
          </h1>
          <p
            className="text-3xl md:text-4xl font-serif text-gold/80 mb-6"
            lang="zh"
          >
            奇門遁甲
          </p>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            The supreme strategic divination system of ancient China, used by
            legendary generals and imperial advisors for over two thousand years.
          </p>
        </section>

        {/* English Content */}
        <section className="glass-card p-8 md:p-10 mb-12">
          <h2 className="text-2xl font-serif text-gold mb-6">
            Origins in Military Strategy
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            Qi Men Dun Jia, literally translated as &ldquo;Mysterious Gates
            Escaping Techniques,&rdquo; is one of the three supreme arts of
            Chinese metaphysics alongside Da Liu Ren and Tai Yi Shen Shu. Its
            origins are steeped in legend: tradition holds that the system was
            first devised by the mythical Nine Heavens Mysterious Lady and later
            refined by the Yellow Emperor during his legendary battles against
            Chi You around 2700 BCE. Throughout the dynasties, the art was
            guarded as a closely held military secret. The celebrated strategist
            Zhuge Liang of the Three Kingdoms era was said to have employed Qi
            Men Dun Jia to orchestrate his most famous victories, choosing
            precise moments to advance, retreat, and set decisive ambushes.
            Other historical generals, including Zhang Liang of the Han Dynasty
            and Liu Bowen of the Ming Dynasty, were reputed masters of this
            system.
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            The Structure: Palaces, Doors, Gods, and Wonders
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            At the heart of Qi Men Dun Jia lies the Lo Shu magic square,
            divided into Nine Palaces that correspond to the eight cardinal and
            intercardinal directions plus a central palace. Layered upon this
            grid are the Eight Doors (Ba Men) &mdash; Rest, Life, Harm, Block,
            View, Death, Shock, and Open &mdash; each carrying distinct
            qualities that influence the nature of actions taken in their
            direction. The Eight Gods (Ba Shen) provide a celestial layer of
            influence, representing cosmic forces that can support or hinder
            endeavors. The Three Wonders (San Qi) &mdash; Yi, Bing, and
            Ding &mdash; are auspicious stems that act as keys to unlocking
            favorable outcomes, while the Six Yi represent concealment and
            strategic withdrawal. Together with the Nine Stars drawn from the
            Big Dipper constellation, these components create a multidimensional
            map of time and space that reveals hidden opportunities and dangers.
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            How Qi Men Dun Jia Works for Timing Decisions
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            A Qi Men Dun Jia chart is erected for a specific moment in time.
            Based on the solar term, the hour, and the day, each component is
            assigned to one of the Nine Palaces. The practitioner then reads
            the interactions between the Doors, Stars, Gods, and Stems within
            each palace to determine which directions and time windows carry
            the most favorable energy. For example, if someone needs to attend
            a critical business negotiation, the practitioner would identify
            which palace holds the Open Door combined with an auspicious Star
            and Wonder, then advise the client to approach from that direction
            at the optimal hour. The system excels at questions of timing and
            direction: when to launch a venture, which route to travel, when
            to sign an agreement, or even when to remain still and wait for
            conditions to shift.
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            Modern Applications
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            In the modern world, Qi Men Dun Jia has evolved far beyond the
            battlefield. Entrepreneurs across East Asia consult Qi Men charts
            before launching companies, entering negotiations, or expanding
            into new markets. Real estate professionals use it alongside Feng
            Shui to select optimal dates for property transactions and
            groundbreaking ceremonies. Individuals apply the system to personal
            decisions such as career changes, important travel, medical
            consultations, and relationship milestones. The integration of
            technology has made the art more accessible than ever: traditional
            chart calculations that once required years of training can now be
            generated instantly, allowing practitioners to focus on
            interpretation and strategic advice. Despite its ancient origins,
            Qi Men Dun Jia remains a living tradition, continuously adapted by
            modern masters to address the complexities of contemporary life.
          </p>
        </section>

        {/* Gold Separator */}
        <div className="flex items-center justify-center my-12">
          <div className="h-px w-24 bg-gold/40" />
          <div className="mx-4 text-gold/60 text-2xl">&#9670;</div>
          <div className="h-px w-24 bg-gold/40" />
        </div>

        {/* Chinese Content */}
        <section className="glass-card p-8 md:p-10 mb-12" lang="zh">
          <h2 className="text-2xl font-serif text-gold mb-6">
            奇門遁甲的起源
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            奇門遁甲被誉为中国古代最高层次的预测学之一，与大六壬、太乙神数并称"三式"。相传其源于上古时期，由九天玄女传授黄帝，用以在涿鹿之战中击败蚩尤。后经历代圣贤不断完善，姜太公、张良、诸葛亮、刘伯温等传奇人物皆精通此术。在中国历史上，奇门遁甲长期作为帝王之术被严格保密，民间流传甚少，直到近现代才逐渐公开传播。作为一套融合天文、地理、数学与哲学的综合体系，它承载了中华文明数千年的智慧结晶。
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            九宫、八门与三奇六仪
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            奇门遁甲以洛书九宫为基础框架，将天盘、地盘、人盘、神盘四层信息叠加于九个宫位之中。八门——休、生、伤、杜、景、死、惊、开——代表人事层面的吉凶状态，每扇门都有其独特的能量属性。八神——值符、腾蛇、太阴、六合、白虎、玄武、九地、九天——则象征天界力量对事态的影响。三奇（乙、丙、丁）为吉祥天干，能够化解困境、开启机遇；六仪（戊、己、庚、辛、壬、癸）则代表隐藏与防御的力量。这些元素在九宫中的不同组合，构成了一幅动态的时空能量图。
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            择时与方位的实战运用
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            奇门遁甲最核心的功能在于择时择方。通过排盘分析特定时刻九宫中各元素的组合关系，术者能够判断哪个方位蕴含最有利的能量，哪个时间段最适合采取行动。无论是商务谈判、出行旅途、签约合作还是重大抉择，奇门遁甲都能提供精准的时机与方位建议。在实际操作中，吉门、吉星、吉神三者同宫的方位为大吉之方，而凶门、凶星相叠之处则应尽量回避。掌握了这套系统，就如同拥有了一张看透时间与空间能量流动的地图。
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            现代生活中的奇门智慧
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            在当代社会，奇门遁甲已从古代战场走进现代商业与日常生活。许多企业家在重大商业决策前会参考奇门排盘，选择最佳时机签订合同、启动项目或开拓新市场。房地产从业者将其与风水学结合，精准选定动土开工、交易过户的吉日良辰。个人则将其应用于求职面试、考试升学、就医问诊等人生重要时刻。随着科技的进步，传统上需要大量运算的排盘过程已可通过数字工具即时完成，让更多人能够接触并受益于这一古老智慧。奇门遁甲并非迷信，而是一套经过千年实践验证的时空决策系统，在现代依然展现着独特的价值。
          </p>
        </section>

        {/* CTA */}
        <section className="text-center mb-16">
          <Link
            href="/divination/qimen"
            className="inline-block bg-gold hover:bg-gold/90 text-navy-950 font-bold text-lg px-10 py-4 rounded-lg transition-colors"
          >
            Start Your Qi Men Dun Jia Reading
          </Link>
          <p className="text-white/50 mt-4 text-sm">
            Discover the optimal timing and direction for your next important
            decision.
          </p>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-serif text-gold text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="glass-card p-6 md:p-8">
                <h3 className="text-lg font-semibold text-gold mb-3">
                  {faq.question}
                </h3>
                <p className="text-white/80 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
