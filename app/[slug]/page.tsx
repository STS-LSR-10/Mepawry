// app/[slug]/page.tsx — S04 Individual Pet Shrine View

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { T } from '@/lib/i18n'
import { getCandlesToday, getNeighbours, getPetBySlug, recordVisit } from '@/lib/data'
import { formatYears, formatCount, calculateAge, flagEmoji, getFloorName, SPECIES_LOOK } from '@/lib/utils'
import { SiteNav } from '@/components/site/SiteNav'
import { Starfield } from '@/components/site/LandingFx'
import { ShrineClientSection } from './ShrineClientSection'
import { ChangePhotoButton } from './ChangePhotoButton'

interface ShrinePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ShrinePageProps) {
  const pet = await getPetBySlug((await params).slug)
  if (!pet) return {}
  return {
    title: `${pet.name}'s Memorial — Mepawry`,
    description: pet.epitaph ?? `A memorial for ${pet.name}, loved and remembered.`,
    openGraph: {
      title: `${pet.name}'s Memorial`,
      description: pet.epitaph ?? '',
      images: pet.primary_photo_url ? [pet.primary_photo_url] : [],
    },
  }
}

export default async function ShrinePage({ params }: ShrinePageProps) {
  const pet = await getPetBySlug((await params).slug)
  if (!pet) notFound()

  const flag = pet.show_flag === false ? '' : flagEmoji(pet.country_code)
  const years = formatYears(pet.birth_year, pet.death_year)
  const age = calculateAge(pet.birth_year, pet.death_year)
  const look = SPECIES_LOOK[pet.species]
  await recordVisit(pet.id)
  // Neighbouring shrines for the ‹ › arrows
  const { prev, next } = await getNeighbours(pet)

  return (
    <div
      className="relative min-h-dvh overflow-hidden text-[#FAF7F2]"
      style={{ background: 'radial-gradient(60% 55% at 50% 52%, #6E3A1A 0%, #3A1D0E 45%, #160B06 100%)' }}
    >
      <Starfield />
      <SiteNav />

      {prev && next && [['‹', prev, 'left-0 rounded-r-xl', 'Previous'], ['›', next, 'right-0 rounded-l-xl', 'Next']].map(([icon, p, pos, label]) => (
        <Link
          key={label as string}
          href={`/${(p as typeof pet).slug}`}
          aria-label={`${label} shrine: ${(p as typeof pet).name}`}
          className={`fixed top-1/2 z-20 grid h-14 w-8 -translate-y-1/2 place-items-center border border-white/15 bg-black/30 text-xl text-[#FAF7F2]/80 backdrop-blur transition hover:bg-black/50 ${pos}`}
        >
          {icon as string}
        </Link>
      ))}

      <main className="relative z-[2] flex min-h-dvh flex-col items-center px-4 pb-40 pt-24 text-center">
        <Link href="/hall" className="mb-4 self-start text-sm text-[#FAF7F2]/60 transition hover:text-[#FAF7F2] sm:ml-6">
          ‹ <T text="Back to the hall" />
        </Link>

        <h1 className="font-serif text-4xl font-medium sm:text-5xl">{pet.name}</h1>
        <p className="mt-2 text-sm text-[#FAF7F2]/70">
          {flag} {years}{age ? ` · ${age} years` : ''} · {look.label}
        </p>

        {pet.epitaph && (
          <p className="mx-auto mt-3 max-w-[40ch] font-serif text-lg italic text-[#FAF7F2]/85">&ldquo;{pet.epitaph}&rdquo;</p>
        )}

        <ShrineClientSection pet={pet} candlesToday={await getCandlesToday(pet.id)} />
        <ChangePhotoButton petId={pet.id} hasPhoto={!!pet.primary_photo_url} />

        <p className="mt-6 text-xs text-[#FAF7F2]/45">
          Floor {pet.floor_id} · {getFloorName(pet.floor_id)} · 🐾 {formatCount(pet.visit_count)} visits
        </p>
      </main>
    </div>
  )
}
