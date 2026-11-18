// app/api/board/posts/[id]/comments/route.ts — Read a post's comments, or add one

import { NextRequest, NextResponse } from 'next/server'
import { addComment, listComments } from '@/lib/board'
import { postingAs } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return NextResponse.json({ comments: await listComments(id) })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const author = await postingAs(req, body?.authorName)
  if (!author) return NextResponse.json({ error: 'Please refresh the page and try again' }, { status: 401 })
  const comment = await addComment(id, author, body?.body)
  if (!comment) return NextResponse.json({ error: 'Write a comment first' }, { status: 400 })
  return NextResponse.json({ comment }, { status: 201 })
}
