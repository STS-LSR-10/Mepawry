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
  | { kind: 'gift'; petId: string; item: string; name: string; userId?: string } // userId: missing on gifts bought before they were kept
  /** a VIP niche bought before the shrine exists: the shrine is made after paying (POST /api/pets with vipSession) */
  | { kind: 'niche'; userId: string; floor: string; position: string }

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  // fetch, not Node's http: the site runs on Cloudflare Workers
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })
}

/** What a purchase is called and costs (THB), or why it can't be bought. Prices come only from lib/decor and lib/gifts. */
export function priceOf(p: Purchase, pet: Pet): { name: string; thb: number } | { error: string } {
  switch (p.kind) {
    case 'niche': return { error: 'Something’s missing. Please try again.' } // priced in /api/checkout, there's no pet yet
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
  const { kind, petId, item = '', name = '', userId, floor, position } = meta ?? {}
  if (kind === 'niche' && userId && floor && position) return { kind, userId, floor, position }
  if (!petId) return null
  if (kind === 'vip') return { kind, petId }
  if (kind === 'frame' || kind === 'backdrop') return { kind, petId, item }
  if (kind === 'gift') return { kind, petId, item, name, ...(userId && { userId }) }
  return null
}

/**
 * Applies a paid purchase. Safe to run twice for the same session (Stripe retries webhooks): VIP and decor just set the
 * same value again, and a paid gift only applies the first time its owner is recorded.
 */
export async function fulfil(p: Purchase, sessionId: string): Promise<void> {
  switch (p.kind) {
    case 'niche': return // the shrine is made when they come back from paying (POST /api/pets checks this session)
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
      if (p.userId) { // theirs to keep: the first time Stripe tells us, record it and leave it at this shrine
        const { data: added, error: e } = await db().from('gift_owners').upsert({ user_id: p.userId, item: p.item }, { ignoreDuplicates: true }).select('item')
        if (e) throw new Error(e.message)
        if (!added?.length) return // already applied (a webhook retry)
      } else {
        const { data: done } = await db().from('gifts').select('id').eq('visitor_id', sessionId).maybeSingle()
        if (done) return
      }
      const { error } = await db().from('gifts').insert({ pet_id: p.petId, visitor_id: p.userId ?? sessionId, visitor_name: p.name || 'A friend', item: p.item })
      if (error && error.code !== '23503') throw new Error(error.message) // 23503: the memorial was deleted
      return
    }
  }
}

export { getPetById }

/** A paid VIP-niche session this user hasn't used yet: where the new shrine's niche is. */
export async function paidNiche(sessionId: string, userId: string): Promise<{ floor: number; position: number; sessionId: string } | { error: string }> {
  if (!/^cs_(test|live)_\w+$/.test(sessionId)) return { error: 'Something’s missing. Please try again.' }
  const s = await stripe().checkout.sessions.retrieve(sessionId)
  const p = purchaseFrom(s.metadata)
  if (s.payment_status !== 'paid' || p?.kind !== 'niche') return { error: 'That payment hasn’t gone through yet. Please try again in a moment.' }
  if (p.userId !== userId) return { error: 'Only the person who paid can use this VIP niche' }
  if (s.metadata?.usedBy) return { error: 'This VIP niche has already been used' }
  return { floor: Number(p.floor), position: Number(p.position), sessionId }
}

/** Marks a niche session as used, so one payment makes one shrine. */
export async function markNicheUsed(sessionId: string, petId: string) {
  // shortcut: two submits at the same instant could both pass paidNiche; fine for a once-per-purchase button
  await stripe().checkout.sessions.update(sessionId, { metadata: { usedBy: petId } })
}
