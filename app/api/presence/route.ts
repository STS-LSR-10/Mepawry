// app/api/presence/route.ts — Visitors check in every ~25s; the count is everyone seen in the last minute

import { NextRequest, NextResponse } from 'next/server'
import { heartbeat } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  return NextResponse.json({ online: await heartbeat(body?.id ?? null) })
}
