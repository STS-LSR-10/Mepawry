// app/api/checkout/route.ts — Starts a Stripe Checkout for a VIP move, a frame or backdrop (owner only) or a special
// gift (anyone). Returns the Stripe page to send the browser to; the webhook applies the purchase once it's paid.

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getPetById, priceOf, stripe, type Purchase } from '@/lib/payments'
import { db } from '@/lib/data'
import { VIP_CAPACITY } from '@/components/3d/sanctuary/plan'

export async function POST(req: NextRequest) {
  // no key on this server yet (or a placeholder): say so instead of failing at Stripe
  if (!/^(sk|rk)_(test|live)_\w{20,}/.test(process.env.STRIPE_SECRET_KEY ?? '')) return NextResponse.json({ error: 'Payments opening soon' }, { status: 503 })
  const body = await req.json().catch(() => null)
  const kind = body?.kind, petId = String(body?.petId ?? ''), item = String(body?.item ?? '')
  if (!['vip', 'frame', 'backdrop', 'gift'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(petId)) {
    return NextResponse.json({ error: 'Something’s missing. Please try again.' }, { status: 400 })
  }
  const pet = await getPetById(petId)
  if (!pet) return NextResponse.json({ error: 'Memorial not found' }, { status: 404 })

  const user = await getUser()
  if (kind !== 'gift' && (!user || user.id !== pet.owner_id)) {
    return NextResponse.json({ error: 'Only the owner of this memorial can do this' }, { status: 403 })
  }
  const name = String(body?.name ?? '').trim().slice(0, 40)
  const purchase: Purchase = kind === 'vip' ? { kind, petId } : kind === 'gift' ? { kind, petId, item, name } : { kind, petId, item }
  const price = priceOf(purchase, pet)
  if ('error' in price) return NextResponse.json(price, { status: 400 })

  if (kind === 'vip') { // don't take payment for a niche that isn't there
    const { count } = await db().from('pets').select('id', { count: 'exact', head: true }).eq('floor_id', pet.floor_id).not('vip_position', 'is', null)
    if ((count ?? 0) >= VIP_CAPACITY) return NextResponse.json({ error: 'The VIP pavilion in this dome is full' }, { status: 409 })
  }

  const origin = new URL(req.url).origin
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: 'thb', unit_amount: price.thb * 100, product_data: { name: price.name } } }],
    metadata: { ...purchase },
    client_reference_id: user?.id,
    customer_email: user?.email || undefined,
    success_url: `${origin}/${pet.slug}?paid=${kind}`,
    cancel_url: `${origin}/${pet.slug}`,
  })
  return NextResponse.json({ url: session.url })
}
