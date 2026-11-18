'use client'
// components/shrine/AddPetModal.tsx — Pet Creation Flow (S03)

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { photoToDataUrl, saveEditToken } from '@/lib/photo'
import { useAccount } from '@/lib/account'
import { LoginPanel } from '@/components/account/AuthGate'
import { CountryPicker } from '@/components/shrine/CountryPicker'
import { SlotPicker, type SlotChoice } from '@/components/shrine/SlotPicker'
import type { Species } from '@/types'

interface AddPetModalProps {
  open: boolean
  onClose: () => void
}

const SPECIES_OPTIONS: { value: Species; emoji: string; label: string }[] = [
  { value: 'dog', emoji: '🐶', label: 'Dog' },
  { value: 'cat', emoji: '🐱', label: 'Cat' },
  { value: 'other', emoji: '🐾', label: 'Other' },
]

export function AddPetModal({ open, onClose }: AddPetModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    species: 'dog' as Species,
    birth_year: '',
    death_year: '',
    epitaph: '',
  })
  const [slot, setSlot] = useState<SlotChoice>(null)
  const [slotsVersion, setSlotsVersion] = useState(0)
  const account = useAccount()
  const [country, setCountry] = useState('XX')
  const [showFlag, setShowFlag] = useState(true)
  const [email, setEmail] = useState('')
  const [emailNote, setEmailNote] = useState<'sent' | 'failed' | null>(null)
  const [needLogin, setNeedLogin] = useState(false) // guest sign-in unavailable: fall back to a real sign-in
  // A real account (not a guest) already keeps their memorials on every device
  const needsEmail = !account.user || (account.user.isAnonymous && !account.user.email)

  // Pre-fill the country: where this visit comes from, else their profile, else the browser's region setting
  useEffect(() => {
    if (!open) return
    let c = account.country ?? account.profile?.country_code ?? ''
    if (!c) try { c = new Intl.Locale(navigator.language).maximize().region ?? '' } catch {}
    setCountry(/^[A-Z]{2}$/.test(c) ? c : 'XX')
  }, [open, account.country, account.profile])

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again after a change
    if (!file) return
    setError(null)
    setPhotoBusy(true)
    try {
      setPhotoPreview(await photoToDataUrl(file))
    } catch {
      setError("We couldn't read that photo. Try a JPG or PNG.")
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || photoBusy) return
    setLoading(true)
    setError(null)
    try {
      // No account? Start a guest one, so this browser can edit the memorial later
      const sessionError = await account.ensureSession()
      if (sessionError) { setNeedLogin(true); return }
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          species: form.species,
          slot,
          country_code: country,
          show_flag: showFlag,
          birth_year: form.birth_year ? Number(form.birth_year) : null,
          death_year: form.death_year ? Number(form.death_year) : null,
          epitaph: form.epitaph.trim() || null,
          primary_photo_url: photoPreview,
        }),
      })
      const data = await res.json()
      if (res.status === 409) { setSlot(null); setSlotsVersion(v => v + 1) } // shelf just taken: show the new picture
      if (!res.ok) throw new Error(data.error)
      saveEditToken(data.pet.id, data.editToken)
      // Email given: attach it to the guest account; confirming it lets them sign in anywhere later
      if (email.trim() && needsEmail) {
        const { error } = await account.supabase()?.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/me` })
          ?? { error: new Error('no client') }
        setEmailNote(error ? 'failed' : 'sent')
      }
      setCreatedSlug(data.pet.slug)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('form')
    setPhotoPreview(null)
    setError(null)
    setCreatedSlug(null)
    setExpanded(false)
    setForm({ name: '', species: 'dog', birth_year: '', death_year: '', epitaph: '' })
    setSlot(null)
    setEmail('')
    setEmailNote(null)
    setNeedLogin(false)
    setShowFlag(true)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Give your pet a place">
      {step === 'success' ? (
        <SuccessView
          name={form.name}
          note={emailNote === 'sent' ? `We sent a link to ${email}. Tap it to keep ${form.name} safe on any phone.`
            : account.user?.isAnonymous ? 'We’ll remember you on this device. Add your email in My memorials to keep them on any phone.'
            : 'You can edit it anytime from My memorials.'}
          onClose={() => { const slug = createdSlug; handleClose(); if (slug) router.push(`/${slug}`) }}
        />
      ) : needLogin && !account.user ? (
        <div className="space-y-3">
          <LoginPanel title="Sign in to place their shrine" />
          <button onClick={() => setNeedLogin(false)} className="w-full text-xs text-[#C67129] underline">Back to the form</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload */}
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                'w-full aspect-video rounded-2xl border-2 border-dashed transition-colors',
                'flex flex-col items-center justify-center gap-2 cursor-pointer',
                'hover:border-[#D9823B] hover:bg-[#FDF0E5]',
                photoPreview ? 'border-[#D9823B] p-0 overflow-hidden' : 'border-[#D4C9BF] bg-[#F4EFE6]'
              )}
              aria-label="Upload pet photo"
            >
              {photoBusy ? (
                <span className="text-sm text-[#8E8278]">Preparing photo…</span>
              ) : photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="text-3xl">🐾</span>
                  <span className="text-sm text-[#8E8278]">Drop a photo here, or tap to choose</span>
                  <span className="text-xs text-[#B5A99F]">JPG, PNG or HEIC · max 10MB</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhoto}
              aria-label="Choose pet photo"
            />
            {photoPreview && !photoBusy && (
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1.5 text-xs font-medium text-[#C67129] hover:underline">
                Change photo
              </button>
            )}
          </div>

          {/* Pet Name */}
          <div>
            <label htmlFor="pet-name" className="block text-sm font-medium text-[#2A1E17] mb-1.5">
              Your pet&apos;s name <span className="text-[#E74C3C]" aria-hidden>*</span>
            </label>
            <input
              id="pet-name"
              type="text"
              required
              maxLength={80}
              placeholder="e.g. Luna, Max, Coco"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-[#D4C9BF] bg-white px-4 py-2.5 text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B] text-base"
            />
          </div>

          {/* Species */}
          <div>
            <span className="block text-sm font-medium text-[#2A1E17] mb-1.5">They were a…</span>
            <div role="group" aria-label="Pet species" className="flex gap-2">
              {SPECIES_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, species: opt.value }))}
                  className={cn(
                    'flex-1 py-2 rounded-full text-sm font-medium border transition-all',
                    form.species === opt.value
                      ? 'bg-[#D9823B] text-white border-[#D9823B]'
                      : 'bg-[#F4EFE6] text-[#5C5046] border-[#E8DFD6] hover:border-[#D9823B]'
                  )}
                  aria-pressed={form.species === opt.value}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>


          {/* Email (guests only) */}
          {needsEmail && (
            <div>
              <label htmlFor="pet-email" className="block text-sm font-medium text-[#2A1E17] mb-1.5">
                Your email — so you never lose them <span className="font-normal text-[#8E8278]">(optional)</span>
              </label>
              <input
                id="pet-email" type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#D4C9BF] bg-white px-4 py-2.5 text-sm text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B]"
              />
              <p className="mt-1 text-center text-xs text-[#8E8278]">We’ll send you one link to get back to them from any phone. No password, no spam.</p>
            </div>
          )}

          {/* Country */}
          <CountryPicker value={country} onChange={setCountry} showFlag={showFlag} onShowFlag={setShowFlag} />

          {/* Expandable details */}
          <div>
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-2 text-sm text-[#C67129] font-medium hover:underline"
              aria-expanded={expanded}
            >
              <span>{expanded ? '−' : '+'}</span>
              Dates, a few words, more photos <span className="text-[#8E8278] font-normal">(optional)</span>
            </button>

            {expanded && (
              <div className="mt-4 space-y-4 border-t border-[#E8DFD6] pt-4">
                {/* Years */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="born-year" className="block text-xs font-medium text-[#2A1E17] mb-1">Born</label>
                    <input
                      id="born-year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      placeholder="2010"
                      value={form.birth_year}
                      onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                      className="w-full rounded-xl border border-[#D4C9BF] bg-white px-3 py-2 text-sm text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B]"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="died-year" className="block text-xs font-medium text-[#2A1E17] mb-1">Passed</label>
                    <input
                      id="died-year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      placeholder="2024"
                      value={form.death_year}
                      onChange={e => setForm(f => ({ ...f, death_year: e.target.value }))}
                      className="w-full rounded-xl border border-[#D4C9BF] bg-white px-3 py-2 text-sm text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B]"
                    />
                  </div>
                </div>

                {/* Epitaph */}
                <div>
                  <label htmlFor="epitaph" className="block text-xs font-medium text-[#2A1E17] mb-1">
                    A few words about them
                  </label>
                  <textarea
                    id="epitaph"
                    rows={3}
                    maxLength={500}
                    placeholder="They were the gentlest soul…"
                    value={form.epitaph}
                    onChange={e => setForm(f => ({ ...f, epitaph: e.target.value }))}
                    className="w-full rounded-xl border border-[#D4C9BF] bg-white px-3 py-2 text-sm text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B] resize-none"
                  />
                  <p className="text-right text-xs text-[#B5A99F]">{form.epitaph.length}/500</p>
                </div>
              </div>
            )}
          </div>

          {/* Shelf */}
          <SlotPicker value={slot} onChange={setSlot} reloadKey={slotsVersion + (open ? 1 : 0)} />

          {error && <p role="alert" className="text-sm text-[#C0392B]">{error}</p>}

          {/* Submit */}
          <Button type="submit" size="lg" loading={loading} className="w-full">
            🕯️ Place their shrine
          </Button>
          <p className="text-center text-xs text-[#8E8278]">
            Free · {account.user && !account.user.isAnonymous ? 'Saved to your account' : 'No sign-up'} · You can change it anytime
          </p>
        </form>
      )}
    </Modal>
  )
}

function SuccessView({ name, note, onClose }: { name: string; note: string; onClose: () => void }) {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="text-6xl float-anim">🕯️</div>
      <h3 className="font-serif text-2xl font-bold text-[#2A1E17]">
        {name}&apos;s shrine is ready
      </h3>
      <p className="text-[#5C5046] text-sm leading-relaxed">
        They now have a place in the memorial hall, forever.
        {note}
      </p>
      <Button onClick={onClose} variant="secondary" size="lg" className="w-full">
        Visit their shrine →
      </Button>
    </div>
  )
}
