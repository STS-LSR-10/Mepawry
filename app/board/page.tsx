// app/board/page.tsx — The community board as its own page (stories, today, kind words)

import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/SiteNav'
import { Board } from '@/components/board/Board'

export const metadata: Metadata = {
  title: 'Community Board — Mepawry',
  description: 'Stories, photos and kind words shared by families remembering their pets.',
}

export default function BoardPage() {
  return (
    <main className="min-h-dvh bg-[#2A1E17] pt-[68px]">
      <SiteNav solid />
      <div className="mx-auto h-[calc(100dvh-68px)] max-w-2xl sm:py-4">
        <div className="h-full overflow-hidden sm:rounded-3xl">
          <Board />
        </div>
      </div>
    </main>
  )
}
