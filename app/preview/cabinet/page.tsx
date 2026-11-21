'use client'
// app/preview/cabinet/page.tsx — Look at the redesigned shrine cabinet (arched, with doors) beside the current one,
// with a sample pet, before it goes on the shrine pages. ?old=1 shows the current cabinet.

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
  const [old, setOld] = useState(false)
  useEffect(() => { setOld(new URLSearchParams(window.location.search).get('old') === '1') }, [])
  const Cabinet = old ? Current : Arched
  return (
    <main className="flex min-h-screen flex-col items-center bg-[radial-gradient(ellipse_at_top,#4A2A1A,#1E120C)] px-4 pt-10">
      <div className="mb-4 flex gap-2 text-sm">
        <button onClick={() => setOld(false)} className={`rounded-full px-4 py-1.5 ${!old ? 'bg-[#D9823B] text-white' : 'bg-white/10 text-[#FFE2C0]'}`}>New: arched</button>
        <button onClick={() => setOld(true)} className={`rounded-full px-4 py-1.5 ${old ? 'bg-[#D9823B] text-white' : 'bg-white/10 text-[#FFE2C0]'}`}>Current</button>
      </div>
      <div className="relative h-[360px] w-full max-w-[760px] sm:h-[460px]">
        <Cabinet key={String(old)} pet={SAMPLE} candlesToday={3} flowers={4} gifts={['food', 'toys', 'little', 'special']} />
      </div>
      <p className="mt-2 text-xs text-[#FFE2C0]/60">Tap a door to close or open it · drag to look around</p>
    </main>
  )
}
