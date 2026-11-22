'use client'
// app/[slug]/ChangePhotoButton.tsx — Lets the person who created this shrine upload a new photo

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getEditToken, photoToDataUrl } from '@/lib/photo'
import { useT } from '@/lib/i18n'

export function ChangePhotoButton({ petId, hasPhoto }: { petId: string; hasPhoto: boolean }) {
  const t = useT()
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const [refused, setRefused] = useState('') // the server's reason, e.g. the photo isn't of a pet
  useEffect(() => setToken(getEditToken(petId)), [petId])
  if (!token) return null

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus('busy')
    try {
      const res = await fetch(`/api/pets/${petId}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, photo: await photoToDataUrl(file) }),
      })
      if (!res.ok) { setRefused((await res.json().catch(() => null))?.error ?? ''); throw new Error() }
      setStatus('idle'); setRefused('')
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={status === 'busy'}
        className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs text-[#FAF7F2]/80 transition hover:bg-white/10 disabled:opacity-60"
      >
        {status === 'busy' ? t('Uploading…') : `📷 ${hasPhoto ? t('Change photo') : t('Add a photo')}`}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPick} aria-label={t('Add a photo')} />
      {status === 'error' && <p role="alert" className="mt-2 text-xs text-[#FFB4A8]">{t(refused || 'Upload failed. Try a JPG or PNG.')}</p>}
    </div>
  )
}
