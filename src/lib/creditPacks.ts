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
    icon: '旬',
    price: 99, // $0.99
    originalPrice: 99, // $0.99 (no deceptive 10x strikethrough, ISS-26)
    credits: 10,
  },
  pack100: {
    name: { zh: '100 機緣', en: '100 Karma' },
    desc: { zh: '靈犀深會 · 常備推演', en: 'Most popular for regular seekers' },
    icon: '佰',
    price: 891, // $8.91 (10% off the $9.90 unit base)
    originalPrice: 990, // $9.90 (true base anchor: 10 × $0.99)
    credits: 100,
    popular: true,
    discount: { zh: '9折', en: '10% OFF' },
  },
  pack200: {
    name: { zh: '220 機緣', en: '220 Karma' },
    desc: { zh: '乾坤圓通 · 加贈20點', en: 'Best value: 200 + 20 Bonus Karma' },
    icon: '乾',
    price: 1680, // $16.80
    originalPrice: 2178, // $21.78
    credits: 220, // 200 + 20 bonus gradient (ISS-26)
    discount: { zh: '加贈10%', en: '+10% BONUS' },
  },
}
