// app/api/board/posts/[id]/route.ts — Authors delete their own post

import { NextRequest, NextResponse } from 'next/server'
import { deletePost } from '@/lib/board'
import { getUser } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  if (!(await deletePost(id, user.id))) return NextResponse.json({ error: 'Not your post' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
