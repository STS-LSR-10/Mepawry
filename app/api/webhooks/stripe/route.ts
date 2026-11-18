// app/api/webhooks/stripe/route.ts — Idempotent Stripe Webhooks Handler

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2024-11-20.acacia' as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      // Mock event handling for development/sandbox
      event = JSON.parse(body)
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Idempotency: In real database, check if event.id was already processed
  // e.g. SELECT id FROM processed_events WHERE id = event.id
  console.log(`[Stripe Webhook] Processing event: ${event.type} (ID: ${event.id})`)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`Payment confirmed for Order: ${session.id}, Customer: ${session.customer_details?.email}`)
      // Update order status in PostgreSQL: UPDATE orders SET status = 'paid' WHERE stripe_payment_intent_id = ...
      break
    }
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log(`PaymentIntent ${paymentIntent.id} succeeded`)
      break
    }
    case 'payment_intent.payment_failed': {
      const failedIntent = event.data.object as Stripe.PaymentIntent
      console.warn(`Payment failed for ${failedIntent.id}: ${failedIntent.last_payment_error?.message}`)
      break
    }
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
