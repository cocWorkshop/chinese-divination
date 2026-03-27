import type { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = 'https://chinese-divination.com'

export const metadata: Metadata = {
  title: 'I Ching Oracle (易經) - Book of Changes Divination',
  description:
    'Consult the I Ching, the ancient Book of Changes. AI-powered hexagram readings interpret all 64 hexagrams with personalized guidance rooted in 3,000 years of Chinese wisdom.',
  keywords: [
    'I Ching',
    'Yi Jing',
    'Book of Changes',
    '易經',
    '易經占卜',
    'hexagram reading',
    '64 hexagrams',
    'I Ching divination',
    'Chinese oracle',
    'Yin Yang',
    'trigrams',
    'AI divination',
    'I Ching online',
    'free I Ching reading',
    'Book of Changes oracle',
  ],
  openGraph: {
    type: 'website',
    url: `${siteUrl}/iching`,
    title: 'I Ching Oracle (易經) - Book of Changes Divination',
    description:
      'Consult the I Ching, the ancient Book of Changes. AI-powered hexagram readings interpret all 64 hexagrams with personalized guidance rooted in 3,000 years of Chinese wisdom.',
    images: [
      {
        url: `${siteUrl}/og-iching.png`,
        width: 1200,
        height: 630,
        alt: 'I Ching Oracle - Book of Changes Divination',
      },
    ],
    siteName: '玄機 Xuanji',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'I Ching Oracle (易經) - Book of Changes Divination',
    description:
      'Consult the I Ching, the ancient Book of Changes. AI-powered hexagram readings interpret all 64 hexagrams with personalized guidance rooted in 3,000 years of Chinese wisdom.',
    images: [`${siteUrl}/og-iching.png`],
  },
}

const faqs = [
  {
    question: 'How do I ask a question to the I Ching?',
    answer:
      'Focus on a single, open-ended question rather than a yes-or-no query. Frame your question around how to approach a situation or what you should understand about it. For example, instead of asking "Will I get the job?", ask "What should I understand about my career path right now?" The I Ching responds best to questions that invite reflection and deeper insight.',
  },
  {
    question: 'What are hexagrams?',
    answer:
      'Hexagrams are the 64 symbolic figures at the heart of the I Ching. Each hexagram is made of six stacked lines that are either solid (Yang) or broken (Yin). These six lines form two trigrams — a lower and an upper — each representing fundamental forces of nature such as heaven, earth, water, fire, mountain, lake, wind, and thunder. Together they create a rich symbolic language that describes every possible situation and its potential for change.',
  },
  {
    question: 'Is the I Ching religious?',
    answer:
      'The I Ching is not tied to any single religion. It originated as a divination manual in ancient China and later became a foundational philosophical text influencing Confucianism, Taoism, and Buddhism alike. Many people today consult it as a tool for personal reflection and decision-making, regardless of their spiritual or secular background. It is best understood as a system of wisdom rather than a religious scripture.',
  },
  {
    question: 'How often can I consult the I Ching?',
    answer:
      'Traditionally, the I Ching counsels against asking the same question repeatedly. If you receive an answer, sit with it and reflect before consulting again. For different questions or situations, you may consult as often as you find helpful. On our platform, each reading uses a small amount of karma, and you can consult whenever you feel genuine need for guidance.',
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
  name: 'Xuanji I Ching Oracle',
  url: `${siteUrl}/iching`,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description:
    'AI-powered I Ching divination platform offering personalized hexagram readings based on 3,000 years of Chinese wisdom.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1200',
  },
}

export default function IChingLandingPage() {
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

      {/* Hero Section */}
      <section className="relative py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="glass-card rounded-2xl p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-gold mb-4 leading-tight">
              I Ching Oracle — Book of Changes
            </h1>
            <p className="text-2xl md:text-3xl font-serif text-gold/80 mb-6">
              易經占卜
            </p>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Consult the oldest and most revered divination system in the world.
              Let the wisdom of the 64 hexagrams illuminate your path forward.
            </p>
          </div>
        </div>
      </section>

      {/* English Content */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="glass-card rounded-2xl p-8 md:p-10 space-y-6">
          <h2 className="text-2xl md:text-3xl font-serif text-gold mb-4">
            What Is the I Ching?
          </h2>
          <p className="text-white/80 leading-relaxed">
            The I Ching, also known as the Yi Jing or the Book of Changes, is one of the oldest texts
            in recorded history. Originating over 3,000 years ago during the Western Zhou dynasty
            (approximately 1000 BCE), it began as a divination manual used by court officials and
            rulers seeking guidance on matters of state, warfare, and agriculture. Over the centuries
            it evolved into a foundational philosophical text that profoundly shaped Chinese thought,
            influencing Confucius, Laozi, and generations of scholars. Its core premise is deceptively
            simple: the universe is in constant flux, and understanding the patterns of change allows
            us to navigate life with greater wisdom and clarity.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif text-gold mb-4">
            The 64 Hexagrams and the Trigram System
          </h2>
          <p className="text-white/80 leading-relaxed">
            At the heart of the I Ching lies a system of 64 hexagrams, each composed of six
            horizontal lines stacked upon one another. Each line is either solid (representing Yang,
            the active and creative principle) or broken (representing Yin, the receptive and yielding
            principle). Every hexagram is formed by combining two trigrams — three-line figures that
            each symbolize a fundamental force of nature. The eight trigrams represent Heaven, Earth,
            Water, Fire, Mountain, Lake, Wind, and Thunder. When paired together, these trigrams
            produce the 64 hexagrams, creating a comprehensive symbolic map of every possible
            situation a person might encounter. Each hexagram carries a name, a judgment, and a
            detailed image text, along with individual line commentaries that add nuance depending on
            which lines are active or changing.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif text-gold mb-4">
            How I Ching Divination Works
          </h2>
          <p className="text-white/80 leading-relaxed">
            Traditional I Ching divination involves a ritual process of casting. The most ancient
            method uses 50 yarrow stalks, divided and counted through a series of steps to generate
            each line of a hexagram. A more accessible method, popularized during the Han dynasty,
            uses three coins tossed six times. Each toss produces a line — either Yin or Yang — and
            some lines are identified as &quot;changing lines,&quot; meaning they are in the process
            of transforming from Yin to Yang or vice versa. These changing lines are crucial: they
            point to the specific areas of movement in your situation and generate a second hexagram
            that reveals where your circumstances are heading. The interplay between the primary
            hexagram and the transformed hexagram provides a dynamic, layered reading rather than a
            static answer.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif text-gold mb-4">
            AI-Powered Interpretation
          </h2>
          <p className="text-white/80 leading-relaxed">
            On our platform, we combine the time-honored casting process with advanced AI
            interpretation. When you ask a question, our system generates your hexagram using
            authentic randomization methods that honor the probabilistic structure of the original
            yarrow-stalk oracle. The AI then analyzes your hexagram, its changing lines, and the
            resulting transformed hexagram in the context of classical commentaries — including the
            Ten Wings traditionally attributed to Confucius — as well as centuries of scholarly
            interpretation. The result is a personalized reading that bridges ancient symbolic
            language with clear, modern guidance tailored to your specific question. Whether you are
            seeking clarity on a relationship, a career decision, or a period of personal growth, the
            I Ching meets you where you are with insight that is both timeless and immediately
            applicable.
          </p>
        </div>
      </section>

      {/* Decorative Separator */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <span className="text-gold/60 text-2xl font-serif">☰ ☷</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </div>
      </div>

      {/* Chinese Content */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="glass-card rounded-2xl p-8 md:p-10 space-y-6">
          <h2 className="text-2xl md:text-3xl font-serif text-gold mb-4">
            易經簡介
          </h2>
          <p className="text-white/80 leading-relaxed">
            《易經》又稱《周易》，是中華文明最古老、最重要的經典之一。它誕生於三千多年前的西周時期，最初是供王室與官員進行占卜決策的工具。經過孔子及歷代儒者的整理與詮釋，《易經》早已超越了單純的占卜手冊，成為中國哲學、文學、科學與藝術的根基。其核心思想認為，宇宙萬物皆處於不斷變化之中，唯有理解變化的規律，才能順應天道、把握時機。
          </p>

          <h2 className="text-2xl md:text-3xl font-serif text-gold mb-4">
            六十四卦與八卦體系
          </h2>
          <p className="text-white/80 leading-relaxed">
            易經的核心是由六十四個卦象組成的完整體系。每個卦象由六條橫線（爻）上下排列而成，每條爻分為陽爻（實線，代表剛健、主動）與陰爻（虛線，代表柔順、包容）。六爻又分為上下兩組三爻，即上卦與下卦，各自對應八卦之一：乾（天）、坤（地）、坎（水）、離（火）、艮（山）、兌（澤）、巽（風）、震（雷）。八卦兩兩相合，形成六十四種卦象，象徵人生中所有可能的情境與變化。每一卦都附有卦辭、象辭和逐爻的爻辭，為求問者提供精準而深邃的指引。
          </p>

          <h2 className="text-2xl md:text-3xl font-serif text-gold mb-4">
            AI 智慧解卦
          </h2>
          <p className="text-white/80 leading-relaxed">
            在玄機平台上，我們將傳統的起卦方法與先進的人工智慧技術相結合。當您提出問題時，系統會依據傳統蓍草占卜的機率結構，以嚴謹的隨機演算法生成卦象。AI隨後結合《十翼》等經典注疏以及歷代學者的詮釋，針對您的本卦、變爻與之卦進行全面分析，最終呈現一份既忠實於古典智慧、又貼合您具體問題的個人化解讀。無論您是在感情、事業還是自我成長方面尋求指引，易經的智慧都將為您點亮前行的方向。
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-serif text-gold mb-4">
            Begin Your I Ching Reading
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Focus your mind, form your question, and let the ancient wisdom of the Book of Changes
            guide you. Your hexagram awaits.
          </p>
          <Link
            href="/divination/iching"
            className="inline-block bg-gold hover:bg-gold/90 text-navy-950 font-semibold px-8 py-3 rounded-xl transition-colors duration-200 text-lg"
          >
            Consult the I Ching
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-serif text-gold text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="glass-card rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-gold mb-3">
                {faq.question}
              </h3>
              <p className="text-white/80 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="pb-16" />
    </div>
  )
}
