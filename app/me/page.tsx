'use client'
// app/me/page.tsx — My account: name, character (male/female), locked country, and my memorials (edit / delete).

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/site/SiteNav'
import { AuthGate, LoginPanel, ProfileSetup } from '@/components/account/AuthGate'
import { DeletePetModal, EditPetModal } from '@/components/account/EditPetModal'
import { LookEditor } from '@/components/account/LookEditor'
import { useAccount } from '@/lib/account'
import { toggleStar, useStars } from '@/lib/stars'
import { useT } from '@/lib/i18n'
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
  const t = useT()
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
            <p className="mt-0.5 text-xs text-[#8E8278]">{flagEmoji(profile.country_code)} {profile.country_code === 'XX' ? t('Country unknown') : profile.country_code} 🔒</p>
          </div>
          <button onClick={() => setEditProfile(v => !v)} className="rounded-full border border-[#D4C9BF] px-3 py-1.5 text-xs font-semibold text-[#2A1E17]">
            {editProfile ? t('Close') : t('Edit')}
          </button>
        </div>
        {editProfile && <div className="mt-5 border-t border-[#F0E8DC] pt-5"><ProfileSetup onSaved={() => setEditProfile(false)} /></div>}
      </section>
      )}

      <LookSection />

      <section>
        <h2 className="mb-3 font-serif text-xl font-bold text-[#2A1E17]">{t('My memorials')}</h2>
        {pets === null ? (
          <p className="text-sm text-[#8E8278]">{t('Loading…')}</p>
        ) : pets.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-[#8E8278]">{t('You haven’t added a memorial yet. Use “+ Add my pet” at the top.')}</p>
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
                  <p className="text-xs text-[#8E8278]">{t('Dome {n}', { n: p.floor_id })} · {t('shelf {n}', { n: p.shrine_position + 1 })} · 🕯️ {p.candle_count} · 🌸 {p.flower_count}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setEditing(p)} className="rounded-full border border-[#D4C9BF] px-3 py-1.5 text-xs font-semibold text-[#2A1E17] hover:bg-[#FAF7F2]">{t('Edit')}</button>
                  <button onClick={() => setDeleting(p)} className="rounded-full border border-[#E8C4BF] px-3 py-1.5 text-xs font-semibold text-[#C0392B] hover:bg-[#FDF2F0]">{t('Delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StarredSection />

      {!user?.isAnonymous && <button onClick={signOut} className="text-sm text-[#8E8278] underline">{t('Sign out')}</button>}

      <EditPetModal pet={editing} onClose={() => setEditing(null)} onSaved={p => { setPets(ps => ps?.map(x => (x.id === p.id ? p : x)) ?? null); setEditing(null) }} />
      <DeletePetModal pet={deleting} onClose={() => setDeleting(null)} onDeleted={id => { setPets(ps => ps?.filter(x => x.id !== id) ?? null); setDeleting(null) }} />
    </div>
  )
}

/** Memorials starred on this browser (the ☆ on a shrine page). */
function StarredSection() {
  const t = useT()
  const stars = useStars()
  if (!stars.length) return null
  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-bold text-[#2A1E17]">★ {t('Starred memorials')}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stars.map(s => {
          const look = SPECIES_LOOK[s.species as Pet['species']] ?? SPECIES_LOOK.other
          return (
            <li key={s.slug} className="relative overflow-hidden rounded-2xl border border-[#E8DFD6] bg-white">
              <Link href={`/${s.slug}`} className="block">
                <div className="grid aspect-square place-items-center text-5xl" style={{ background: look.from }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.photo ? <img src={s.photo} alt="" className="h-full w-full object-cover" /> : look.emoji}
                </div>
                <p className="truncate px-3 py-2 text-sm font-semibold text-[#2A1E17]">{s.name}</p>
              </Link>
              <button onClick={() => toggleStar(s)} aria-label={t('Remove star')} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-lg text-[#D9A520]">★</button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** A guest is remembered only by this browser. Signing in with Google keeps their memorials (they move to the account) on any phone. */
function GuestCard() {
  const t = useT()
  return (
    <section className="space-y-4 rounded-3xl border border-[#E8DFD6] bg-white p-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#2A1E17]">{t('You’re a guest on this device')}</h1>
        <p className="mt-1 text-sm text-[#5C5046]">
          {t('This browser remembers you, so you can edit and delete your memorials here. Clearing it, or using another phone, would lose them, so sign in with Google to keep them safe. They’ll move to your account.')}
        </p>
      </div>
      <LoginPanel title="Sign in" compact />
    </section>
  )
}

/** Dress your character (same look in the hall, seen by other visitors). */
function LookSection() {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-3xl border border-[#E8DFD6] bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-[#2A1E17]">👕 {t('My character')}</h2>
        {!open && <button onClick={() => setOpen(true)} className="rounded-full border border-[#D4C9BF] px-3 py-1.5 text-xs font-semibold text-[#2A1E17]">{t('Dress up')}</button>}
      </div>
      {open ? <div className="mt-4"><LookEditor onDone={() => setOpen(false)} /></div> : <p className="mt-1 text-sm text-[#8E8278]">{t('Choose skin, hair, top, bottom and colours for your character in the hall.')}</p>}
    </section>
  )
}
