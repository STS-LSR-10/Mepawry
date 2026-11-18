'use client'
// app/me/page.tsx — My account: name, character (male/female), locked country, and my memorials (edit / delete).

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/site/SiteNav'
import { AuthGate, ProfileSetup } from '@/components/account/AuthGate'
import { DeletePetModal, EditPetModal } from '@/components/account/EditPetModal'
import { useAccount } from '@/lib/account'
import { flagEmoji, SPECIES_LOOK } from '@/lib/utils'
import type { Pet } from '@/types'

export default function MePage() {
  return (
    <main className="min-h-dvh bg-[#FAF7F2] pb-20 pt-24">
      <SiteNav solid />
      <div className="mx-auto max-w-[720px] px-4">
        <AuthGate title="Sign in to see your memorials"><Account /></AuthGate>
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

  if (!profile) return null
  return (
    <div className="space-y-8">
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
                  <p className="text-xs text-[#8E8278]">Floor {p.floor_id} · shelf {p.shrine_position + 1} · 🕯️ {p.candle_count} · 🌸 {p.flower_count}</p>
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

      <button onClick={signOut} className="text-sm text-[#8E8278] underline">Sign out</button>

      <EditPetModal pet={editing} onClose={() => setEditing(null)} onSaved={p => { setPets(ps => ps?.map(x => (x.id === p.id ? p : x)) ?? null); setEditing(null) }} />
      <DeletePetModal pet={deleting} onClose={() => setDeleting(null)} onDeleted={id => { setPets(ps => ps?.filter(x => x.id !== id) ?? null); setDeleting(null) }} />
    </div>
  )
}
