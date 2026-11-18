// app/api/pets/route.ts — List pets (by floor for the 3D hall, or filtered for the directory) and add a new one (signed in)

import { NextRequest, NextResponse } from 'next/server'
import { createPet, getMemorials, getPetsOnFloor, getProfile, SlotTakenError } from '@/lib/data'
import { getUser } from '@/lib/auth'
import { isPhotoDataUrl } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const floor = Number(q.get('floor'))
  if (floor) return NextResponse.json({ pets: await getPetsOnFloor(floor) })
  const data = await getMemorials({
    species: q.get('species') ?? undefined,
    waitingOnly: q.get('waiting') === 'true',
    search: q.get('search') ?? undefined,
    page: Number(q.get('page')) || 1,
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  // Guests count too: the page signs them in anonymously first, so the memorial still has an owner who can edit it
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please refresh the page and try again' }, { status: 401 })
  const profile = await getProfile(user.id)
  try {
    const body = await req.json()
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'Pet name is required' }, { status: 400 })
    }
    if (body.primary_photo_url != null && !isPhotoDataUrl(body.primary_photo_url)) {
      return NextResponse.json({ error: 'Photo must be a JPG, PNG or WebP under 1.5 MB' }, { status: 400 })
    }
    const pick = body.slot && Number.isInteger(body.slot.floor) && Number.isInteger(body.slot.position) ? body.slot : undefined
    // The form's country wins; without one, the owner's profile country
    const { pet, editToken } = await createPet(body, { id: user.id, country: profile?.country_code ?? 'XX' }, pick)
    return NextResponse.json({ pet, editToken }, { status: 201 })
  } catch (err) {
    if (err instanceof SlotTakenError) return NextResponse.json({ error: err.message }, { status: 409 })
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create pet' }, { status: 500 })
  }
}
