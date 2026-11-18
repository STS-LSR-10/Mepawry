'use client'
// components/site/AddPetButton.tsx — Any button that opens the pet creation modal

import { useState } from 'react'
import { AddPetModal } from '@/components/shrine/AddPetModal'

export function AddPetButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>{children}</button>
      <AddPetModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
