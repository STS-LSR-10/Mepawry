// app/api/board/posts/route.ts — List board posts (stories or notes) and add one (signed in, or a guest session)

import { NextRequest, NextResponse } from 'next/server'
import { boardStats, createPost, listPosts, type PostKind, type Sort } from '@/lib/board'
import { postingAs } from '@/lib/auth'
import { isPhotoDataUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const kind: PostKind = q.get('kind') === 'note' ? 'note' : 'story'
  const sort = (['latest', 'loved', 'talked'].includes(q.get('sort') ?? '') ? q.get('sort') : 'latest') as Sort
  const [list, stats] = await Promise.all([
    listPosts({ kind, sort, page: Number(q.get('page')) || 1, liker: q.get('liker') ?? undefined }),
    q.get('stats') ? boardStats() : Promise.resolve(undefined),
  ])
  return NextResponse.json({ ...list, stats })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const author = await postingAs(req, body?.authorName)
  if (!author) return NextResponse.json({ error: 'Please refresh the page and try again' }, { status: 401 })
  if (body?.photo != null && !isPhotoDataUrl(body.photo)) {
    return NextResponse.json({ error: 'Photo must be a JPG, PNG or WebP under 1.5 MB' }, { status: 400 })
  }
  const post = await createPost(author, body ?? {})
  if ('error' in post) return NextResponse.json(post, { status: 400 })
  return NextResponse.json({ post }, { status: 201 })
}
