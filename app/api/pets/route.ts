// app/api/pets/route.ts — List pets (by floor for the 3D hall, or filtered for the directory) and add a new one

import { NextRequest, NextResponse } from 'next/server'
import { createPet, getMemorials, getPetsOnFloor } from '@/lib/data'
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
  try {
    const body = await req.json()
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'Pet name is required' }, { status: 400 })
    }
    if (body.primary_photo_url != null && !isPhotoDataUrl(body.primary_photo_url)) {
      return NextResponse.json({ error: 'Photo must be a JPG, PNG or WebP under 1.5 MB' }, { status: 400 })
    }
    // The token is shown only to the creator; it unlocks edits such as changing the photo
    const { pet, editToken } = await createPet(body)
    return NextResponse.json({ pet, editToken }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create pet' }, { status: 500 })
  }
}
