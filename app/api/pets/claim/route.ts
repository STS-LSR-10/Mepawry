// app/api/pets/claim/route.ts — After signing in, attach memorials this browser made earlier (it holds their edit tokens)

import { NextRequest, NextResponse } from 'next/server'
import { claimPets } from '@/lib/data'
import { getUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const tokens = body?.tokens && typeof body.tokens === 'object' ? body.tokens as Record<string, string> : {}
  return NextResponse.json({ claimed: await claimPets(user.id, tokens) })
}
