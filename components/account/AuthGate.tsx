'use client'
// components/account/AuthGate.tsx — Sign in with Google, then a one-time profile: name and male/female.
// Shows its children only once both are done.

import { useEffect, useRef, useState } from 'react'
import { useAccount } from '@/lib/account'
import { useT } from '@/lib/i18n'
import { cn, flagEmoji } from '@/lib/utils'
import type { Gender } from '@/types'

/** allowGuest: a guest (added a pet without signing in) may see the children, without a profile. */
export function AuthGate({ children, title = 'Sign in to continue', allowGuest = false }: { children: React.ReactNode; title?: string; allowGuest?: boolean }) {
  const { loading, user, profile } = useAccount()
  const t = useT()
  if (loading) return <p className="py-10 text-center text-sm text-[#8E8278]">{t('Loading…')}</p>
  if (!user || (user.isAnonymous && !allowGuest)) return <LoginPanel title={title} />
  if (!profile && !user.isAnonymous) return <ProfileSetup />
  return <>{children}</>
}

const input = 'w-full rounded-xl border border-[#D4C9BF] bg-white px-4 py-2.5 text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B]'
const inApp = () => typeof navigator !== 'undefined' && /Line\/|FBAN|FBAV|Instagram/i.test(navigator.userAgent)

/** Google's sign-in script, loaded once for the whole page. */
let gsi: Promise<void> | null = null
const loadGsi = () => gsi ??= new Promise<void>((ok, fail) => {
  const s = document.createElement('script')
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true
  s.onload = () => ok(); s.onerror = () => { gsi = null; fail(new Error('gsi')) }
  document.head.appendChild(s)
})
type Gsi = { accounts: { id: {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; nonce: string; ux_mode?: string; use_fedcm_for_button?: boolean }) => void
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
} } }

async function sha256(text: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Sign in with Google (the only way in). Google's own button runs on our page and hands back a signed ID token,
 * which Supabase checks, so people only ever see mepawry.com (no hop via Supabase's address, so Google's
 * branding check only has to cover our own domain).
 * compact: no icon/heading (when the surrounding card already explains).
 */
export function LoginPanel({ title, compact = false }: { title: string; compact?: boolean }) {
  const { supabase, refresh } = useAccount()
  const t = useT()
  const [error, setError] = useState('') // in English; shown translated
  const [busy, setBusy] = useState(false)
  const [embedded, setEmbedded] = useState(false)
  const [copied, setCopied] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => setEmbedded(inApp()), [])
  // Is Google switched on in Supabase, and do we have our own Google client? (the Supabase address and the
  // client id come from the server at runtime, like the account client, not from the build)
  const [googleOn, setGoogleOn] = useState<boolean | null>(null)
  const [clientId, setClientId] = useState('')
  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' }).then(r => r.json())
      .then(d => {
        setClientId(d?.config?.googleClientId ?? '')
        return d?.config?.url ? fetch(`${d.config.url}/auth/v1/settings`, { headers: { apikey: d.config.anonKey }, cache: 'no-store' }).then(r => r.json()) : null
      })
      .then(s => setGoogleOn(!!s?.external?.google))
      .catch(() => setGoogleOn(true)) // can't tell: let them try
  }, [])

  // Google's button, drawn into our box once we know the client id
  useEffect(() => {
    if (!googleOn || !clientId || embedded || !box.current) return
    let gone = false
    ;(async () => {
      const raw = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
      const hashed = await sha256(raw) // Google puts the hash in the token; Supabase checks it against the raw one
      try { await loadGsi() } catch { if (!gone) setError('Google sign-in couldn’t load. Check your connection, or try another browser.'); return }
      if (gone || !box.current) return
      const g = (window as unknown as { google: Gsi }).google
      g.accounts.id.initialize({
        client_id: clientId, nonce: hashed, use_fedcm_for_button: true,
        callback: async ({ credential }) => {
          const sb = supabase()
          if (!sb) return setError('Sign-in isn’t available right now.')
          setBusy(true); setError('')
          const { error } = await sb.auth.signInWithIdToken({ provider: 'google', token: credential, nonce: raw })
          setBusy(false)
          if (error) return setError('Signing in didn’t go through. Please try again.')
          await refresh()
        },
      })
      g.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(400, box.current.clientWidth || 320) })
    })()
    return () => { gone = true }
  }, [googleOn, clientId, embedded, supabase, refresh])

  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true) } catch {} }

  return (
    <div className="space-y-5">
      {!compact && <div className="text-center">
        <div className="text-4xl" aria-hidden>🐾</div>
        <h3 className="mt-2 font-serif text-xl font-bold text-[#2A1E17]">{t(title)}</h3>
        <p className="mt-1 text-sm text-[#8E8278]">{t('So we remember you, and you can edit your memorials from any device.')}</p>
      </div>}

      {embedded ? (
        // Google refuses to sign in inside LINE / Facebook / Instagram: send them to a real browser
        <div className="space-y-3 rounded-xl bg-[#FDF0E5] px-4 py-3 text-sm text-[#8A5A2B]">
          <p>{t('Google sign-in doesn’t work inside LINE or Facebook. Open this page in Safari or Chrome to sign in (tap ⋯ then “Open in browser”).')}</p>
          <button onClick={copyLink} className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-[#2A1E17] ring-1 ring-[#E8D5BF]">
            {copied ? `✓ ${t('Link copied')}` : t('Copy this page’s link')}
          </button>
        </div>
      ) : (
        // Google draws its own button here (until then, a quiet placeholder the same size)
        <div className="flex min-h-[44px] justify-center">
          <div ref={box} className={cn('w-full max-w-[400px]', busy && 'pointer-events-none opacity-50')} />
        </div>
      )}
      {busy && <p className="text-center text-xs text-[#8E8278]">{t('Signing you in…')}</p>}
      {(googleOn === false || (googleOn && !clientId)) && !embedded && <p className="text-center text-xs text-[#8E8278]">{t('Sign-in is being set up. Please check back soon.')}</p>}
      {error && <p role="alert" className="text-center text-sm text-[#C0392B]">{t(error)}</p>}
    </div>
  )
}

