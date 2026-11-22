// app/api/pets/[id]/photo/route.ts — Replace a pet's photo (its owner, or the browser holding its edit token)

import { NextRequest, NextResponse } from 'next/server'
import { getPetById, petTokenMatches, updatePetPhoto } from '@/lib/data'
import { getUser } from '@/lib/auth'
import { isPhotoDataUrl } from '@/lib/utils'
import { checkPetPhoto } from '@/lib/moderate'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!isPhotoDataUrl(body?.photo)) {
    return NextResponse.json({ error: 'Photo must be a JPG, PNG or WebP under 1.5 MB' }, { status: 400 })
  }
  const user = await getUser()
  const owns = user ? (await getPetById(id))?.owner_id === user.id : false
  if (!owns && !(await petTokenMatches(id, String(body.token ?? '')))) {
    return NextResponse.json({ error: 'Not allowed to edit this memorial' }, { status: 403 })
  }
  const refused = await checkPetPhoto(body.photo) // after the owner check, so strangers can't use it to test photos
  if (refused) return NextResponse.json({ error: refused }, { status: 422 })
  const pet = await updatePetPhoto(id, body.photo)
  if (!pet) return NextResponse.json({ error: 'Memorial not found' }, { status: 404 })
  return NextResponse.json({ pet })
}
