'use client'
// lib/account.tsx — The signed-in visitor, shared by every page: who they are, their profile, sign in/out.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface Account {
  loading: boolean
  /** isAnonymous: a guest who added a pet without signing in (remembered by this browser's session cookie). */
  user: { id: string; email?: string; isAnonymous?: boolean; look?: unknown; isAdmin?: boolean } | null
  profile: Profile | null
  /** The country this visit comes from (Cloudflare), for pre-filling forms; null when unknown. */
  country: string | null
  /** Makes sure there is a session, starting a guest one if needed. Returns an error message or null. */
  ensureSession: () => Promise<string | null>
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  /** Browser Supabase client for sign-in calls; null until the config has loaded. */
  supabase: () => SupabaseClient | null
}

const Ctx = createContext<Account>({
  loading: true, user: null, profile: null, country: null, ensureSession: async () => null,
  refresh: async () => {}, signOut: async () => {}, supabase: () => null,
})

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Account['user']>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const config = useRef<{ url: string; anonKey: string } | null>(null)
  const client = useRef<SupabaseClient | null>(null)

  const refresh = useCallback(async (): Promise<Account['user']> => {
    const d = await fetch('/api/me', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    if (d?.config) config.current = d.config
    setUser(d?.user ?? null)
    setProfile(d?.profile ?? null)
    setCountry(d?.country ?? null)
    setLoading(false)
    return d?.user ?? null
  }, [])
  useEffect(() => { refresh() }, [refresh])

  // Memorials this browser made as a guest (or before accounts existed) become the signed-in owner's
  useEffect(() => {
    if (!user || user.isAnonymous) return
    try {
      const tokens: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('pm-edit:')) tokens[k.slice(8)] = localStorage.getItem(k) ?? ''
      }
      if (Object.keys(tokens).length) fetch('/api/pets/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens }) }).catch(() => {})
    } catch { /* storage blocked */ }
  }, [user])

  const ensureSession = useCallback(async () => {
    if (user) return null
    const sb = supabase()
    if (!sb) return 'Please refresh the page and try again.'
    const { error } = await sb.auth.signInAnonymously()
    if (error) return 'Adding without signing in isn’t available right now. Please sign in.'
    await refresh()
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refresh])

  const supabase = useCallback(() => {
    if (!client.current && config.current?.url && config.current.anonKey) {
      client.current = createBrowserClient(config.current.url, config.current.anonKey, {
        // Realtime heartbeats run in a Web Worker, so a tab in the background isn't throttled into disconnecting
        realtime: { worker: true },
      })
    }
    return client.current
  }, [])

  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut()
    await refresh()
  }, [supabase, refresh])

  return <Ctx.Provider value={{ loading, user, profile, country, ensureSession, refresh: async () => { await refresh() }, signOut, supabase }}>{children}</Ctx.Provider>
}

export const useAccount = () => useContext(Ctx)
