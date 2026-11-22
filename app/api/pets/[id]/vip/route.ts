// app/api/pets/[id]/vip/route.ts — Put a pet in (or take it out of) the VIP pavilion.
// Admins can place or remove any pet. While VIP is free (VIP_PRICE_THB = 0) a signed-in owner can place their own;
// when it costs something, the payment webhook places it instead.

import { NextRequest, NextResponse } from 'next/server'
import { placeInVip, removeFromVip } from '@/lib/data'
import { getUser, isAdmin } from '@/lib/auth'
import { getPetById } from '@/lib/data'
import { VIP_PRICE_THB } from '@/lib/decor'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  const body = await req.json().catch(() => null)
  if (!isAdmin(user)) {
    if (!user || user.is_anonymous) return NextResponse.json({ error: 'Please sign in to choose a VIP niche' }, { status: 401 })
    const ownFree = VIP_PRICE_THB === 0 && body?.action !== 'remove' && (await getPetById(id))?.owner_id === user.id
    if (!ownFree) return NextResponse.json({ error: 'Only the owner of this memorial can do this' }, { status: 403 })
  }
  if (body?.action === 'remove') {
    const pet = await removeFromVip(id)
    return pet ? NextResponse.json({ pet }) : NextResponse.json({ error: 'Memorial not found' }, { status: 404 })
  }
  const res = await placeInVip(id, typeof body?.position === 'number' ? body.position : undefined)
  if ('error' in res) return NextResponse.json(res, { status: 409 })
  return NextResponse.json({ pet: res })
}
