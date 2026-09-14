export type PackId = 'pack10' | 'pack100' | 'pack200'

export interface CreditPack {
  name: { zh: string; en: string }
  desc: { zh: string; en: string }
  icon: string
  price: number // in cents (actual charge)
  originalPrice: number // in cents (display as strikethrough)
  credits: number // unified credit points
  popular?: boolean
  discount?: { zh: string; en: string } // display label
}

export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  pack10: {
    name: { zh: '10 機緣', en: '10 Karma' },
    desc: { zh: '初試天機 · 入門占演', en: 'Starter pack for initial inquiries' },
    icon: '🌙',
    price: 99, // $0.99
    originalPrice: 990, // $9.90
    credits: 10,
  },
  pack100: {
    name: { zh: '100 機緣', en: '100 Karma' },
    desc: { zh: '靈犀深會 · 常備推演', en: 'Most popular for regular seekers' },
    icon: '⭐',
    price: 891, // $8.91 (10% off of $9.90)
    originalPrice: 9900, // $99.00
    credits: 100,
    popular: true,
    discount: { zh: '9折', en: '10% OFF' },
  },
  pack200: {
    name: { zh: '200 機緣', en: '200 Karma' },
    desc: { zh: '乾坤圓通 · 深度修持', en: 'Best value for deep metaphysical inquiries' },
    icon: '🌟',
    price: 1782, // $17.82 (10% off of $19.80)
    originalPrice: 19800, // $198.00
    credits: 200,
    discount: { zh: '9折', en: '10% OFF' },
  },
}
