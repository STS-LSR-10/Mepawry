// app/api/visit/route.ts — One check-in per browser per day (from VisitBeacon), counted on the admin page.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data'
import { bangkokDay } from '@/lib/adminStats'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const id = String(body?.id ?? '')
  if (!/^[\w-]{8,64}$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 })
  const edge = req.headers.get('cf-ipcountry')
  if (edge == null) return NextResponse.json({ ok: true }) // not through Cloudflare (local dev): don't count it
  const country = /^[A-Z]{2}$/.test(edge) && edge !== 'T1' ? edge : 'XX' // T1: Tor
  await db().from('daily_visits').upsert({ day: bangkokDay(), visitor_id: id, country }, { ignoreDuplicates: true })
  return NextResponse.json({ ok: true })
}
