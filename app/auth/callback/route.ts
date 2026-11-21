// app/auth/callback/route.ts — Google, and the link in a sign-in email, send people back here; swap the one-time
// code for a session cookie.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = req.nextUrl.searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/' // never redirect off-site
  if (code) {
    const { error } = await (await supabaseServer()).auth.exchangeCodeForSession(code)
    if (error) { // back where they were, where the sign-in box says what happened
      const back = new URL(safeNext, req.nextUrl.origin)
      back.searchParams.set('login', 'failed')
      return NextResponse.redirect(back)
    }
  }
  return NextResponse.redirect(new URL(safeNext, req.nextUrl.origin))
}
