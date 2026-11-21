'use client'
// components/site/SoundButton.tsx — 🎵 in the hall's top bar: turn the background music on or off and set how loud
// it is. Remembered in this browser. Browsers block sound until the visitor touches the page, so the music starts
// on the first tap or key press anywhere.

import { useEffect, useRef, useState } from 'react'
import { setAmbientVolume, startAmbient, stopAmbient } from '@/lib/ambient'
import { setPref, usePref } from '@/lib/settings'
import { useT } from '@/lib/i18n'

export function SoundButton() {
  const t = useT()
  const on = usePref<string>('pm-sound') === 'on'
  const volume = Number(usePref<string>('pm-volume')) || 0
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => { setAmbientVolume(volume) }, [volume])
  useEffect(() => {
    if (!on) { stopAmbient(); return }
    const go = () => startAmbient()
    window.addEventListener('pointerdown', go, { once: true })
    window.addEventListener('keydown', go, { once: true })
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go) }
  }, [on])
  useEffect(() => () => stopAmbient(), []) // leaving the hall
  // close the panel on a tap outside it
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', away)
    return () => window.removeEventListener('pointerdown', away)
  }, [open])

  const toggle = () => { const next = !on; setPref('pm-sound', next ? 'on' : 'off'); if (next) startAmbient() }
  const muted = !on || volume === 0

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t('Music')}
        aria-expanded={open}
        className="glass grid h-9 w-9 place-items-center rounded-full border border-white/20 text-[#FAF7F2] shadow-sm hover:bg-white/20"
      >
        <span aria-hidden className={`text-base leading-none ${muted ? 'opacity-50' : ''}`}>{muted ? '🔇' : '🎵'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-[#E8DFD6] bg-[#FBF7F0] p-3 text-[#2A1E17] shadow-xl">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F3EADF] px-3 py-2.5">
            <span className="text-sm font-semibold">🎵 {t('Music')}</span>
            <button
              role="switch" aria-checked={on} onClick={toggle}
              className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-[#D9823B]' : 'bg-[#D6CCC0]'}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[1.4rem]' : 'left-0.5'}`} />
            </button>
          </div>
          <div className={`mt-2 flex items-center gap-3 rounded-xl bg-[#F3EADF] px-3 py-2.5 ${on ? '' : 'opacity-50'}`}>
            <span aria-hidden className="text-lg">{volume === 0 ? '🔈' : volume < 0.5 ? '🔉' : '🔊'}</span>
            <input
              type="range" min={0} max={1} step={0.05} value={volume} disabled={!on}
              onChange={e => setPref('pm-volume', e.target.value)}
              aria-label={t('Volume')}
              className="h-2 w-full cursor-pointer accent-[#D9823B]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
