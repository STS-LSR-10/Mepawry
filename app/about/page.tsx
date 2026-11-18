// app/about/page.tsx — S09 About Page & Internationalization

import Link from 'next/link'
import { SiteNav, SiteFooter } from '@/components/site/SiteNav'
import { getStats } from '@/lib/data'

export const metadata = {
  title: 'About Mepawry — A place that never forgets',
  description: 'Our mission to provide a lasting digital sanctuary for departed animal companions across 133+ nations.',
}

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const stats = await getStats()
  return (
    <div className="min-h-dvh bg-[#FAF7F2]">
      <SiteNav solid />

      <main className="max-w-3xl mx-auto px-4 pt-[calc(68px+3rem)] pb-16 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <span className="text-5xl inline-block float-anim">🕯️</span>
          <h1 className="font-serif text-4xl font-bold text-[#2A1E17]">
            A Place That Never Forgets
          </h1>
          <p className="text-[#5C5046] text-lg leading-relaxed max-w-xl mx-auto">
            Mepawry is an interactive, multi-sensory virtual sanctuary built to celebrate the enduring love between humans and their animal companions.
          </p>
        </section>

        {/* Mission */}
        <section className="bg-white p-8 rounded-3xl border border-[#E8DFD6] shadow-sm space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#2A1E17]">Our Mission</h2>
          <p className="text-[#5C5046] leading-relaxed">
            Grief over the loss of a pet is deep and sacred, yet all too often unacknowledged in modern society. We created Mepawry so no companion has to be forgotten. In our 3D halls, strangers from around the world cross paths, light candles for each other’s beloved friends, and hold space together.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E8DFD6] text-center">
            <div>
              <span className="block font-serif text-2xl font-bold text-[#D9823B]">{stats.total_pets.toLocaleString('en-US')}</span>
              <span className="text-xs text-[#8E8278]">Memorials Placed</span>
            </div>
            <div>
              <span className="block font-serif text-2xl font-bold text-[#D9823B]">{stats.total_candles.toLocaleString('en-US')}</span>
              <span className="text-xs text-[#8E8278]">Candles Lit</span>
            </div>
            <div>
              <span className="block font-serif text-2xl font-bold text-[#D9823B]">{stats.total_countries}</span>
              <span className="text-xs text-[#8E8278]">Countries United</span>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#2A1E17]">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: 'Is it free to place a pet memorial?',
                a: 'Yes, 100% free. Any pet owner in the world can place a memorial shrine without needing a password or subscription.',
              },
              {
                q: 'How does the Floor elevator work?',
                a: 'To guarantee smooth 3D graphics on every device, our memorial building is divided into floors of 1,000 shrines, each with a lobby, corridors and three galleries. Floor 1 fills first; stairs and an elevator take you between floors.',
              },
              {
                q: 'Can I edit my pet’s memorial later?',
                a: 'When you create a shrine, we email a secret edit key. You can also connect your Google Account anytime to manage all your companions in one unified dashboard.',
              },
              {
                q: 'Are mobile apps available?',
                a: 'Yes, Mepawry is available as a responsive Progressive Web App (PWA) and downloadable on iOS App Store and Google Play.',
              },
            ].map((faq, i) => (
              <details key={i} className="bg-white p-5 rounded-2xl border border-[#E8DFD6] group">
                <summary className="font-semibold text-[#2A1E17] cursor-pointer list-none flex justify-between items-center">
                  <span>{faq.q}</span>
                  <span className="text-[#8E8278] group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-sm text-[#5C5046] leading-relaxed border-t border-[#F4EFE6] pt-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Supported Languages */}
        <section className="bg-[#F8F4EC] p-6 rounded-2xl border border-[#E8DFD6] text-center space-y-2">
          <h3 className="font-medium text-sm text-[#2A1E17]">Available in 34 Languages</h3>
          <p className="text-xs text-[#8E8278]">
            English · ภาษาไทย · 日本語 · 繁體中文 · Español · Français · Deutsch · Português · Italiano · 한국어 · and more
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
