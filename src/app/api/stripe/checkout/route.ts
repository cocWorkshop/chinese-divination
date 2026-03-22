import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { CREDIT_PACKS, type PackId } from '@/lib/creditPacks'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const packId = body.packId as PackId
  const pack = CREDIT_PACKS[packId]
  if (!pack) {
    return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Reuse or create Stripe customer
  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${pack.icon} ${pack.name.zh} / ${pack.name.en}`,
            description: `${pack.divination} divination credits + ${pack.chat} chat credits`,
          },
          unit_amount: pack.price,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/subscribe?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/subscribe?canceled=true`,
    metadata: {
      userId: user.id,
      packId,
      divinationCredits: String(pack.divination),
      chatCredits: String(pack.chat),
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
