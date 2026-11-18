// app/api/me/route.ts — Who am I (and the public login config), and save my profile.
// The country is taken from where the request comes from (Cloudflare's CF-IPCountry) when the profile is first made, then locked.

import { NextRequest, NextResponse } from 'next/server'
import { getProfile, saveProfile } from '@/lib/data'
import { authConfig, getUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  const profile = user ? await getProfile(user.id) : null
  return NextResponse.json({ user: user && { id: user.id, email: user.email }, profile, config: authConfig() })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const fromEdge = req.headers.get('cf-ipcountry') ?? ''
  // shortcut: off Cloudflare (local dev) there's no CF-IPCountry, so we fall back to the browser's region setting
  const country = /^[A-Z]{2}$/.test(fromEdge) && fromEdge !== 'XX' && fromEdge !== 'T1' ? fromEdge : String(body?.browserCountry ?? '').toUpperCase()
  const profile = await saveProfile(user.id, body ?? {}, country)
  if (!profile) return NextResponse.json({ error: 'Please enter a name and choose male or female' }, { status: 400 })
  return NextResponse.json({ profile })
}
