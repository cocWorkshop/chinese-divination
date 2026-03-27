import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
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
    const userId = session.metadata?.userId
    const credits = parseInt(session.metadata?.credits || '0', 10)
    // Legacy fallback: if old packs used divinationCredits/chatCredits
    const legacyDiv = parseInt(session.metadata?.divinationCredits || '0', 10)
    const legacyChat = parseInt(session.metadata?.chatCredits || '0', 10)
    const totalCredits = credits > 0 ? credits : (legacyDiv + legacyChat)

    if (userId && totalCredits > 0) {
      // Idempotency: use Stripe session ID as key to prevent duplicate credit grants.
      const eventKey = `stripe_processed:${session.id}`
      try {
        await prisma.adminSetting.create({
          data: { key: eventKey, value: new Date().toISOString() },
        })
      } catch {
        // Key already exists → duplicate webhook, skip
        console.log(`[stripe] Duplicate webhook skipped: ${session.id}`)
        return NextResponse.json({ received: true, duplicate: true })
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: { increment: totalCredits },
        },
      })
      console.log(`[stripe] Credits granted: user=${userId} credits=${totalCredits} session=${session.id}`)
    }
  }

  return NextResponse.json({ received: true })
}
