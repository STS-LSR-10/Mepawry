// lib/auth.ts — Who is signed in, read from the Supabase session cookie (server side: routes and pages).

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieList = { name: string; value: string; options: CookieOptions }[]

export const authConfig = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
})

export async function supabaseServer() {
  const store = await cookies()
  const { url, anonKey } = authConfig()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      // Pages can't set cookies; the middleware refreshes them there instead
      setAll: (list: CookieList) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch {} },
    },
  })
}

/** The signed-in user, checked with Supabase (not just trusted from the cookie), or null. */
export async function getUser() {
  if (!authConfig().anonKey) return null
  const { data } = await (await supabaseServer()).auth.getUser()
  return data.user ?? null
}

/** Who is posting: name and country from their profile, or (guests) the name they go by and where they are. */
export async function postingAs(req: Request, guestName: unknown) {
  const user = await getUser()
  if (!user) return null
  const { getProfile } = await import('@/lib/data')
  const profile = await getProfile(user.id)
  const edge = req.headers.get('cf-ipcountry') ?? ''
  return {
    id: user.id,
    name: profile?.display_name ?? (String(guestName ?? '').trim().slice(0, 40) || 'A visitor'),
    country: profile?.country_code ?? (/^[A-Z]{2}$/.test(edge) && edge !== 'T1' ? edge : 'XX'),
  }
}
