'use client'
// components/account/AccountButton.tsx — "Sign in" in the top bar, or your character and name once signed in.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { AuthGate } from './AuthGate'
import { useAccount } from '@/lib/account'
import { useT } from '@/lib/i18n'

export function AccountButton({ light = false }: { light?: boolean }) {
  const pill = light ? 'bg-[#3B2A1E]/10 text-[#3B2A1E] hover:bg-[#3B2A1E]/15' : 'bg-white/10 text-[#FAF7F2] hover:bg-white/20'
  const { loading, user, profile } = useAccount()
  const t = useT()
  const [open, setOpen] = useState(false)
  // Close the sign-in box once sign-in and profile are both done
  useEffect(() => { if (profile && !user?.isAnonymous) setOpen(false) }, [profile, user])
  if (loading) return null
  if (user?.isAnonymous) {
    return <Link href="/me" className={`rounded-full px-3 py-1.5 text-sm ${pill}`}>{t('My pets')}</Link>
  }
  if (profile) {
    return (
      <Link href="/me" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${pill}`} aria-label={`${t('My account')}, ${profile.display_name}`}>
        <span aria-hidden>{profile.gender === 'female' ? '👧' : '👦'}</span>
        <span className="hidden max-w-[110px] truncate sm:inline">{profile.display_name}</span>
      </Link>
    )
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${light ? 'text-[#3B2A1E] hover:text-[#2A1E17]' : 'text-[#FAF7F2]/85 hover:text-white'}`}>{t('Sign in')}</button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <AuthGate title="Welcome back"><p className="py-6 text-center text-sm text-[#5C5046]">{t('You’re signed in.')}</p></AuthGate>
      </Modal>
    </>
  )
}
