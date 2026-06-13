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
    const credits = parseInt(session.metadata?.credits || '0', 10)
    // Legacy fallback: if old packs used divinationCredits/chatCredits
    const legacyDiv = parseInt(session.metadata?.divinationCredits || '0', 10)
    const legacyChat = parseInt(session.metadata?.chatCredits || '0', 10)
    const totalCredits = credits > 0 ? credits : (legacyDiv + legacyChat)

    if (userId && totalCredits > 0) {
      // Idempotency: the Stripe session ID is the dedup key. The marker insert and
      // the credit grant run in ONE transaction so they commit or roll back
      // together — previously the marker was written first, so a failed grant left
      // the marker behind and Stripe's retry was skipped as a "duplicate",
      // silently losing purchased credits. Now the marker exists only if credits
      // were actually granted, so a P2002 here reliably means "already granted".
      const eventKey = `stripe_processed:${session.id}`
      let newBalance: number
      try {
        const updatedUser = await prisma.$transaction(async (tx) => {
          await tx.adminSetting.create({ data: { key: eventKey, value: new Date().toISOString() } })
          return tx.user.update({
            where: { id: userId },
            data: { credits: { increment: totalCredits } },
            select: { credits: true },
          })
        })
        newBalance = updatedUser.credits
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') {
          // Marker already committed by a prior successful grant → genuine replay.
          console.log(`[stripe] Duplicate webhook skipped: ${session.id}`)
          return NextResponse.json({ received: true, duplicate: true })
        }
        // Grant failed and rolled back (marker not persisted) → 500 so Stripe retries.
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

  return NextResponse.json({ received: true })
}
