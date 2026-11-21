'use client'
// components/account/AuthGate.tsx — Sign in with Google, then a one-time profile: name and male/female.
// Shows its children only once both are done.

import { useEffect, useState } from 'react'
import { useAccount } from '@/lib/account'
import { cn, flagEmoji } from '@/lib/utils'
import type { Gender } from '@/types'

/** allowGuest: a guest (added a pet without signing in) may see the children, without a profile. */
export function AuthGate({ children, title = 'Sign in to continue', allowGuest = false }: { children: React.ReactNode; title?: string; allowGuest?: boolean }) {
  const { loading, user, profile } = useAccount()
  if (loading) return <p className="py-10 text-center text-sm text-[#8E8278]">Loading…</p>
  if (!user || (user.isAnonymous && !allowGuest)) return <LoginPanel title={title} />
  if (!profile && !user.isAnonymous) return <ProfileSetup />
  return <>{children}</>
}

const input = 'w-full rounded-xl border border-[#D4C9BF] bg-white px-4 py-2.5 text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B]'
const inApp = () => typeof navigator !== 'undefined' && /Line\/|FBAN|FBAV|Instagram/i.test(navigator.userAgent)

/** Sign in with Google (the only way in). compact: no icon/heading (when the surrounding card already explains). */
export function LoginPanel({ title, compact = false }: { title: string; compact?: boolean }) {
  const { supabase } = useAccount()
  const [error, setError] = useState('')
  const [embedded, setEmbedded] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => setEmbedded(inApp()), [])
  // Back from Google with a sign-in that didn't go through
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('login') === 'failed') setError('Signing in didn’t go through. Please try again.')
  }, [])
  // Is Google switched on in Supabase yet? (until it is, the button would lead to an error page)
  const [googleOn, setGoogleOn] = useState<boolean | null>(null)
  useEffect(() => {
    // the Supabase address comes from the server at runtime (like the account client), not from the build
    fetch('/api/me', { cache: 'no-store' }).then(r => r.json())
      .then(d => d?.config?.url ? fetch(`${d.config.url}/auth/v1/settings`, { headers: { apikey: d.config.anonKey }, cache: 'no-store' }).then(r => r.json()) : null)
      .then(s => setGoogleOn(!!s?.external?.google))
      .catch(() => setGoogleOn(true)) // can't tell: let them try
  }, [])

  const google = async () => {
    setError('')
    const sb = supabase()
    if (!sb) return setError('Sign-in isn’t available right now.')
    // Google sends them to the callback, which swaps its one-time code for a session, then back to this page
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname + window.location.search.replace(/[?&]login=failed/, ''))}`
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) setError(error.message)
  }
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true) } catch {} }

  return (
    <div className="space-y-5">
      {!compact && <div className="text-center">
        <div className="text-4xl" aria-hidden>🐾</div>
        <h3 className="mt-2 font-serif text-xl font-bold text-[#2A1E17]">{title}</h3>
        <p className="mt-1 text-sm text-[#8E8278]">So we remember you, and you can edit your memorials from any device.</p>
      </div>}

      {embedded ? (
        // Google refuses to sign in inside LINE / Facebook / Instagram: send them to a real browser
        <div className="space-y-3 rounded-xl bg-[#FDF0E5] px-4 py-3 text-sm text-[#8A5A2B]">
          <p>Google sign-in doesn’t work inside LINE or Facebook. Open this page in Safari or Chrome to sign in (tap ⋯ then “Open in browser”).</p>
          <button onClick={copyLink} className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-[#2A1E17] ring-1 ring-[#E8D5BF]">
            {copied ? '✓ Link copied' : 'Copy this page’s link'}
          </button>
        </div>
      ) : (
        <button onClick={google} disabled={!googleOn} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#D4C9BF] bg-white py-3 text-sm font-semibold text-[#2A1E17] hover:bg-[#FAF7F2] disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Continue with Google
        </button>
      )}
      {googleOn === false && !embedded && <p className="text-center text-xs text-[#8E8278]">Sign-in is being set up. Please check back soon.</p>}
      {error && <p role="alert" className="text-center text-sm text-[#C0392B]">{error}</p>}
    </div>
  )
}

/** First sign-in: pick a name and male/female (for your character in the hall). Country is set by the server and locked. */
export function ProfileSetup({ onSaved }: { onSaved?: () => void }) {
  const { profile, refresh } = useAccount()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !gender) return
    setBusy(true); setError('')
    let browserCountry = ''
    try { browserCountry = new Intl.Locale(navigator.language).maximize().region ?? '' } catch {}
    const res = await fetch('/api/me', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name.trim(), gender, browserCountry }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => null))?.error ?? 'Couldn’t save. Please try again.')
    await refresh()
    onSaved?.()
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {!profile && (
        <div className="text-center">
          <h3 className="font-serif text-xl font-bold text-[#2A1E17]">Welcome to Mepawry</h3>
          <p className="mt-1 text-sm text-[#8E8278]">How should we show you in the hall?</p>
        </div>
      )}
      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-[#2A1E17]">Your name</label>
        <input id="profile-name" required maxLength={40} placeholder="e.g. Nok" value={name} onChange={e => setName(e.target.value)} className={input} />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-[#2A1E17]">Your character</span>
        <div role="radiogroup" aria-label="Character" className="grid grid-cols-2 gap-3">
          {([['male', '👦', 'Male'], ['female', '👧', 'Female']] as const).map(([g, emoji, label]) => (
            <button
              key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)}
              className={cn('flex flex-col items-center gap-1 rounded-2xl border-2 py-4 transition-all',
                gender === g ? 'border-[#D9823B] bg-[#FDF0E5]' : 'border-[#E8DFD6] bg-white hover:border-[#D9823B]/50')}
            >
              <span className="text-4xl" aria-hidden>{emoji}</span>
              <span className="text-sm font-semibold text-[#2A1E17]">{label}</span>
            </button>
          ))}
        </div>
      </div>
      {profile ? (
        <p className="rounded-xl bg-[#F4EFE6] px-3 py-2 text-xs text-[#5C5046]">
          {flagEmoji(profile.country_code)} Country: <b>{profile.country_code === 'XX' ? 'Unknown' : profile.country_code}</b> 🔒 set when you joined and can’t be changed
        </p>
      ) : (
        <p className="rounded-xl bg-[#F4EFE6] px-3 py-2 text-xs text-[#5C5046]">
          🔒 Your country is set from where you are now and can’t be changed later. Your pets’ memorials will show it.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-[#C0392B]">{error}</p>}
      <button disabled={busy || !name.trim() || !gender} className="w-full rounded-xl bg-[#D9823B] py-3 text-sm font-semibold text-white hover:bg-[#C67129] disabled:opacity-60">
        {busy ? 'Saving…' : profile ? 'Save' : 'Continue'}
      </button>
    </form>
  )
}
