'use client'
// components/shrine/NewPetsViewer.tsx — Opened from the "Today we remember" board by the reception door: the pets
// who joined today (the visitor's own day), one big photo at a time, with ‹ › buttons (also arrow keys and swipe) and a link to each pet's shrine.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useT } from '@/lib/i18n'
import { flagEmoji, formatYears, SPECIES_LOOK, startOfToday, timeAgo } from '@/lib/utils'
import type { Pet } from '@/types'


export function NewPetsViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [i, setI] = useState(0)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    setI(0)
    fetch(`/api/pets?limit=100&since=${encodeURIComponent(startOfToday())}`).then(r => r.json()).then(d => setPets(d.pets ?? [])).catch(() => setPets([]))
  }, [open])

  const n = pets?.length ?? 0
  const go = (d: number) => n && setI(k => (k + d + n) % n)
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const p = pets?.[i]
  const look = p ? SPECIES_LOOK[p.species] ?? SPECIES_LOOK.other : null
  const arrow = 'absolute top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-2xl text-[#5A3A22] shadow-md transition hover:bg-white disabled:opacity-40'

  return (
    <Modal open={open} onClose={onClose} title={`🕯️ ${t('Today we remember')}`} className="max-w-md">
      <p className="-mt-1 mb-3 text-sm text-[#8A6A52]">{t('Pets who joined the sanctuary today')}</p>
      {!pets ? (
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-[#F4EDE0] text-sm text-[#8A6A52]">{t('Loading…')}</div>
      ) : !p || !look ? (
        <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl bg-[#F4EDE0] px-6 text-center text-sm text-[#8A6A52]">
          <span className="text-3xl">🕯️</span>{t('No new pets have joined yet today.')}
        </div>
      ) : (
        <>
          <div className="relative select-none"
            onTouchStart={e => { touchX.current = e.touches[0].clientX }}
            onTouchEnd={e => { const x0 = touchX.current; touchX.current = null; if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1) }}>
            <div className="aspect-square overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${look.from}, ${look.to})` }}>
              {p.primary_photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img key={p.id} src={p.primary_photo_url} alt={p.name} className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-8xl">{look.emoji}</div>}
            </div>
            <button type="button" onClick={() => go(-1)} disabled={n < 2} aria-label={t('Previous')} className={`${arrow} left-2`}>‹</button>
            <button type="button" onClick={() => go(1)} disabled={n < 2} aria-label={t('Next')} className={`${arrow} right-2`}>›</button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-xs tabular-nums text-white">{i + 1} / {n}</span>
          </div>
          <div className="mt-3 text-center">
            <h3 className="font-serif text-xl font-semibold text-[#3A2A1A]">{look.emoji} {p.name} {flagEmoji(p.country_code)}</h3>
            <p className="mt-0.5 text-sm text-[#8A6A52]">{[formatYears(p.birth_year, p.death_year), timeAgo(p.created_at)].filter(Boolean).join(' · ')}</p>
            {p.epitaph && <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-line text-sm italic text-[#5A4636]">“{p.epitaph}”</p>}
            <Link href={`/${p.slug}`} className="mt-3 inline-block rounded-full bg-[#B07A4F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9A673F]">
              {t('Visit {name}', { name: p.name })}
            </Link>
          </div>
        </>
      )}
    </Modal>
  )
}
