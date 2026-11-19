// app/api/pets/[id]/decor/route.ts — Give a shrine a frame style or backdrop.
// For now only admins (ADMIN_EMAILS) can do this; once payments are connected, the payment webhook will call setDecor.

import { NextRequest, NextResponse } from 'next/server'
import { setDecor } from '@/lib/data'
import { getUser, isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isAdmin(await getUser())) return NextResponse.json({ error: 'Only an admin can do this until payments open' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const pet = await setDecor(id, { frame: body?.frame, backdrop: body?.backdrop })
  return pet ? NextResponse.json({ pet }) : NextResponse.json({ error: 'Unknown memorial, frame or backdrop' }, { status: 400 })
}
