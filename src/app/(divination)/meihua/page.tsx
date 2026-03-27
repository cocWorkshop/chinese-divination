import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mei Hua Yi Shu (梅花易數) - Plum Blossom Numerology',
  description:
    'Discover Mei Hua Yi Shu, the ancient Chinese plum blossom numerology system. Derive hexagrams from numbers and time for quick, precise divination answers.',
  keywords: [
    'Mei Hua Yi Shu',
    '梅花易數',
    'Plum Blossom Numerology',
    'Plum Blossom Divination',
    'Chinese numerology',
    'hexagram divination',
    'Shao Yong',
    '邵雍',
    'Ti Yong',
    'number divination',
    'I Ching numerology',
    'spontaneous divination',
  ],
  openGraph: {
    title: 'Mei Hua Yi Shu (梅花易數) - Plum Blossom Numerology',
    description:
      'Discover Mei Hua Yi Shu, the ancient Chinese plum blossom numerology system. Derive hexagrams from numbers and time for quick, precise divination answers.',
    type: 'website',
    url: 'https://chinese-divination.com/meihua',
    siteName: '玄機 Xuanji',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mei Hua Yi Shu (梅花易數) - Plum Blossom Numerology',
    description:
      'Discover Mei Hua Yi Shu, the ancient Chinese plum blossom numerology system. Derive hexagrams from numbers and time for quick, precise divination answers.',
  },
}

