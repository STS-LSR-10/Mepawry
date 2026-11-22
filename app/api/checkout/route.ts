// app/api/checkout/route.ts — Starts a Stripe Checkout for a VIP move, a frame or backdrop (owner only) or a special
// gift (signed-in buyers; it's theirs to give again). Returns the Stripe page to send the browser to; the webhook applies the purchase once it's paid.

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getPetById, priceOf, stripe, type Purchase } from '@/lib/payments'
import { db, ownedGifts } from '@/lib/data'
import { VIP_CAPACITY } from '@/components/3d/sanctuary/plan'
import { VIP_PRICE_THB } from '@/lib/decor'

export async function POST(req: NextRequest) {
  // no key on this server yet (or a placeholder): say so instead of failing at Stripe
  if (!/^(sk|rk)_(test|live)_\w{20,}/.test(process.env.STRIPE_SECRET_KEY ?? '')) return NextResponse.json({ error: 'Payments opening soon' }, { status: 503 })
  const body = await req.json().catch(() => null)
  const kind = body?.kind, petId = String(body?.petId ?? ''), item = String(body?.item ?? '')
  if (kind === 'niche') return nicheCheckout(req, body)
  if (!['vip', 'frame', 'backdrop', 'gift'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(petId)) {
    return NextResponse.json({ error: 'Something’s missing. Please try again.' }, { status: 400 })
  }
  const pet = await getPetById(petId)
  if (!pet) return NextResponse.json({ error: 'Memorial not found' }, { status: 404 })

  const user = await getUser()
  if (kind !== 'gift' && (!user || user.id !== pet.owner_id)) {
    return NextResponse.json({ error: 'Only the owner of this memorial can do this' }, { status: 403 })
  }
  if (kind === 'gift') { // bought once and kept, so we need to know who's buying
    if (!user || user.is_anonymous) return NextResponse.json({ error: 'Please sign in to buy special gifts' }, { status: 401 })
    if ((await ownedGifts(user.id)).includes(item)) return NextResponse.json({ error: 'You already own this gift' }, { status: 409 })
  }
  const name = String(body?.name ?? '').trim().slice(0, 40)
  const purchase: Purchase = kind === 'vip' ? { kind, petId } : kind === 'gift' ? { kind, petId, item, name, userId: user!.id } : { kind, petId, item }
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

/** A VIP niche for a shrine that doesn't exist yet: signed-in (Google) users only; pay first, make the shrine after. */
async function nicheCheckout(req: NextRequest, body: { floor?: unknown; position?: unknown } | null) {
  const user = await getUser()
  if (!user || user.is_anonymous) return NextResponse.json({ error: 'Please sign in to choose a VIP niche' }, { status: 401 })
  const floor = Number(body?.floor), position = Number(body?.position)
  if (!Number.isInteger(floor) || floor < 1 || !Number.isInteger(position) || position < 0 || position >= VIP_CAPACITY) {
    return NextResponse.json({ error: 'Something’s missing. Please try again.' }, { status: 400 })
  }
  const { count } = await db().from('pets').select('id', { count: 'exact', head: true }).eq('floor_id', floor).eq('vip_position', position)
  if (count) return NextResponse.json({ error: 'That VIP niche is taken' }, { status: 409 })
  const origin = new URL(req.url).origin
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: 'thb', unit_amount: VIP_PRICE_THB * 100, product_data: { name: `VIP pavilion · Dome ${floor}, niche ${position + 1}` } } }],
    metadata: { kind: 'niche', userId: user.id, floor: String(floor), position: String(position) },
    client_reference_id: user.id,
    customer_email: user.email || undefined,
    success_url: `${origin}/?vipsession={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?vipsession=cancelled`,
  })
  return NextResponse.json({ url: session.url })
}
