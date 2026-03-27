export type PackId = 'pack10' | 'pack100' | 'pack200'

export interface CreditPack {
  name: { zh: string; en: string }
  icon: string
  price: number // in cents (actual charge)
  originalPrice: number // in cents (display as strikethrough)
  credits: number // unified credit points
  popular?: boolean
  discount?: string // display label
}

export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  pack10: {
    name: { zh: '10 點', en: '10 Credits' },
    icon: '🌙',
    price: 99, // $0.99
    originalPrice: 990, // $9.90
    credits: 10,
  },
  pack100: {
    name: { zh: '100 點', en: '100 Credits' },
    icon: '⭐',
    price: 891, // $8.91 (10% off of $9.90)
    originalPrice: 9900, // $99.00
    credits: 100,
    popular: true,
    discount: '9折',
  },
  pack200: {
    name: { zh: '200 點', en: '200 Credits' },
    icon: '🌟',
    price: 1782, // $17.82 (10% off of $19.80)
    originalPrice: 19800, // $198.00
    credits: 200,
    discount: '9折',
  },
}
