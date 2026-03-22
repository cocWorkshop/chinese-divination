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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      if (userId && session.subscription) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            role: 'ethereal',
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: 'active',
          },
        })
      }
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customer = await prisma.user.findUnique({
        where: { stripeCustomerId: sub.customer as string },
      })
      if (customer) {
        const status = sub.status
        await prisma.user.update({
          where: { id: customer.id },
          data: {
            subscriptionStatus: status,
            role: status === 'active' ? 'ethereal' : 'arcane',
          },
        })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customer = await prisma.user.findUnique({
        where: { stripeCustomerId: sub.customer as string },
      })
      if (customer) {
        await prisma.user.update({
          where: { id: customer.id },
          data: {
            role: 'arcane',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
          },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
