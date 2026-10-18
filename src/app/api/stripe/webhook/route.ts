import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { logCreditChange } from '@/lib/creditLogger'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Only grant once the payment has actually settled. checkout.session.completed
    // can also fire with payment_status 'unpaid' for asynchronous payment methods.
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return NextResponse.json({ received: true, pending: true })
    }

    const userId = session.metadata?.userId
    const packId = session.metadata?.packId || null
    const credits = parseInt(session.metadata?.credits || '0', 10)
    // Legacy fallback: if old packs used divinationCredits/chatCredits
    const legacyDiv = parseInt(session.metadata?.divinationCredits || '0', 10)
    const legacyChat = parseInt(session.metadata?.chatCredits || '0', 10)
    const totalCredits = credits > 0 ? credits : (legacyDiv + legacyChat)
    const amount = session.amount_total ?? (session.amount_subtotal ?? 0)
    const currency = (session.currency || 'usd').toLowerCase()
    const stripePaymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null
    const stripeCustomerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id || null

    if (userId && totalCredits > 0) {
      // Idempotency: both the PaymentRecord (unique stripeSessionId) and
      // the AdminSetting marker insert and user update run in ONE transaction.
      // A P2002 here reliably means this checkout session was already processed.
      const eventKey = `stripe_processed:${session.id}`
      let newBalance: number
      try {
        const updatedUser = await prisma.$transaction(async (tx) => {
          await tx.paymentRecord.create({
            data: {
              userId,
              stripeSessionId: session.id,
              stripePaymentIntentId,
              stripeCustomerId,
              packId,
              amount,
              currency,
              credits: totalCredits,
              status: 'completed',
              metadata: session.metadata ? JSON.parse(JSON.stringify(session.metadata)) : undefined,
            },
          })
          await tx.adminSetting.create({ data: { key: eventKey, value: new Date().toISOString() } })

          const existingUser = await tx.user.findUnique({
            where: { id: userId },
            select: { paidAt: true },
          })

          return tx.user.update({
            where: { id: userId },
            data: {
              credits: { increment: totalCredits },
              isPaid: true,
              paidAt: existingUser?.paidAt || new Date(),
            },
            select: { credits: true },
          })
        })
        newBalance = updatedUser.credits
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') {
          // Marker or PaymentRecord already committed by a prior successful grant → genuine replay.
          console.log(`[stripe] Duplicate webhook skipped: ${session.id}`)
          return NextResponse.json({ received: true, duplicate: true })
        }
        // Grant failed and rolled back (marker/record not persisted) → 500 so Stripe retries.
        console.error(`[stripe] Credit grant failed, will retry: session=${session.id}`, e)
        return NextResponse.json({ error: 'Grant failed' }, { status: 500 })
      }

      await logCreditChange({
        userId,
        action: 'grant_purchase',
        amount: totalCredits,
        balance: newBalance,
        source: `stripe:${session.id}`,
      })
      console.log(`[stripe] Credits granted: user=${userId} credits=${totalCredits} session=${session.id}`)
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id
    if (paymentIntentId) {
      await prisma.paymentRecord.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: 'refunded' },
      })
    }
  }

  return NextResponse.json({ received: true })
}
