// app/auth/callback/route.ts — Google sends people back here; swap the one-time code for a session cookie.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = req.nextUrl.searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/' // never redirect off-site
  if (code) {
    const { error } = await (await supabaseServer()).auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL(`/?login=failed`, req.nextUrl.origin))
  }
  return NextResponse.redirect(new URL(safeNext, req.nextUrl.origin))
}
