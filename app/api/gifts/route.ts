// app/api/gifts/route.ts — See the gifts at a shrine, or leave a free one (one every few days per visitor)

import { NextRequest, NextResponse } from 'next/server'
import { countGifts, getGifts, leaveGift } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const petId = req.nextUrl.searchParams.get('petId') ?? ''
  const [gifts, total] = await Promise.all([getGifts(petId), countGifts(petId)])
  return NextResponse.json({ gifts, total })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const res = await leaveGift(String(body?.petId ?? ''), String(body?.item ?? ''), body?.visitorId, body?.visitorName)
  if (!res) return NextResponse.json({ error: 'Unknown pet or gift' }, { status: 400 })
  if ('nextAt' in res) return NextResponse.json({ error: 'You can leave another gift soon', nextAt: res.nextAt }, { status: 429 })
  return NextResponse.json(res, { status: 201 })
}
