// app/api/webhooks/stripe/route.ts — Stripe tells us a Checkout was paid; apply what was bought.
// Only signed events count. Card payments arrive as checkout.session.completed; PromptPay and other delayed methods
// arrive later as checkout.session.async_payment_succeeded. A failure answers 500 so Stripe tries again.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfil, purchaseFrom, stripe } from '@/lib/payments'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get('stripe-signature')
  if (!secret || !sig) return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), sig, secret, undefined, Stripe.createSubtleCryptoProvider())
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status === 'paid') {
      const purchase = purchaseFrom(session.metadata)
      if (!purchase) return NextResponse.json({ received: true, ignored: 'no purchase in metadata' })
      try {
        await fulfil(purchase, session.id)
      } catch (e) {
        console.error(`[stripe] couldn't apply ${session.id}:`, e)
        return NextResponse.json({ error: 'Could not apply the purchase' }, { status: 500 })
      }
    }
  }
  return NextResponse.json({ received: true })
}
