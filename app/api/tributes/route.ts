// app/api/tributes/route.ts — Light a candle, leave a flower or a treat

import { NextRequest, NextResponse } from 'next/server'
import { addTribute } from '@/lib/data'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.petId || !body?.type) return NextResponse.json({ error: 'petId and type are required' }, { status: 400 })
  // shortcut: no per-visitor rate limit yet; the button has a 3s cooldown. Add one before going public.
  const pet = await addTribute(String(body.petId), String(body.type), body.visitorName)
  if (!pet) return NextResponse.json({ error: 'Unknown pet or tribute type' }, { status: 404 })
  return NextResponse.json({ candle_count: pet.candle_count, flower_count: pet.flower_count })
}
