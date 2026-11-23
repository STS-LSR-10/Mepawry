'use client'
// components/shrine/AddPetModal.tsx — Pet Creation Flow (S03)

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { photoToDataUrl, saveEditToken } from '@/lib/photo'
import { useAccount } from '@/lib/account'
import { useT } from '@/lib/i18n'
import { LoginPanel } from '@/components/account/AuthGate'
import { CountryPicker } from '@/components/shrine/CountryPicker'
import { SlotPicker, type SlotChoice } from '@/components/shrine/SlotPicker'
import { startCheckout } from '@/lib/checkout'
import { VIP_PRICE_THB } from '@/lib/decor'
import { scriptOf } from '@/components/ui/Translatable'

// The form, kept while they pay for a VIP niche on Stripe, so the shrine is made when they come back
const DRAFT = 'pm-vip-draft'
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
    name_latin: '',
    species: 'dog' as Species,
    birth_year: '',
    death_year: '',
    epitaph: '',
  })
  const [slot, setSlot] = useState<SlotChoice>(null)
  const [vipNiche, setVipNiche] = useState<number | null>(null)
  const [vipFloor, setVipFloor] = useState(1)
  const [slotsVersion, setSlotsVersion] = useState(0)
  const account = useAccount()
  const admin = !!account.user?.isAdmin
  const choseVip = vipNiche != null && !admin // signed-in users only
  const paysForVip = choseVip && VIP_PRICE_THB > 0 // admins place for free; everyone else pays first, unless VIP is free
  const t = useT()
  const [country, setCountry] = useState('XX')
  const [showFlag, setShowFlag] = useState(true)
  const [needLogin, setNeedLogin] = useState(false) // guest sign-in unavailable: fall back to a real sign-in
  // A real account (not a guest) already keeps their memorials on every device

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

  // Back from paying for a VIP niche (?vipsession=…): put the form back and, if it was paid, make the shrine
  useEffect(() => {
    if (!open) return
    const session = new URLSearchParams(window.location.search).get('vipsession')
    if (!session) return
    let d: { form: typeof form; slot: SlotChoice; country: string; showFlag: boolean; photo: string | null; vipNiche: number; vipFloor: number } | null = null
    try { d = JSON.parse(localStorage.getItem(DRAFT) ?? 'null') } catch {}
    window.history.replaceState(null, '', window.location.pathname)
    if (!d) return
    setForm(d.form); setSlot(d.slot); setCountry(d.country); setShowFlag(d.showFlag); setPhotoPreview(d.photo); setVipNiche(d.vipNiche); setVipFloor(d.vipFloor)
    if (session.startsWith('cs_')) void create(d, session)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || photoBusy) return
    if (choseVip && (!account.user || account.user.isAnonymous)) { setNeedLogin(true); return }
    if (paysForVip) {
      // a VIP niche: signed in with Google, then pay, then the shrine is made (see the effect above)
      if (!account.user || account.user.isAnonymous) { setNeedLogin(true); return }
      setLoading(true); setError(null)
      try { localStorage.setItem(DRAFT, JSON.stringify({ form, slot, country, showFlag, photo: photoPreview, vipNiche, vipFloor })) }
      catch { setLoading(false); return setError('That photo is too big to keep while you pay. Try a smaller one.') }
      const err = await startCheckout({ kind: 'niche', floor: vipFloor, position: vipNiche! })
      if (err) { setError(err); setLoading(false) }
      return
    }
    await create({ form, slot, country, showFlag, photo: photoPreview, vipNiche, vipFloor })
  }

  const create = async (d: { form: typeof form; slot: SlotChoice; country: string; showFlag: boolean; photo: string | null; vipNiche: number | null; vipFloor: number }, vipSession?: string) => {
    const { form, slot, country, showFlag } = d
    const photoPreview = d.photo, vipNiche = vipSession ? null : d.vipNiche
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
          name_latin: form.name_latin?.trim() || null,
          species: form.species,
          slot,
          country_code: country,
          show_flag: showFlag,
          birth_year: form.birth_year ? Number(form.birth_year) : null,
          death_year: form.death_year ? Number(form.death_year) : null,
          epitaph: form.epitaph.trim() || null,
          primary_photo_url: photoPreview,
          vipSession,
        }),
      })
      const data = await res.json()
      if (res.status === 409) { setSlot(null); setSlotsVersion(v => v + 1) } // shelf just taken: show the new picture
      if (!res.ok) throw new Error(data.error)
      saveEditToken(data.pet.id, data.editToken)
      // Admin chose a VIP niche too: place them there now
      if (vipNiche != null) {
        const v = await fetch(`/api/pets/${data.pet.id}/vip`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'place', position: vipNiche }) }).catch(() => null)
        if (!v?.ok) setError('Their shrine is placed, but the VIP niche couldn’t be set. Try again from their shrine page.')
      }
      if (vipSession) try { localStorage.removeItem(DRAFT) } catch {}
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
    setForm({ name: '', name_latin: '', species: 'dog', birth_year: '', death_year: '', epitaph: '' })
    setSlot(null)
    setVipNiche(null)
    setNeedLogin(false)
    setShowFlag(true)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Give your pet a place">
      {step === 'success' ? (
        <SuccessView
          name={form.name}
          note={account.user?.isAnonymous ? 'We’ll remember you on this device. Sign in with Google in My memorials to keep them on any phone.'
            : 'You can edit it anytime from My memorials.'}
          onClose={() => { const slug = createdSlug; handleClose(); if (slug) router.push(`/${slug}`) }}
        />
      ) : needLogin && (!account.user || (choseVip && account.user.isAnonymous)) ? (
        <div className="space-y-3">
          <LoginPanel title={choseVip ? 'Sign in to choose a VIP niche' : 'Sign in to place their shrine'} />
          <button onClick={() => setNeedLogin(false)} className="w-full text-xs text-[#C67129] underline">{t('Back to the form')}</button>
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
              aria-label={t('Upload pet photo')}
            >
              {photoBusy ? (
                <span className="text-sm text-[#8E8278]">{t('Preparing photo…')}</span>
              ) : photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt={t('Preview')} className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="text-3xl">🐾</span>
                  <span className="text-sm text-[#8E8278]">{t('Drop a photo here, or tap to choose')}</span>
                  <span className="text-xs text-[#B5A99F]">{t('JPG, PNG or HEIC · max 10MB')}</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhoto}
              aria-label={t('Choose pet photo')}
            />
            {photoPreview && !photoBusy && (
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1.5 text-xs font-medium text-[#C67129] hover:underline">
                {t('Change photo')}
              </button>
            )}
          </div>

          {/* Pet Name */}
          <div>
            <label htmlFor="pet-name" className="block text-sm font-medium text-[#2A1E17] mb-1.5">
              {t('Your pet’s name')} <span className="text-[#E74C3C]" aria-hidden>*</span>
            </label>
            <input
              id="pet-name"
              type="text"
              required
              maxLength={80}
              placeholder={t('e.g. Luna, Max, Coco')}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-[#D4C9BF] bg-white px-4 py-2.5 text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B] text-base"
            />
          {/* only for a name in another alphabet (Thai, Japanese…): how to write it in English letters */}
          {form.name.trim() && scriptOf(form.name) !== 'latin' && (
            <div className="mt-2">
              <label htmlFor="pet-name-latin" className="mb-1 block text-xs font-medium text-[#5C5046]">{t('Name in English letters')} <span className="font-normal text-[#8E8278]">({t('optional')})</span></label>
              <input id="pet-name-latin" type="text" maxLength={60} lang="en" autoCapitalize="words" placeholder={t('e.g. Khao Suay')}
                value={form.name_latin ?? ''} onChange={e => setForm(f => ({ ...f, name_latin: e.target.value.replace(/[^A-Za-zÀ-ɏ .'-]/g, '') }))}
                className="w-full rounded-xl border border-[#D4C9BF] bg-white px-4 py-2 text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B] text-base" />
              <p className="mt-1 text-[11px] text-[#8E8278]">{t('Shown under their name for visitors who can’t read it')}</p>
            </div>
          )}
          </div>

          {/* Species */}
          <div>
            <span className="block text-sm font-medium text-[#2A1E17] mb-1.5">{t('They were a…')}</span>
            <div role="group" aria-label={t('They were a…')} className="flex gap-2">
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
                  {opt.emoji} {t(opt.label)}
                </button>
              ))}
            </div>
          </div>


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
              {t('Dates and a few words')} <span className="text-[#8E8278] font-normal">({t('optional')})</span>
            </button>

            {expanded && (
              <div className="mt-4 space-y-4 border-t border-[#E8DFD6] pt-4">
                {/* Years */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="born-year" className="block text-xs font-medium text-[#2A1E17] mb-1">{t('Born')}</label>
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
                    <label htmlFor="died-year" className="block text-xs font-medium text-[#2A1E17] mb-1">{t('Passed')}</label>
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
                    {t('A few words about them')}
                  </label>
                  <textarea
                    id="epitaph"
                    rows={3}
                    maxLength={500}
                    placeholder={t('They were the gentlest soul…')}
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
          <SlotPicker value={slot} onChange={setSlot} reloadKey={slotsVersion + (open ? 1 : 0)} vip={vipNiche} onVip={(v, f) => { setVipNiche(v); setVipFloor(f) }} />

          {error && <p role="alert" className="text-sm text-[#C0392B]">{t(error)}</p>}

          {/* Submit */}
          <Button type="submit" size="lg" loading={loading} className="w-full">
            {paysForVip ? <>✿ {t('Pay ฿{n} and place their shrine', { n: VIP_PRICE_THB })}</> : choseVip ? <>✿ {t('Place their shrine')}</> : <>🕯️ {t('Place their shrine')}</>}
          </Button>
          <p className="text-center text-xs text-[#8E8278]">
            {choseVip ? `${t('VIP niche {n}', { n: vipNiche! + 1 })}${paysForVip ? '' : ` · ${t('Free for now')}`}` : t('Free')} · {account.user && !account.user.isAnonymous ? t('Saved to your account') : choseVip ? t('Sign in') : t('No sign-up')} · {t('You can change it anytime')}
          </p>
        </form>
      )}
    </Modal>
  )
}

function SuccessView({ name, note, onClose }: { name: string; note: string; onClose: () => void }) {
  const t = useT()
  return (
    <div className="text-center space-y-4 py-4">
      <div className="text-6xl float-anim">🕯️</div>
      <h3 className="font-serif text-2xl font-bold text-[#2A1E17]">
        {t('{name}’s shrine is ready', { name })}
      </h3>
      <p className="text-[#5C5046] text-sm leading-relaxed">
        {t('They now have a place in the memorial hall, forever.')} {t(note)}
      </p>
      <Button onClick={onClose} variant="secondary" size="lg" className="w-full">
        {t('Visit their shrine')} →
      </Button>
    </div>
  )
}
