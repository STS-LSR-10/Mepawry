'use client'
// app/preview/cabinet/page.tsx — Look at the redesigned shrine cabinet (arched, with doors) beside the current one,
// and its VIP version, with a sample pet. ?vip=1 starts on the VIP one, ?old=1 on the old walnut box,
// ?frame=<id> tries a frame from lib/decor.ts.

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Pet } from '@/types'

const Arched = dynamic(() => import('@/components/3d/ShrineCabinetArched'), { ssr: false })
const Current = dynamic(() => import('@/components/3d/ShrineCabinet'), { ssr: false })

const SAMPLE: Pet = {
  id: 'preview', slug: 'preview', name: 'Mochi', species: 'dog', country_code: 'TH', primary_photo_url: null, gallery_urls: [],
  birth_year: 2012, death_year: 2025, epitaph: null, epitaph_translations: {}, floor_id: 1, shrine_position: 0,
  candle_count: 3, flower_count: 4, visit_count: 0, created_at: '', updated_at: '',
}

export default function CabinetPreviewPage() {
  const [mode, setMode] = useState<'new' | 'vip' | 'old'>('new')
  const [frame, setFrame] = useState<string | null>(null)
  useEffect(() => { const q = new URLSearchParams(window.location.search); setFrame(q.get('frame')); setMode(q.get('old') === '1' ? 'old' : q.get('vip') === '1' ? 'vip' : 'new') }, [])
  const old = mode === 'old'
  const Cabinet = old ? Current : Arched
  return (
    <main className="flex min-h-screen flex-col items-center bg-[radial-gradient(ellipse_at_top,#4A2A1A,#1E120C)] px-4 pt-10">
      <div className="mb-4 flex gap-2 text-sm">
        {([['new', 'Arched'], ['vip', '👑 VIP'], ['old', 'Old']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)} className={`rounded-full px-4 py-1.5 ${mode === k ? 'bg-[#D9823B] text-white' : 'bg-white/10 text-[#FFE2C0]'}`}>{label}</button>
        ))}
      </div>
      <div className={`relative w-full max-w-[760px] ${mode === 'vip' ? 'h-[460px] sm:h-[600px]' : 'h-[360px] sm:h-[460px]'}`}>
        <Cabinet key={mode + frame} pet={{ ...SAMPLE, frame_style: frame, ...(mode === 'vip' ? { vip_position: 0 } : {}) }} candlesToday={3} flowers={4} gifts={mode === 'vip' ? ['food', 'toys', 'little', 'special', 'food', 'little', 'toys', 'special', 'little', 'food', 'toys', 'little'] : ['sweetfish', 'toys', 'little', 'special']} />
      </div>
      <p className="mt-2 text-xs text-[#FFE2C0]/60">Tap a door to close or open it · drag to look around</p>
    </main>
  )
}
