// app/api/tributes/route.ts — Light a candle (once a day per visitor), leave a flower or a treat

import { NextRequest, NextResponse } from 'next/server'
import { addTribute, lightCandle } from '@/lib/data'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.petId || !body?.type) return NextResponse.json({ error: 'petId and type are required' }, { status: 400 })
  if (body.type === 'candle') {
    const res = await lightCandle(String(body.petId), body.visitorId, body.visitorName, body.tz)
    if (!res) return NextResponse.json({ error: 'Unknown pet or visitor' }, { status: 400 })
    return NextResponse.json(res, { status: res.ok ? 200 : 429 })
  }
  // shortcut: flowers and treats have no per-visitor limit yet; the button has a 3s cooldown. Add one before going public.
  const pet = await addTribute(String(body.petId), String(body.type), body.visitorName)
  if (!pet) return NextResponse.json({ error: 'Unknown pet or tribute type' }, { status: 404 })
  return NextResponse.json({ candle_count: pet.candle_count, flower_count: pet.flower_count })
}
