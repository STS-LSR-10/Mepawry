// app/api/pets/[id]/vip/route.ts — Put a pet in (or take it out of) the VIP pavilion.
// For now only admins (ADMIN_EMAILS) can do this; once payments are connected, the payment webhook will call
// placeInVip for the owner who paid.

import { NextRequest, NextResponse } from 'next/server'
import { placeInVip, removeFromVip } from '@/lib/data'
import { getUser, isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!isAdmin(user)) return NextResponse.json({ error: 'Only an admin can do this for now' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (body?.action === 'remove') {
    const pet = await removeFromVip(id)
    return pet ? NextResponse.json({ pet }) : NextResponse.json({ error: 'Memorial not found' }, { status: 404 })
  }
  const res = await placeInVip(id, typeof body?.position === 'number' ? body.position : undefined)
  if ('error' in res) return NextResponse.json(res, { status: 409 })
  return NextResponse.json({ pet: res })
}
