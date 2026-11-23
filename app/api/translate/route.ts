// app/api/translate/route.ts — The translate button: { kind, id, to, from? } → { text } (see lib/translate.ts).

import { NextRequest, NextResponse } from 'next/server'
import { isLang, KINDS, translateSaved, type Kind } from '@/lib/translate'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const kind = body?.kind, id = String(body?.id ?? ''), to = body?.to
  if (!(kind in KINDS) || !/^[0-9a-f-]{36}$/i.test(id) || !isLang(to)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const res = await translateSaved(kind as Kind, id, to, body?.from)
  return 'error' in res ? NextResponse.json(res, { status: res.status }) : NextResponse.json(res)
}
