'use client'
// components/shrine/ShrineActions.tsx — Star a memorial (kept in this browser) and save or share a picture of the shrine.

import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { toggleStar, useStars } from '@/lib/stars'
import { SITE, flagEmoji, formatYears } from '@/lib/utils'
import type { Pet } from '@/types'

export function ShrineActions({ pet }: { pet: Pet }) {
  const t = useT()
  const starred = useStars().some(s => s.slug === pet.slug)
  const [busy, setBusy] = useState(false)

  const star = () => toggleStar({ slug: pet.slug, name: pet.name, species: pet.species, photo: pet.primary_photo_url })

  const photo = async () => {
    const cab = document.querySelector<HTMLCanvasElement>('[data-cabinet] canvas')
    if (!cab || busy) return
    setBusy(true)
    try {
      const file = await shrinePicture(cab, pet, t('Light a candle for {name}', { name: pet.name }))
      const url = `${SITE}/${pet.slug}`
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: pet.name, text: url }).catch(() => {}) // cancelled: nothing to do
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(file); a.download = file.name; a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      }
    } finally { setBusy(false) }
  }

  const btn = 'grid h-11 w-11 place-items-center rounded-full text-2xl text-[#FAF7F2] transition hover:bg-white/10 disabled:opacity-50'
  return (
    <div className="absolute right-3 top-24 flex gap-1 sm:right-6">
      <button onClick={star} aria-pressed={starred} aria-label={t(starred ? 'Remove star' : 'Star this memorial')} title={t(starred ? 'Remove star' : 'Star this memorial')} className={btn}>
        <span className={starred ? 'text-[#F2C14E]' : ''} aria-hidden>{starred ? '★' : '☆'}</span>
      </button>
      <button onClick={photo} disabled={busy} aria-label={t('Save a picture of the shrine')} title={t('Save a picture of the shrine')} className={btn}>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
          <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.6" />
        </svg>
      </button>
    </div>
  )
}

/** A 1080×1350 picture: the name, flag and years over the cabinet as it looks now, and the address to visit. */
async function shrinePicture(cab: HTMLCanvasElement, pet: Pet, line: string): Promise<File> {
  const W = 1080, H = 1350
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  const bg = g.createRadialGradient(W / 2, H * 0.52, 0, W / 2, H * 0.52, H * 0.75)
  bg.addColorStop(0, '#6E3A1A'); bg.addColorStop(0.45, '#3A1D0E'); bg.addColorStop(1, '#160B06')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  g.textAlign = 'center'; g.fillStyle = '#FAF7F2'
  g.font = '500 92px Georgia, serif'; g.fillText(pet.name, W / 2, 150, W - 80)
  const sub = [pet.show_flag === false ? '' : flagEmoji(pet.country_code), formatYears(pet.birth_year, pet.death_year)].filter(Boolean).join('  ')
  if (sub) { g.font = '600 44px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; g.fillStyle = 'rgba(250,247,242,.75)'; g.fillText(sub, W / 2, 222) }
  // the cabinet, fitted into the middle (its canvas keeps its last frame: preserveDrawingBuffer)
  const box = { x: 30, y: 260, w: W - 60, h: 900 }
  const s = Math.min(box.w / cab.width, box.h / cab.height)
  const w = cab.width * s, h = cab.height * s
  g.drawImage(cab, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h)
  g.fillStyle = '#FFE2C0'; g.font = '500 40px Georgia, serif'; g.fillText(`🕯️ ${line}`, W / 2, 1230, W - 80)
  g.fillStyle = 'rgba(250,247,242,.6)'; g.font = '500 32px system-ui, sans-serif'; g.fillText(`${SITE.replace('https://', '')}/${pet.slug}`, W / 2, 1295)
  const blob = await new Promise<Blob>((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('no image'))), 'image/png'))
  return new File([blob], `${pet.slug}-mepawry.png`, { type: 'image/png' })
}
