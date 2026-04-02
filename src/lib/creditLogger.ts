import { prisma } from './prisma'

export async function logCreditChange(params: {
  userId: string
  action: string
  amount: number
  balance: number
  source: string
  note?: string
}): Promise<void> {
  try {
    await prisma.creditLog.create({ data: params })
  } catch (err) {
    console.error('Failed to log credit change:', err)
  }
}
