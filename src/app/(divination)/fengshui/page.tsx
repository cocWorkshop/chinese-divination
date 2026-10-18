import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Feng Shui Analysis (風水) - Home & Office Energy Optimization',
  description:
    'Discover AI-powered Feng Shui analysis for your home and office. Optimize Qi flow, apply Bagua mapping, Five Elements, and Yin-Yang balance for harmony and prosperity.',
  keywords: [
    'Feng Shui',
    'Feng Shui analysis',
    'wind and water',
    'Qi energy',
    'Bagua map',
    'Five Elements',
    'Yin Yang balance',
    'home Feng Shui',
    'office Feng Shui',
    'AI Feng Shui',
    '風水',
    '風水佈局',
    '氣場',
    '八卦',
    '五行',
    '陰陽',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chinese-divination.com/fengshui',
    siteName: '玄機 Xuanji',
    title: 'Feng Shui Analysis (風水) - AI-Powered Home & Office Optimization',
    description:
      'Get personalized AI Feng Shui readings. Harmonize your living and working spaces with Bagua mapping, Qi flow analysis, and Five Elements balancing.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Feng Shui Analysis - 玄機 Xuanji AI Divination',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Feng Shui Analysis (風水) - AI Home & Office Optimization',
    description:
      'Harmonize your living space with AI-powered Feng Shui. Bagua mapping, Qi flow, Five Elements, and personalized recommendations.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://chinese-divination.com/fengshui',
  },
}

