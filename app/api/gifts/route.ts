// app/api/gifts/route.ts — See the gifts at a shrine (and which special gifts you own), or leave one: a free gift
// (one every few days per visitor) or a special gift you already bought (signed in).

import { NextRequest, NextResponse } from 'next/server'
import { countGifts, getGifts, giveOwnedGift, leaveGift, ownedGifts } from '@/lib/data'
import { getUser, postingAs } from '@/lib/auth'
import { giftById } from '@/lib/gifts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.has('owned')) {
    const user = await getUser()
    return NextResponse.json({ owned: user && !user.is_anonymous ? await ownedGifts(user.id) : [] })
  }
  const petId = req.nextUrl.searchParams.get('petId') ?? ''
  const [gifts, total] = await Promise.all([getGifts(petId), countGifts(petId)])
  return NextResponse.json({ gifts, total })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const petId = String(body?.petId ?? ''), item = String(body?.item ?? '')
  if (giftById(item)?.price) {
    const who = await postingAs(req, body?.visitorName)
    if (!who || (await getUser())?.is_anonymous) return NextResponse.json({ error: 'Please sign in to buy special gifts' }, { status: 401 })
    const res = await giveOwnedGift(petId, item, who.id, who.name)
    return 'error' in res ? NextResponse.json({ error: res.error }, { status: res.status }) : NextResponse.json(res, { status: 201 })
  }
  const res = await leaveGift(petId, item, body?.visitorId, body?.visitorName)
  if (!res) return NextResponse.json({ error: 'Unknown pet or gift' }, { status: 400 })
  if ('nextAt' in res) return NextResponse.json({ error: 'You can leave another gift soon', nextAt: res.nextAt }, { status: 429 })
  return NextResponse.json(res, { status: 201 })
}
