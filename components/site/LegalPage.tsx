// components/site/LegalPage.tsx — The plain reading layout of the privacy policy and the terms.

import { SiteNav, SiteFooter } from '@/components/site/SiteNav'
import { NotEnglish, T } from '@/lib/i18n'

/** The plain reading layout shared by the privacy policy and the terms. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#FAF7F2]">
      <SiteNav solid />
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-[calc(68px+2.5rem)]">
        <h1 className="font-serif text-4xl font-bold text-[#2A1E17]"><T text={title} /></h1>
        <p className="mt-2 text-sm text-[#8E8278]"><T text="Last updated {date}" vars={{ date: updated }} /></p>
        <NotEnglish><p className="mt-3 rounded-xl bg-[#F4EBDD] px-4 py-3 text-sm text-[#5C5046]"><T text="This page is written in English, and the English text is the one that applies." /></p></NotEnglish>
        <div className="mt-8 space-y-4 leading-relaxed text-[#5C5046] [&_a]:text-[#C67129] [&_a]:underline [&_h2]:pt-4 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#2A1E17] [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
