// app/api/guestbook/route.ts — Read and sign a pet's guestbook

import { NextRequest, NextResponse } from 'next/server'
import { getGuestbook, signGuestbook } from '@/lib/data'

export async function GET(req: NextRequest) {
  const petId = req.nextUrl.searchParams.get('petId')
  if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })
  return NextResponse.json({ entries: await getGuestbook(petId) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const entry = body && await signGuestbook(String(body.petId ?? ''), body.visitorName, body.message)
  if (!entry) return NextResponse.json({ error: 'A message and a valid pet are required' }, { status: 400 })
  return NextResponse.json({ entry }, { status: 201 })
}
