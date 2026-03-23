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
    const divinationCredits = parseInt(session.metadata?.divinationCredits || '0', 10)
    const chatCredits = parseInt(session.metadata?.chatCredits || '0', 10)

    if (userId && (divinationCredits > 0 || chatCredits > 0)) {
      // Idempotency: use Stripe session ID as key to prevent duplicate credit grants.
      // upsert on AdminSetting — if key already exists, this is a duplicate webhook.
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
          divinationCredits: { increment: divinationCredits },
          chatCredits: { increment: chatCredits },
        },
      })
      console.log(`[stripe] Credits granted: user=${userId} div=${divinationCredits} chat=${chatCredits} session=${session.id}`)
    }
  }

  return NextResponse.json({ received: true })
}
