'use client'
// app/me/page.tsx — My account: name, character (male/female), locked country, and my memorials (edit / delete).

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/site/SiteNav'
import { AuthGate, LoginPanel, ProfileSetup } from '@/components/account/AuthGate'
import { DeletePetModal, EditPetModal } from '@/components/account/EditPetModal'
import { LookEditor } from '@/components/account/LookEditor'
import { useAccount } from '@/lib/account'
import { flagEmoji, SPECIES_LOOK } from '@/lib/utils'
import type { Pet } from '@/types'

export default function MePage() {
  return (
    <main className="min-h-dvh bg-[#FAF7F2] pb-20 pt-24">
      <SiteNav solid />
      <div className="mx-auto max-w-[720px] px-4">
        <AuthGate title="Sign in to see your memorials" allowGuest><Account /></AuthGate>
      </div>
    </main>
  )
}

function Account() {
  const { user, profile, signOut } = useAccount()
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [editing, setEditing] = useState<Pet | null>(null)
  const [deleting, setDeleting] = useState<Pet | null>(null)
  const [editProfile, setEditProfile] = useState(false)

  const load = useCallback(() => {
    fetch('/api/me/pets', { cache: 'no-store' }).then(r => r.json()).then(d => setPets(d.pets ?? [])).catch(() => setPets([]))
  }, [])
  useEffect(() => { load() }, [load])
  // ?edit=<id> from a shrine page opens that pet straight away
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('edit')
    if (id && pets) setEditing(pets.find(p => p.id === id) ?? null)
  }, [pets])

  return (
    <div className="space-y-8">
      {user?.isAnonymous ? <GuestCard /> : profile && (
      <section className="rounded-3xl border border-[#E8DFD6] bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#FDF0E5] text-4xl" aria-hidden>{profile.gender === 'female' ? '👧' : '👦'}</div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-2xl font-bold text-[#2A1E17]">{profile.display_name}</h1>
            <p className="truncate text-sm text-[#8E8278]">{user?.email}</p>
            <p className="mt-0.5 text-xs text-[#8E8278]">{flagEmoji(profile.country_code)} {profile.country_code === 'XX' ? 'Country unknown' : profile.country_code} 🔒</p>
          </div>
          <button onClick={() => setEditProfile(v => !v)} className="rounded-full border border-[#D4C9BF] px-3 py-1.5 text-xs font-semibold text-[#2A1E17]">
            {editProfile ? 'Close' : 'Edit'}
          </button>
        </div>
        {editProfile && <div className="mt-5 border-t border-[#F0E8DC] pt-5"><ProfileSetup onSaved={() => setEditProfile(false)} /></div>}
      </section>
      )}

      <LookSection />

      <section>
        <h2 className="mb-3 font-serif text-xl font-bold text-[#2A1E17]">My memorials</h2>
        {pets === null ? (
          <p className="text-sm text-[#8E8278]">Loading…</p>
        ) : pets.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-[#8E8278]">You haven’t added a memorial yet. Use “+ Add my pet” at the top.</p>
        ) : (
          <ul className="space-y-3">
            {pets.map(p => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl border border-[#E8DFD6] bg-white p-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl text-3xl" style={{ background: SPECIES_LOOK[p.species].from }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.primary_photo_url ? <img src={p.primary_photo_url} alt="" className="h-full w-full object-cover" /> : SPECIES_LOOK[p.species].emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/${p.slug}`} className="block truncate font-semibold text-[#2A1E17] hover:underline">{p.name}</Link>
                  <p className="text-xs text-[#8E8278]">Dome {p.floor_id} · shelf {p.shrine_position + 1} · 🕯️ {p.candle_count} · 🌸 {p.flower_count}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setEditing(p)} className="rounded-full border border-[#D4C9BF] px-3 py-1.5 text-xs font-semibold text-[#2A1E17] hover:bg-[#FAF7F2]">Edit</button>
                  <button onClick={() => setDeleting(p)} className="rounded-full border border-[#E8C4BF] px-3 py-1.5 text-xs font-semibold text-[#C0392B] hover:bg-[#FDF2F0]">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!user?.isAnonymous && <button onClick={signOut} className="text-sm text-[#8E8278] underline">Sign out</button>}

      <EditPetModal pet={editing} onClose={() => setEditing(null)} onSaved={p => { setPets(ps => ps?.map(x => (x.id === p.id ? p : x)) ?? null); setEditing(null) }} />
      <DeletePetModal pet={deleting} onClose={() => setDeleting(null)} onDeleted={id => { setPets(ps => ps?.filter(x => x.id !== id) ?? null); setDeleting(null) }} />
    </div>
  )
}

/** A guest is remembered only by this browser. Adding an email keeps the same account (and pets) on any phone. */
function GuestCard() {
  const { user, supabase } = useAccount()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [signIn, setSignIn] = useState(false)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setState('busy')
    const { error } = await supabase()?.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=/me` }) ?? { error: true }
    setState(error ? 'error' : 'sent')
  }
  return (
    <section className="space-y-4 rounded-3xl border border-[#E8DFD6] bg-white p-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#2A1E17]">You’re a guest on this device</h1>
        <p className="mt-1 text-sm text-[#5C5046]">
          This browser remembers you, so you can edit and delete your memorials here. Clearing it, or using another phone, would lose them, so add your email to keep them safe.
        </p>
      </div>
      {user?.email ? (
        <p className="rounded-xl bg-[#F4EFE6] px-3 py-2 text-sm text-[#5C5046]">Check <b>{user.email}</b> and tap the link to confirm it.</p>
      ) : state === 'sent' ? (
        <p className="rounded-xl bg-[#EAF6EE] px-3 py-2 text-sm text-[#2E7D4F]">We sent a link to <b>{email}</b>. Tap it to finish, then sign in with that email on any phone.</p>
      ) : (
        <form onSubmit={save} className="flex gap-2">
          <label htmlFor="guest-email" className="sr-only">Email</label>
          <input id="guest-email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-[#D4C9BF] px-3 py-2 text-sm text-[#2A1E17] focus:outline-none focus:ring-2 focus:ring-[#D9823B]" />
          <button disabled={state === 'busy'} className="rounded-xl bg-[#D9823B] px-4 text-sm font-semibold text-white disabled:opacity-60">Keep them</button>
        </form>
      )}
      {state === 'error' && <p className="text-sm text-[#C0392B]">That email couldn’t be added. It may already have an account: sign in with it below.</p>}
      <button onClick={() => setSignIn(v => !v)} className="text-sm text-[#C67129] underline">
        {signIn ? 'Close' : 'Already have an account? Sign in (your memorials here move to it)'}
      </button>
      {signIn && <div className="border-t border-[#F0E8DC] pt-4"><LoginPanel title="Sign in" /></div>}
    </section>
  )
}

/** Dress your character (same look in the hall, seen by other visitors). */
function LookSection() {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-3xl border border-[#E8DFD6] bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-[#2A1E17]">👕 My character</h2>
        {!open && <button onClick={() => setOpen(true)} className="rounded-full border border-[#D4C9BF] px-3 py-1.5 text-xs font-semibold text-[#2A1E17]">Dress up</button>}
      </div>
      {open ? <div className="mt-4"><LookEditor onDone={() => setOpen(false)} /></div> : <p className="mt-1 text-sm text-[#8E8278]">Choose skin, hair, top, bottom and colours for your character in the hall.</p>}
    </section>
  )
}
