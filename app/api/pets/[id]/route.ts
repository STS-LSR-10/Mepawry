// app/api/pets/[id]/route.ts — The owner edits or deletes their memorial

import { NextRequest, NextResponse } from 'next/server'
import { deletePet, updatePet } from '@/lib/data'
import { getUser } from '@/lib/auth'
import { isPhotoDataUrl } from '@/lib/utils'
import { checkPetPhoto } from '@/lib/moderate'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.name || !String(body.name).trim()) return NextResponse.json({ error: 'Pet name is required' }, { status: 400 })
  if (body.photo != null && !isPhotoDataUrl(body.photo)) {
    return NextResponse.json({ error: 'Photo must be a JPG, PNG or WebP under 1.5 MB' }, { status: 400 })
  }
  if (body.photo != null) {
    const refused = await checkPetPhoto(body.photo)
    if (refused) return NextResponse.json({ error: refused }, { status: 422 })
  }
  const pet = await updatePet(id, user.id, body, body.photo ?? undefined)
  if (!pet) return NextResponse.json({ error: 'Not allowed to edit this memorial' }, { status: 403 })
  return NextResponse.json({ pet })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  if (!(await deletePet(id, user.id))) return NextResponse.json({ error: 'Not allowed to delete this memorial' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
