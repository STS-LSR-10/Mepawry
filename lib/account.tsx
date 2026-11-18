'use client'
// lib/account.tsx — The signed-in visitor, shared by every page: who they are, their profile, sign in/out.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface Account {
  loading: boolean
  user: { id: string; email?: string } | null
  profile: Profile | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  /** Browser Supabase client for sign-in calls; null until the config has loaded. */
  supabase: () => SupabaseClient | null
}

const Ctx = createContext<Account>({
  loading: true, user: null, profile: null,
  refresh: async () => {}, signOut: async () => {}, supabase: () => null,
})

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Account['user']>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const config = useRef<{ url: string; anonKey: string } | null>(null)
  const client = useRef<SupabaseClient | null>(null)

  const refresh = useCallback(async () => {
    const d = await fetch('/api/me', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    if (d?.config) config.current = d.config
    setUser(d?.user ?? null)
    setProfile(d?.profile ?? null)
    setLoading(false)
  }, [])
  useEffect(() => { refresh() }, [refresh])

  // Memorials this browser made before accounts existed become the signed-in owner's
  useEffect(() => {
    if (!user) return
    try {
      const tokens: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('pm-edit:')) tokens[k.slice(8)] = localStorage.getItem(k) ?? ''
      }
      if (Object.keys(tokens).length) fetch('/api/pets/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens }) }).catch(() => {})
    } catch { /* storage blocked */ }
  }, [user])

  const supabase = useCallback(() => {
    if (!client.current && config.current?.url && config.current.anonKey) {
      client.current = createBrowserClient(config.current.url, config.current.anonKey)
    }
    return client.current
  }, [])

  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut()
    await refresh()
  }, [supabase, refresh])

  return <Ctx.Provider value={{ loading, user, profile, refresh, signOut, supabase }}>{children}</Ctx.Provider>
}

export const useAccount = () => useContext(Ctx)
