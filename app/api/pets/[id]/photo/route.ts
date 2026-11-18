// app/api/pets/[id]/photo/route.ts — Replace a pet's photo (owner only, via edit token)

import { NextRequest, NextResponse } from 'next/server'
import { updatePetPhoto } from '@/lib/data'
import { isPhotoDataUrl } from '@/lib/utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!isPhotoDataUrl(body?.photo)) {
    return NextResponse.json({ error: 'Photo must be a JPG, PNG or WebP under 1.5 MB' }, { status: 400 })
  }
  const pet = await updatePetPhoto(id, String(body.token ?? ''), body.photo)
  if (!pet) return NextResponse.json({ error: 'Not allowed to edit this memorial' }, { status: 403 })
  return NextResponse.json({ pet })
}
