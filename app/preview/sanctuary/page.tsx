'use client'
// app/preview/sanctuary/page.tsx — Concept preview of the redesigned building ("Mepawry Sanctuary"), to look at
// before it replaces the walkable hall. Orbit with mouse/finger; buttons jump between viewpoints.

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { View } from '@/components/3d/sanctuary/SanctuaryPreview'

const SanctuaryPreview = dynamic(() => import('@/components/3d/sanctuary/SanctuaryPreview'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-white/60">Building the sanctuary…</div>,
})

const VIEWS: { id: View; label: string }[] = [
  { id: 'aerial', label: '🕊️ Aerial' },
  { id: 'entrance', label: '🚪 Entrance' },
  { id: 'gallery', label: '📚 Gallery' },
  { id: 'shelf', label: '🖼️ Close-up' },
  { id: 'garden', label: '✿ VIP terrace' },
  { id: 'vip', label: '👑 Inside VIP' },
]

export default function SanctuaryPreviewPage() {
  const [view, setView] = useState<View>('aerial')
  const [ready, setReady] = useState(false)
  return (
    <main className="fixed inset-0 bg-[#C9D9E0]">
      <SanctuaryPreview view={view} onReady={() => setReady(true)} />
      {/* building thousands of glazing bars and leaves takes a moment: say so instead of showing an empty sky */}
      <div className={`pointer-events-none absolute inset-0 grid place-items-center bg-[#E9DCC2] transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}>
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#B06A2C]/25 border-t-[#B06A2C]" />
          <p className="mt-3 font-serif text-lg text-[#5A3A1E]">Building the sanctuary…</p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4">
        <div className="pointer-events-auto mx-auto w-fit rounded-2xl bg-black/45 px-4 py-2 text-center text-white backdrop-blur">
          <p className="font-serif text-lg font-semibold">Mepawry Sanctuary</p>
          <p className="text-[11px] text-white/75">Concept preview · drag to look around · pinch or scroll to zoom</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-5 flex flex-wrap justify-center gap-2 px-4">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} aria-pressed={view === v.id}
            className={`rounded-full px-4 py-2 text-sm font-semibold shadow-md backdrop-blur ${view === v.id ? 'bg-[#D9823B] text-white' : 'bg-black/45 text-white hover:bg-black/60'}`}>
            {v.label}
          </button>
        ))}
      </div>
    </main>
  )
}
