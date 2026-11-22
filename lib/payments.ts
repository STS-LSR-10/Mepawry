// lib/payments.ts — Paying with Stripe Checkout: what can be bought, at what price (always worked out here on the server,
// never taken from the browser), and applying a purchase once Stripe says it's paid (from the webhook).

import Stripe from 'stripe'
import { BACKDROPS, DEFAULT_BACKDROP, DEFAULT_FRAME, FRAMES, VIP_PRICE_THB, backdropsFor } from '@/lib/decor'
import { giftById, giftsFor } from '@/lib/gifts'
import { db, getPetById, placeInVip, setDecor } from '@/lib/data'
import type { Pet } from '@/types'

export type Purchase =
  | { kind: 'vip'; petId: string }
  | { kind: 'frame' | 'backdrop'; petId: string; item: string }
  | { kind: 'gift'; petId: string; item: string; name: string }

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  // fetch, not Node's http: the site runs on Cloudflare Workers
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })
}

/** What a purchase is called and costs (THB), or why it can't be bought. Prices come only from lib/decor and lib/gifts. */
export function priceOf(p: Purchase, pet: Pet): { name: string; thb: number } | { error: string } {
  switch (p.kind) {
    case 'vip':
      if (pet.vip_position != null) return { error: 'Already in the VIP pavilion' }
      return { name: `VIP pavilion · ${pet.name}`, thb: VIP_PRICE_THB }
    case 'frame': {
      const f = FRAMES.find(x => x.id === p.item && x.id !== DEFAULT_FRAME)
      return f ? { name: `Frame “${f.name}” · ${pet.name}`, thb: f.price } : { error: 'Unknown frame' }
    }
    case 'backdrop': {
      const b = backdropsFor().find(x => x.id === p.item && x.id !== DEFAULT_BACKDROP)
      return b ? { name: `Backdrop “${b.name}” · ${pet.name}`, thb: b.price } : { error: 'That backdrop isn’t on offer right now' }
    }
    case 'gift': {
      const g = giftById(p.item)
      if (!g?.price || !giftsFor(g.category).some(x => x.id === g.id)) return { error: 'That gift isn’t on offer right now' }
      return { name: `${g.emoji} ${g.name} · for ${pet.name}`, thb: g.price }
    }
  }
}

/** Reads a purchase back from a Checkout Session's metadata (set by /api/checkout). */
export function purchaseFrom(meta: Stripe.Metadata | null): Purchase | null {
  const { kind, petId, item = '', name = '' } = meta ?? {}
  if (!petId) return null
  if (kind === 'vip') return { kind, petId }
  if (kind === 'frame' || kind === 'backdrop') return { kind, petId, item }
  if (kind === 'gift') return { kind, petId, item, name }
  return null
}

/**
 * Applies a paid purchase. Safe to run twice for the same session (Stripe retries webhooks): VIP and decor just set the
 * same value again, and a paid gift is keyed by the session id.
 */
export async function fulfil(p: Purchase, sessionId: string): Promise<void> {
  switch (p.kind) {
    case 'vip': {
      const r = await placeInVip(p.petId)
      // shortcut: if the pavilion filled up between paying and now, this needs a manual refund; checkout checks for room first
      if ('error' in r && r.error !== 'Memorial not found') throw new Error(r.error)
      return
    }
    case 'frame': case 'backdrop':
      if (p.kind === 'frame' ? !FRAMES.some(f => f.id === p.item) : !BACKDROPS.some(b => b.id === p.item)) throw new Error(`Unknown ${p.kind} ${p.item}`)
      await setDecor(p.petId, p.kind === 'frame' ? { frame: p.item } : { backdrop: p.item })
      return
    case 'gift': {
      if (!giftById(p.item)) throw new Error(`Unknown gift ${p.item}`)
      const { data: done } = await db().from('gifts').select('id').eq('visitor_id', sessionId).maybeSingle()
      if (done) return
      const { error } = await db().from('gifts').insert({ pet_id: p.petId, visitor_id: sessionId, visitor_name: p.name || 'A friend', item: p.item })
      if (error && error.code !== '23503') throw new Error(error.message) // 23503: the memorial was deleted
      return
    }
  }
}

export { getPetById }
