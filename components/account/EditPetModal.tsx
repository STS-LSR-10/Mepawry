'use client'
// components/account/EditPetModal.tsx — The owner changes a memorial's name, kind, years, words or photo.

import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { photoToDataUrl } from '@/lib/photo'
import { CountryPicker } from '@/components/shrine/CountryPicker'
import type { Pet, Species } from '@/types'
import { useT } from '@/lib/i18n'
import { k } from '@/lib/tkey'

const field = 'w-full rounded-xl border border-[#D4C9BF] bg-white px-3 py-2 text-sm text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B]'

export function EditPetModal({ pet, onClose, onSaved }: { pet: Pet | null; onClose: () => void; onSaved: (p: Pet) => void }) {
  const t = useT()
  const [form, setForm] = useState({ name: '', species: 'dog' as Species, birth_year: '', death_year: '', epitaph: '', country_code: 'XX', show_flag: true })
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!pet) return
    setForm({ name: pet.name, species: pet.species, birth_year: pet.birth_year ? String(pet.birth_year) : '', death_year: pet.death_year ? String(pet.death_year) : '', epitaph: pet.epitaph ?? '', country_code: pet.country_code, show_flag: pet.show_flag !== false })
    setPhoto(null); setError('')
  }, [pet])

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { setPhoto(await photoToDataUrl(file)) } catch { setError(k("We couldn't read that photo. Try a JPG or PNG.")) }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pet || !form.name.trim()) return
    setBusy(true); setError('')
    const res = await fetch(`/api/pets/${pet.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(), species: form.species, epitaph: form.epitaph, country_code: form.country_code, show_flag: form.show_flag,
        birth_year: form.birth_year ? Number(form.birth_year) : null,
        death_year: form.death_year ? Number(form.death_year) : null,
        photo,
      }),
    }).catch(() => null)
    setBusy(false)
    const d = await res?.json().catch(() => null)
    if (!res?.ok) return setError(d?.error ?? 'Couldn’t save. Please try again.')
    onSaved(d.pet)
  }

  const shown = photo ?? pet?.primary_photo_url
  return (
    <Modal open={!!pet} onClose={onClose} title={pet ? t('Edit {name}', { name: pet.name }) : ''}>
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#F4EFE6] text-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : '🐾'}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="text-sm font-medium text-[#C67129] hover:underline">
            {shown ? t('Change photo') : t('Add a photo')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={pick} aria-label={t('Add a photo')} />
        </div>
        <div>
          <label htmlFor="edit-name" className="mb-1 block text-xs font-medium text-[#2A1E17]">{t('Name')}</label>
          <input id="edit-name" required maxLength={80} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={field} />
        </div>
        <div role="group" aria-label={t('They were a…')} className="flex gap-2">
          {(['dog', 'cat', 'other'] as Species[]).map(s => (
            <button key={s} type="button" aria-pressed={form.species === s} onClick={() => setForm(f => ({ ...f, species: s }))}
              className={cn('flex-1 rounded-full border py-2 text-sm font-medium', form.species === s ? 'border-[#D9823B] bg-[#D9823B] text-white' : 'border-[#E8DFD6] bg-[#F4EFE6] text-[#5C5046]')}>
              {{ dog: '🐶', cat: '🐱', other: '🐾' }[s]} {t({ dog: 'Dog', cat: 'Cat', other: 'Other' }[s])}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {(['birth_year', 'death_year'] as const).map(k => (
            <div key={k} className="flex-1">
              <label htmlFor={`edit-${k}`} className="mb-1 block text-xs font-medium text-[#2A1E17]">{k === 'birth_year' ? t('Born') : t('Passed')}</label>
              <input id={`edit-${k}`} type="number" min="1900" max={new Date().getFullYear()} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className={field} />
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="edit-epitaph" className="mb-1 block text-xs font-medium text-[#2A1E17]">{t('A few words about them')}</label>
          <textarea id="edit-epitaph" rows={3} maxLength={500} value={form.epitaph} onChange={e => setForm(f => ({ ...f, epitaph: e.target.value }))} className={cn(field, 'resize-none')} />
        </div>
        <CountryPicker value={form.country_code} onChange={c => setForm(f => ({ ...f, country_code: c }))} showFlag={form.show_flag} onShowFlag={v => setForm(f => ({ ...f, show_flag: v }))} />
        {error && <p role="alert" className="text-sm text-[#C0392B]">{t(error)}</p>}
        <Button type="submit" size="lg" loading={busy} className="w-full">{t('Save changes')}</Button>
      </form>
    </Modal>
  )
}

/** Asks before deleting; deleting removes candles, flowers, gifts, guestbook and photos for good. */
export function DeletePetModal({ pet, onClose, onDeleted }: { pet: Pet | null; onClose: () => void; onDeleted: (id: string) => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => setError(''), [pet])
  const remove = async () => {
    if (!pet) return
    setBusy(true); setError('')
    const res = await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError(k('Couldn’t delete. Please try again.'))
    onDeleted(pet.id)
  }
  return (
    <Modal open={!!pet} onClose={onClose} title={pet ? t('Delete {name}’s memorial?', { name: pet.name }) : ''}>
      <div className="space-y-4">
        <p className="text-sm text-[#5C5046]">
          {t('This removes their shrine, photos, and every candle, flower, gift and guestbook message left for them.')}
          <b> {t('It can’t be undone.')}</b> {t('Their shelf becomes free for someone else.')}
        </p>
        {error && <p role="alert" className="text-sm text-[#C0392B]">{t(error)}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#D4C9BF] py-3 text-sm font-semibold text-[#2A1E17]">{t('Keep it')}</button>
          <button onClick={remove} disabled={busy} className="flex-1 rounded-xl bg-[#C0392B] py-3 text-sm font-semibold text-white hover:bg-[#A93226] disabled:opacity-60">
            {busy ? t('Deleting…') : t('Delete forever')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