const faqs = [
  {
    question: 'What information do I need for a Feng Shui reading?',
    answer:
      'For an accurate Feng Shui reading, you should provide the layout or floor plan of your space, the compass direction your front door faces, and any specific concerns such as health, relationships, or finances. Additional details like your birth date can help tailor the Five Elements recommendations to your personal energy profile.',
  },
  {
    question: 'Can Feng Shui improve my finances?',
    answer:
      'Feng Shui identifies your wealth sector using the Bagua map and suggests adjustments to enhance the flow of prosperous Qi into that area. While Feng Shui alone cannot guarantee financial success, many practitioners report improvements in career opportunities and financial clarity after optimizing their environment. Common remedies include placing water features, healthy plants, or specific colors in the southeast wealth corner.',
  },
  {
    question: 'What is the Bagua map?',
    answer:
      'The Bagua map is an octagonal grid divided into eight sectors, each corresponding to a key life area: wealth, fame, relationships, family, health, creativity, knowledge, and career. By overlaying the Bagua onto your floor plan, you can identify which areas of your home or office correspond to each life domain and make targeted improvements to enhance the energy in those zones.',
  },
  {
    question: 'Does Feng Shui work for apartments?',
    answer:
      'Absolutely. Feng Shui principles apply to any living space regardless of size or type. In apartments, the focus shifts to optimizing the interior layout, furniture placement, color choices, and lighting. Even small adjustments such as repositioning your bed, adding mirrors to expand a cramped space, or introducing plants can significantly improve the Qi flow and overall harmony of an apartment.',
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
  name: 'Feng Shui Analysis - 玄機 Xuanji',
  url: 'https://chinese-divination.com/fengshui',
  description:
    'AI-powered Feng Shui analysis for homes and offices. Optimize Qi flow, apply Bagua mapping, and balance the Five Elements for harmony and prosperity.',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

export default function FengshuiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />

      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gold mb-4 font-serif">
              Feng Shui - Harmonize Your Living Space
            </h1>
            <p className="text-2xl md:text-3xl text-gold/80 font-serif">
              風水佈局
            </p>
            <p className="mt-6 text-lg text-foreground/60 max-w-2xl mx-auto">
              Ancient spatial wisdom meets modern AI to help you create
              environments that nurture health, wealth, and well-being.
            </p>
          </section>

          {/* English Content */}
          <section className="card-quiet p-8 md:p-12 rounded-2xl mb-12">
            <h2 className="text-2xl font-bold text-gold mb-6 font-serif">
              What Is Feng Shui?
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-6">
              Feng Shui, literally translated as &quot;wind and water,&quot; is one of
              the oldest and most enduring arts of Chinese metaphysics. Rooted
              in over three thousand years of observation and practice, Feng
              Shui examines how the arrangement of physical spaces influences
              the flow of Qi — the vital life energy that permeates all things.
              Practitioners believe that when Qi circulates freely through a
              home or workplace, it fosters good health, harmonious
              relationships, and financial prosperity. When Qi stagnates or
              flows too rapidly, it can lead to illness, conflict, and
              misfortune. The art of Feng Shui provides a systematic framework
              for diagnosing energetic imbalances and prescribing remedies that
              restore equilibrium.
            </p>

            <h2 className="text-2xl font-bold text-gold mb-6 font-serif">
              Key Concepts: Qi, Yin and Yang, and the Five Elements
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-6">
              At the heart of Feng Shui lies the concept of Qi, the invisible
              force that connects every living being to the natural world. Qi
              enters a building through doors and windows, meanders along
              corridors, and settles in the rooms where people live and work.
              The goal of Feng Shui is to guide Qi along gentle, curving paths
              rather than allowing it to rush in straight lines or pool in
              neglected corners. Complementing Qi are the principles of Yin and
              Yang — the dual forces of receptivity and activity, darkness and
              light, stillness and movement. A well-balanced space honors both
              energies: a bedroom may lean toward the Yin side with soft
              lighting and cool colors, while a home office benefits from more
              Yang energy through brighter illumination and warmer tones. The
              Five Elements — Wood, Fire, Earth, Metal, and Water — provide
              another layer of analysis. Each element governs specific colors,
              shapes, materials, and compass directions, and a skilled Feng
              Shui practitioner uses these correspondences to fine-tune the
              energy of each room.
            </p>

            <h2 className="text-2xl font-bold text-gold mb-6 font-serif">
              The Bagua Map and Spatial Analysis
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-6">
              The Bagua map is the primary diagnostic tool in Feng Shui
              analysis. This octagonal grid divides any space into eight
              sectors, each corresponding to a fundamental aspect of human life:
              career, knowledge, family, wealth, fame, relationships,
              creativity, and helpful people. A ninth sector at the center
              represents overall health and balance. By aligning the Bagua with
              the compass orientation of a building or the position of its main
              entrance, a practitioner can determine which areas of the home
              correspond to which life domains. Feng Shui applies equally to
              grand estates and modest apartments, to corporate headquarters and
              individual workstations. In the workplace, proper Feng Shui can
              enhance productivity, improve team dynamics, and attract new
              business opportunities. In residential settings, it supports
              restful sleep, nurtures family bonds, and creates a sanctuary from
              the stresses of daily life.
            </p>

            <h2 className="text-2xl font-bold text-gold mb-6 font-serif">
              AI-Powered Feng Shui Analysis
            </h2>
            <p className="text-foreground/80 leading-relaxed">
              Our AI Feng Shui analysis brings the depth of traditional
              practice into the modern era. By providing information about your
              space — its layout, compass orientation, and the activities that
              take place within — you receive a comprehensive reading that
              identifies energetic strengths and weaknesses. The analysis maps
              your space onto the Bagua, evaluates the balance of the Five
              Elements in each sector, and generates specific, actionable
              recommendations. Whether you are looking to boost your career
              prospects, improve your health, strengthen your relationships, or
              simply create a more peaceful home, our AI-powered system
              synthesizes centuries of Feng Shui wisdom to guide your
              decisions. Every recommendation is personalized to your unique
              circumstances, taking into account both the physical
              characteristics of your space and your individual goals.
            </p>
          </section>

          {/* Gold Separator */}
          <div className="flex items-center justify-center my-12">
            <div className="h-px w-24 bg-gold/40" />
            <span className="mx-4 text-gold/60 text-2xl">&#9670;</span>
            <div className="h-px w-24 bg-gold/40" />
          </div>

          {/* Chinese Content */}
          <section className="card-quiet p-8 md:p-12 rounded-2xl mb-12">
            <h2 className="text-2xl font-bold text-gold mb-6 font-serif">
              風水的起源與意義
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-6">
              風水，又稱堪輿，是中國古代流傳數千年的環境哲學。「風」代表氣流與能量的運動，「水」象徵財富與生命的滋養。風水學認為，人所居住和工作的空間與自然環境之間存在著深刻的能量聯繫。通過合理佈局和調整空間結構，可以引導「氣」的順暢流動，從而促進居住者的健康、事業和人際關係。風水不僅是一門玄學，更是一套融合天文、地理、建築與人文智慧的綜合體系。
            </p>

            <h2 className="text-2xl font-bold text-gold mb-6 font-serif">
              核心理論：氣、陰陽與五行
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-6">
              氣是風水學的根本概念，它無形無色，卻無處不在。氣通過門窗進入建築，沿著走廊和房間流動，影響著每一位居住者的運勢。陰陽學說強調平衡與和諧——臥室宜偏陰，適合採用柔和的燈光和冷色調，營造安寧的休息環境；而書房或辦公室則宜偏陽，採用明亮的照明和暖色系，激發創造力與工作效率。五行理論——木、火、土、金、水——則為每個空間提供了更精細的調整方案。每種元素對應特定的顏色、形狀、材質和方位，風水師通過五行的生剋關係來優化空間的能量配置。
            </p>

            <h2 className="text-2xl font-bold text-gold mb-6 font-serif">
              八卦與空間分析
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-6">
              八卦圖是風水分析的核心工具，它將空間劃分為八個方位，分別對應人生的八大領域：事業、智慧、家庭、財富、聲譽、感情、創造力和貴人。通過將八卦圖與建築的朝向和入口位置對齊，風水師可以精準判斷空間中每個區域所影響的生活層面，並提供針對性的改善建議。
            </p>

            <h2 className="text-2xl font-bold text-gold mb-6 font-serif">
              玄機堪輿智慧解析
            </h2>
            <p className="text-foreground/80 leading-relaxed">
              玄機堪輿體系融合傳統風水智慧與縝密的現代推演。您只需提供空間的基本信息——佈局、朝向和用途——便能生成一份詳盡的風水報告。報告涵蓋八卦方位分析、五行平衡評估，以及具體可行的改善建議。無論您是希望提升財運、改善健康、增進感情，還是單純想營造一個更和諧的居住環境，玄機大師都能為您提供量身定制的風水指導，助您打造理想的生活空間。
            </p>
          </section>

          {/* CTA Button */}
          <div className="text-center my-16">
            <Link
              href="/divination/fengshui"
              className="inline-block bg-gold hover:bg-gold/90 text-navy-950 font-bold text-lg px-10 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-gold/20 hover:scale-105"
            >
              Start Your Feng Shui Analysis
            </Link>
            <p className="mt-4 text-foreground/50 text-sm">
              Free AI-powered reading — no account required
            </p>
          </div>

          {/* FAQ Section */}
          <section className="card-quiet p-8 md:p-12 rounded-2xl">
            <h2 className="text-2xl font-bold text-gold mb-8 font-serif text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div key={index}>
                  <h3 className="text-lg font-semibold text-gold/90 mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-foreground/80 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
