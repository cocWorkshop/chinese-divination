export type PackId = 'starter' | 'insight' | 'master'

export interface CreditPack {
  name: { zh: string; en: string }
  icon: string
  price: number // in cents
  divination: number
  chat: number
  popular?: boolean
}

export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  starter: { name: { zh: '初探', en: 'Starter' }, icon: '🌙', price: 299, divination: 2, chat: 4 },
  insight: { name: { zh: '悟道', en: 'Insight' }, icon: '⭐', price: 599, divination: 5, chat: 10, popular: true },
  master: { name: { zh: '通玄', en: 'Master' }, icon: '🌟', price: 999, divination: 10, chat: 20 },
}
