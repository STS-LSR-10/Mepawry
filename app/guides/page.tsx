// app/guides/page.tsx — S10 Guides & Pet Loss Support Hub

import { SiteNav, SiteFooter } from '@/components/site/SiteNav'
import { ARTICLES } from '@/lib/articles'
import { T } from '@/lib/i18n'

export const metadata = {
  title: 'Pet Loss Guides & Support — Mepawry',
  description: 'Compassionate articles and guidance for coping with the grief of losing an animal companion.',
}


export default function GuidesPage() {
  return (
    <div className="min-h-dvh bg-[#FAF7F2]">
      <SiteNav solid />

      <main className="max-w-4xl mx-auto px-4 pt-[calc(68px+3rem)] pb-16">
        <div className="mb-10 text-center space-y-2">
          <span className="text-4xl">📖</span>
          <h1 className="font-serif text-3xl font-bold text-[#2A1E17]">
            <T text="Guides & Compassionate Support" />
          </h1>
          <p className="text-[#8E8278] text-sm max-w-md mx-auto">
            <T text="Thoughtful articles written to comfort, guide, and walk beside you through every stage of pet bereavement." />
          </p>
        </div>

        {/* Article Cards Grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {ARTICLES.map(art => (
            <article
              key={art.slug}
              className="bg-white p-6 rounded-3xl border border-[#E8DFD6] shadow-sm hover:shadow-md hover:border-[#D9823B]/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-[#D9823B] bg-[#FDF0E5] px-2.5 py-1 rounded-full inline-block">
                  <T text={art.category} />
                </span>
                <h2 className="font-serif text-lg font-bold text-[#2A1E17] leading-snug">
                  <T text={art.title} />
                </h2>
                <p className="text-xs text-[#5C5046] leading-relaxed">
                  <T text={art.excerpt} />
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#F4EFE6] flex items-center justify-between text-xs text-[#8E8278]">
                <span><T text="{n} min read" vars={{ n: art.mins }} /></span>
                <span className="text-[#C67129] font-medium"><T text="Read article" /> →</span>
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
