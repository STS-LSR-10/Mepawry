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
