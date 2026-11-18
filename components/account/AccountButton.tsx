'use client'
// components/account/AccountButton.tsx — "Sign in" in the top bar, or your character and name once signed in.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { AuthGate } from './AuthGate'
import { useAccount } from '@/lib/account'

export function AccountButton() {
  const { loading, profile } = useAccount()
  const [open, setOpen] = useState(false)
  // Close the sign-in box once sign-in and profile are both done
  useEffect(() => { if (profile) setOpen(false) }, [profile])
  if (loading) return null
  if (profile) {
    return (
      <Link href="/me" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-[#FAF7F2] hover:bg-white/20" aria-label={`My account, ${profile.display_name}`}>
        <span aria-hidden>{profile.gender === 'female' ? '👧' : '👦'}</span>
        <span className="hidden max-w-[110px] truncate sm:inline">{profile.display_name}</span>
      </Link>
    )
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full px-3 py-1.5 text-sm text-[#FAF7F2]/85 hover:text-white">Sign in</button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <AuthGate title="Welcome back"><p className="py-6 text-center text-sm text-[#5C5046]">You’re signed in.</p></AuthGate>
      </Modal>
    </>
  )
}
