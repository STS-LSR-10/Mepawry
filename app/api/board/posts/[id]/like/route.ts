// app/api/board/posts/[id]/like/route.ts — Heart or un-heart a post (one per visitor)

import { NextRequest, NextResponse } from 'next/server'
import { toggleLike } from '@/lib/board'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const res = await toggleLike(id, body?.liker)
  if (!res) return NextResponse.json({ error: 'Unknown post' }, { status: 400 })
  return NextResponse.json(res)
}
