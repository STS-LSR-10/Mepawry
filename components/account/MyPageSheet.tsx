'use client'
// components/account/MyPageSheet.tsx — "My page" from the name pill in the hall: change your name, sign in
// (Google or an email code) so your pets follow you, or — when signed in — jump to your memorials, look, sign out.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { LoginPanel, ProfileSetup } from './AuthGate'
import { useAccount } from '@/lib/account'
import { setVisitorName } from '@/lib/visitor'
import { useMyLook } from '@/lib/look'

export function MyPageSheet({ open, onClose, name }: { open: boolean; onClose: () => void; name: string }) {
  const account = useAccount()
  const { user, profile, signOut } = account
  const look = useMyLook()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setEditing(false); setDraft(name); setError('') } }, [open, name])

  const signedIn = !!user && !user.isAnonymous

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = draft.trim().slice(0, 40)
    if (!clean) return
    setBusy(true); setError('')
    setVisitorName(clean) // this browser (guests), and the hall's name tag right away
    // With a session, keep it on the profile too, so it follows you to other devices
    if (user) {
      const res = await fetch('/api/me', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: clean, gender: profile?.gender ?? look.gender }),
      }).catch(() => null)
      if (!res?.ok) setError('Saved on this device. Couldn’t save to your account, try again later.')
      await account.refresh()
    }
    setBusy(false); setEditing(false)
  }

  return (
    <Modal open={open} onClose={onClose} className="bg-gradient-to-b from-[#FFF8EE] to-[#FBEFE0]">
      <div className="relative space-y-5 pt-2 text-center">
        <button onClick={onClose} aria-label="Close" className="absolute -right-2 -top-3 grid h-9 w-9 place-items-center rounded-full bg-[#F4EBDD] text-[#8E8278] hover:text-[#2A1E17]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C67129]">My page</p>

        {editing ? (
          <form onSubmit={saveName} className="mx-auto flex max-w-xs gap-2">
            <label htmlFor="my-name" className="sr-only">Your name</label>
            <input id="my-name" autoFocus maxLength={40} value={draft} onChange={e => setDraft(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-[#D4C9BF] bg-white px-3 py-2 text-center font-serif text-xl text-[#2A1E17] focus:outline-none focus:ring-2 focus:ring-[#D9823B]" />
            <button disabled={busy || !draft.trim()} className="rounded-xl bg-[#D9823B] px-4 text-sm font-semibold text-white disabled:opacity-60">{busy ? '…' : 'Save'}</button>
          </form>
        ) : (
          <>
            <h2 id="modal-title" className="font-serif text-4xl font-bold text-[#2A1E17]">{name}</h2>
            <button onClick={() => setEditing(true)} className="text-sm font-semibold text-[#C67129] hover:underline">✏️ Change name</button>
          </>
        )}
        {error && <p className="text-xs text-[#C0392B]">{error}</p>}

        {signedIn ? (
          profile ? (
            <div className="space-y-3 rounded-3xl bg-white p-5 text-left shadow-sm">
              <p className="text-sm text-[#5C5046]">✅ Signed in{user.email ? <> as <b>{user.email}</b></> : null}. Your memorials and look follow you to any device.</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/me" className="rounded-2xl bg-[#FDF0E5] px-3 py-2.5 text-center text-sm font-semibold text-[#2A1E17]">📖 My memorials</Link>
                <button onClick={() => { onClose(); window.dispatchEvent(new Event('mepawry:look-editor')) }} className="rounded-2xl bg-[#FDF0E5] px-3 py-2.5 text-sm font-semibold text-[#2A1E17]">👕 My look</button>
              </div>
              <button onClick={signOut} className="w-full text-center text-xs text-[#8E8278] underline">Sign out</button>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-5 text-left shadow-sm"><ProfileSetup /></div>
          )
        ) : (
          <div className="space-y-3 rounded-3xl bg-white p-5 text-left shadow-sm">
            <p className="font-semibold text-[#2A1E17]">🐾 Keep your pets on every device</p>
            <p className="text-sm text-[#8E8278]">Sign in once with Google or your email. Your memorials, letters and look follow you to any phone or computer.</p>
            <LoginPanel title="Sign in" compact />
          </div>
        )}
      </div>
    </Modal>
  )
}
