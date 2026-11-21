'use client'
// app/preview/backdrops/page.tsx — Every shrine backdrop side by side, with when it's on offer, to check the paintings.

import { useEffect, useState } from 'react'
import { BACKDROPS } from '@/lib/decor'
import { backdropThumb } from '@/components/3d/backdrops'

export default function BackdropsPreviewPage() {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  useEffect(() => setThumbs(Object.fromEntries(BACKDROPS.map(b => [b.id, backdropThumb(b.id)]))), [])
  return (
    <main className="grid grid-cols-2 gap-3 bg-[#1E120C] p-4 sm:grid-cols-4 lg:grid-cols-6">
      {BACKDROPS.map(b => (
        <figure key={b.id} className="overflow-hidden rounded-xl bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {thumbs[b.id] && <img src={thumbs[b.id]} alt="" className="aspect-[5/4] w-full" />}
          <figcaption className="px-2 py-1 text-xs text-[#FFE2C0]">{b.name} <span className="opacity-60">· {b.group}</span></figcaption>
        </figure>
      ))}
    </main>
  )
}