/** First sign-in: pick a name and male/female (for your character in the hall). Country is set by the server and locked. */
export function ProfileSetup({ onSaved }: { onSaved?: () => void }) {
  const { profile, refresh } = useAccount()
  const t = useT()
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
          <h3 className="font-serif text-xl font-bold text-[#2A1E17]">{t('Welcome to Mepawry')}</h3>
          <p className="mt-1 text-sm text-[#8E8278]">{t('How should we show you in the hall?')}</p>
        </div>
      )}
      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-[#2A1E17]">{t('Your name')}</label>
        <input id="profile-name" required maxLength={40} placeholder={t('e.g. Nok')} value={name} onChange={e => setName(e.target.value)} className={input} />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-[#2A1E17]">{t('Your character')}</span>
        <div role="radiogroup" aria-label={t('Your character')} className="grid grid-cols-2 gap-3">
          {([['male', '👦', 'Male'], ['female', '👧', 'Female']] as const).map(([g, emoji, label]) => (
            <button
              key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)}
              className={cn('flex flex-col items-center gap-1 rounded-2xl border-2 py-4 transition-all',
                gender === g ? 'border-[#D9823B] bg-[#FDF0E5]' : 'border-[#E8DFD6] bg-white hover:border-[#D9823B]/50')}
            >
              <span className="text-4xl" aria-hidden>{emoji}</span>
              <span className="text-sm font-semibold text-[#2A1E17]">{t(label)}</span>
            </button>
          ))}
        </div>
      </div>
      {profile ? (
        <p className="rounded-xl bg-[#F4EFE6] px-3 py-2 text-xs text-[#5C5046]">
          {flagEmoji(profile.country_code)} {t('Country:')} <b>{profile.country_code === 'XX' ? t('Unknown') : profile.country_code}</b> 🔒 {t('set when you joined and can’t be changed')}
        </p>
      ) : (
        <p className="rounded-xl bg-[#F4EFE6] px-3 py-2 text-xs text-[#5C5046]">
          🔒 {t('Your country is set from where you are now and can’t be changed later. Your pets’ memorials will show it.')}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-[#C0392B]">{t(error)}</p>}
      <button disabled={busy || !name.trim() || !gender} className="w-full rounded-xl bg-[#D9823B] py-3 text-sm font-semibold text-white hover:bg-[#C67129] disabled:opacity-60">
        {busy ? t('Saving…') : profile ? t('Save') : t('Continue')}
      </button>
    </form>
  )
}