const faqs = [
  {
    question: 'How is Mei Hua different from I Ching?',
    answer:
      'While both systems use the 64 hexagrams, Mei Hua Yi Shu derives hexagrams through numbers, time, or spontaneous observation rather than yarrow stalks or coin tosses. It also uniquely employs the Ti (體) and Yong (用) framework to analyze relationships between the upper and lower trigrams, enabling rapid and highly specific predictions about concrete questions.',
  },
  {
    question: 'What can I ask about?',
    answer:
      'Mei Hua Yi Shu excels at answering specific, time-sensitive questions. Common topics include career decisions, relationship outcomes, business negotiations, travel plans, lost objects, and health concerns. The more focused your question, the more precise the reading will be.',
  },
  {
    question: 'How does number-based divination work?',
    answer:
      'In Mei Hua, numbers are converted into trigrams using their remainder when divided by eight, corresponding to the eight trigrams (Ba Gua). The current date and time also contribute numbers, which together form the upper trigram, lower trigram, and the moving line of the hexagram. This mathematical approach replaces physical coin or stalk methods.',
  },
  {
    question: 'Why is it called Plum Blossom?',
    answer:
      'The name comes from a famous story about its creator, Shao Yong. One winter day, he observed two sparrows fighting over a plum blossom branch. Inspired, he cast a hexagram based on the number of sparrows and the time of observation, accurately predicting that a young woman would come to pick the blossoms the next day and be startled, falling and injuring her leg. This event demonstrated the power of spontaneous, observation-based divination.',
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
  name: 'Mei Hua Yi Shu - Plum Blossom Numerology',
  description:
    'AI-powered Mei Hua Yi Shu divination. Get instant plum blossom numerology readings with expert interpretation.',
  url: 'https://chinese-divination.com/divination/meihua',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

export default function MeiHuaPage() {
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
            Mei Hua Yi Shu - Plum Blossom Numerology
          </h1>
          <p className="text-3xl md:text-4xl font-serif text-gold/70 mb-6">
            梅花易數
          </p>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            An ancient system of spontaneous divination through numbers, time,
            and observation — perfected over a thousand years ago and still
            remarkably precise today.
          </p>
        </section>

        {/* English Content */}
        <section className="glass-card rounded-2xl p-8 md:p-12 mb-12">
          <h2 className="text-2xl font-serif text-gold mb-6">
            The Origin of Plum Blossom Numerology
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            Mei Hua Yi Shu, literally &ldquo;Plum Blossom Number
            Studies,&rdquo; was developed by the great Song dynasty scholar and
            cosmologist Shao Yong (邵雍, 1011&ndash;1077 CE). Shao Yong was a
            master of the I Ching who sought a faster, more intuitive method of
            divination than the traditional yarrow stalk ritual. The system gets
            its poetic name from a pivotal moment: observing two sparrows
            fighting over a plum blossom branch in his garden, Shao Yong
            spontaneously derived a hexagram from what he saw — the number of
            birds, the direction they came from, and the hour of the day. His
            prediction proved strikingly accurate, and the method was born. Over
            the centuries, Mei Hua Yi Shu has become one of the most popular
            divination systems in China, prized for its speed, elegance, and
            directness.
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            How Mei Hua Divination Works
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            Unlike traditional I Ching divination, which relies on casting coins
            or sorting yarrow stalks, Mei Hua derives hexagrams purely from
            numbers. A practitioner may use the current date and time, a number
            spoken by the querent, the number of strokes in a Chinese character,
            or any numerically quantifiable observation — the count of birds on a
            branch, petals on a flower, or people in a room. These numbers are
            divided by eight to produce remainders that map to the eight trigrams
            (Ba Gua). The upper and lower trigrams combine to form a hexagram,
            and a moving line is determined by dividing the total number by six.
            This mathematical elegance means a skilled practitioner can generate
            a reading in seconds, anywhere, without any tools — making Mei Hua
            the most spontaneous of all Chinese divination methods.
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            The Ti (體) and Yong (用) Framework
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            What truly sets Mei Hua apart is its analytical framework of Ti
            (體, &ldquo;body&rdquo; or &ldquo;substance&rdquo;) and Yong
            (用, &ldquo;function&rdquo; or &ldquo;application&rdquo;). In every
            hexagram, the trigram without the moving line represents Ti — the
            subject or the querent — while the trigram containing the moving line
            represents Yong — the object, situation, or external force being
            asked about. The Five Elements (Wu Xing) relationship between Ti and
            Yong reveals the outcome: if Yong generates or supports Ti, the
            situation is favorable; if Yong controls or drains Ti, challenges lie
            ahead. This binary analysis, combined with the imagery of the
            trigrams themselves, allows for remarkably nuanced and specific
            interpretations that go far beyond simple &ldquo;good or
            bad&rdquo; judgments.
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            Quick Answers to Specific Questions
          </h2>
          <p className="text-white/80 leading-relaxed">
            Mei Hua Yi Shu is the divination system of choice when you need a
            clear answer to a concrete question. Should I accept this job offer?
            Will my business negotiation succeed? Is this a good time to travel?
            Where is my lost item? Unlike broad destiny readings such as BaZi or
            Zi Wei Dou Shu, Mei Hua focuses on the immediate situation and
            delivers pointed, actionable insight. The spontaneity of the method
            is considered a strength: the very moment you think of a question,
            the universe has already provided the answer in the numbers and
            circumstances around you. All the practitioner does is decode the
            message that is already present.
          </p>
        </section>

        {/* Gold Separator */}
        <div className="flex items-center justify-center my-12">
          <div className="h-px w-16 bg-gold/40" />
          <span className="mx-4 text-gold/60 text-2xl">✦</span>
          <div className="h-px w-16 bg-gold/40" />
        </div>

        {/* Chinese Content */}
        <section className="glass-card rounded-2xl p-8 md:p-12 mb-12">
          <h2 className="text-2xl font-serif text-gold mb-6">
            梅花易數的起源
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            梅花易數由北宋著名易學家邵雍（1011&ndash;1077年）所創。邵雍精研《易經》數十年，深通先天易學之理，希望找到一種更加快捷直覺的占卜方法。相傳某年冬日，邵雍在自家園中觀梅，見兩隻麻雀爭落於梅枝之上。他當即以所見之數與時辰起卦，準確預測出次日將有一少女前來折花，不慎跌傷。此事傳為佳話，「梅花易數」之名由此而來。經過近千年的發展與完善，梅花易數已成為中國最受歡迎的占卜術之一，以其快速、優雅、直接而著稱於世。
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            起卦方法與數理原理
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            梅花易數與傳統易經占卜的最大不同在於其起卦方式——純以數理推演。占卜者可以年月日時為數，可以求測者隨口報出之數字起卦，也可以漢字筆畫數、所見事物之數量等任何可以量化的觀察為基礎。將所得之數除以八取餘數，即對應八卦之一。上下兩卦組合成一個六爻卦象，再以總數除以六確定動爻所在。這種精妙的數學方法意味著熟練的占卜師可以在數秒之內、任何場所、無需任何工具即可完成起卦，是所有中國占卜術中最為靈活即時的方法。
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            體用生克之理
          </h2>
          <p className="text-white/80 leading-relaxed mb-6">
            梅花易數最獨特之處在於其「體用」分析框架。每一卦中，不含動爻的經卦為「體」——代表問事之人或主體；含動爻的經卦為「用」——代表所問之事或外部力量。通過分析體用二卦的五行生克關係來判斷吉凶：用生體則事順，用克體則事阻，體克用則可成但需努力，體生用則有所耗損。這種分析方法配合卦象本身的意象，能夠做出極為細緻和具體的判斷，遠超簡單的吉凶論斷。
          </p>

          <h2 className="text-2xl font-serif text-gold mb-6">
            具體問題的即時解答
          </h2>
          <p className="text-white/80 leading-relaxed">
            梅花易數最適合用於回答具體明確的問題。是否該接受這份工作？這次談判能否成功？此時出行是否吉利？遺失之物在何方？與八字、紫微斗數等命理體系不同，梅花易數專注於當下的具體情境，給出針對性強、可操作的指引。此法之精妙在於：當你心中生出疑問的那一刻，宇宙已在你周圍的數字和情境中給出了答案。占卜師所做的，不過是解讀這已然存在的訊息而已。
          </p>
        </section>

        {/* CTA Section */}
        <section className="text-center mb-16">
          <div className="glass-card rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl font-serif text-gold mb-4">
              Try Mei Hua Yi Shu Now
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Experience the power of plum blossom numerology with our
              AI-powered divination system. Ask a specific question and receive
              an instant, detailed reading.
            </p>
            <Link
              href="/divination/meihua"
              className="inline-block px-8 py-3 bg-gold hover:bg-gold/90 text-navy-950 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-gold/20"
            >
              Start Your Mei Hua Reading
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-serif text-gold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="glass-card rounded-xl p-6 group"
              >
                <summary className="text-gold font-semibold cursor-pointer list-none flex items-center justify-between">
                  <span>{faq.question}</span>
                  <span className="text-gold/60 group-open:rotate-45 transition-transform text-xl">
                    +
                  </span>
                </summary>
                <p className="text-white/80 mt-4 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
