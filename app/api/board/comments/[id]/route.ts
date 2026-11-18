// app/api/board/comments/[id]/route.ts — Authors delete their own comment

import { NextRequest, NextResponse } from 'next/server'
import { deleteComment } from '@/lib/board'
import { getUser } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  if (!(await deleteComment(id, user.id))) return NextResponse.json({ error: 'Not your comment' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
