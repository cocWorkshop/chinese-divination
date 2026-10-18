import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const {
  stripeMock,
  txPaymentRecordCreateMock,
  txAdminSettingCreateMock,
  txUserFindUniqueMock,
  txUserUpdateMock,
  prismaTransactionMock,
  paymentRecordUpdateManyMock,
  logCreditChangeMock,
} = vi.hoisted(() => ({
  stripeMock: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
  txPaymentRecordCreateMock: vi.fn(),
  txAdminSettingCreateMock: vi.fn(),
  txUserFindUniqueMock: vi.fn(),
  txUserUpdateMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
  paymentRecordUpdateManyMock: vi.fn(),
  logCreditChangeMock: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: stripeMock,
}))

vi.mock('@/lib/creditLogger', () => ({
  logCreditChange: logCreditChangeMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: prismaTransactionMock,
    paymentRecord: {
      updateMany: paymentRecordUpdateManyMock,
    },
  },
}))

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('rejects invalid signatures with 400', async () => {
    stripeMock.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature')
    })

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'stripe-signature': 'sig_invalid' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid signature')
  })

  it('handles checkout.session.completed: creates PaymentRecord and marks user isPaid', async () => {
    const sessionObj = {
      id: 'cs_test_session_123',
      payment_status: 'paid',
      amount_total: 891,
      currency: 'usd',
      payment_intent: 'pi_test_123',
      customer: 'cus_test_123',
      metadata: {
        userId: 'usr_patron_1',
        packId: 'pack100',
        credits: '100',
      },
    }

    stripeMock.webhooks.constructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: sessionObj },
    })

    prismaTransactionMock.mockImplementationOnce(async (cb: any) => {
      const tx = {
        paymentRecord: { create: txPaymentRecordCreateMock },
        adminSetting: { create: txAdminSettingCreateMock },
        user: {
          findUnique: txUserFindUniqueMock.mockResolvedValueOnce({ paidAt: null }),
          update: txUserUpdateMock.mockResolvedValueOnce({ credits: 103 }),
        },
      }
      return cb(tx)
    })

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify(sessionObj),
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify PaymentRecord creation
    expect(txPaymentRecordCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'usr_patron_1',
        stripeSessionId: 'cs_test_session_123',
        stripePaymentIntentId: 'pi_test_123',
        stripeCustomerId: 'cus_test_123',
        packId: 'pack100',
        amount: 891,
        currency: 'usd',
        credits: 100,
        status: 'completed',
      }),
    })

    // Verify user isPaid and paidAt update
    expect(txUserUpdateMock).toHaveBeenCalledWith({
      where: { id: 'usr_patron_1' },
      data: expect.objectContaining({
        credits: { increment: 100 },
        isPaid: true,
        paidAt: expect.any(Date),
      }),
      select: { credits: true },
    })

    expect(logCreditChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_patron_1',
        action: 'grant_purchase',
        amount: 100,
        balance: 103,
      })
    )
  })

  it('skips duplicate checkout events safely when P2002 is caught', async () => {
    const sessionObj = {
      id: 'cs_test_duplicate',
      payment_status: 'paid',
      amount_total: 891,
      metadata: {
        userId: 'usr_patron_1',
        credits: '100',
      },
    }

    stripeMock.webhooks.constructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: sessionObj },
    })

    const p2002Err = new Error('Unique constraint failed')
    ;(p2002Err as any).code = 'P2002'
    prismaTransactionMock.mockRejectedValueOnce(p2002Err)

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify(sessionObj),
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.duplicate).toBe(true)
  })

  it('handles charge.refunded: updates PaymentRecord status to refunded', async () => {
    const chargeObj = {
      id: 'ch_123',
      payment_intent: 'pi_refund_123',
    }

    stripeMock.webhooks.constructEvent.mockReturnValueOnce({
      type: 'charge.refunded',
      data: { object: chargeObj },
    })

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify(chargeObj),
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(paymentRecordUpdateManyMock).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: 'pi_refund_123' },
      data: { status: 'refunded' },
    })
  })
})
