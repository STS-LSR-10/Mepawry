// app/[slug]/page.tsx — S04 Individual Pet Shrine View

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { T } from '@/lib/i18n'
import { getCandlesToday, getNeighbours, getPetBySlug, recordVisit } from '@/lib/data'
import { formatYears, formatCount, calculateAge, flagEmoji, getFloorName, SPECIES_LOOK } from '@/lib/utils'
import { SiteNav } from '@/components/site/SiteNav'
import { Starfield } from '@/components/site/LandingFx'
import { ShrineActions } from '@/components/shrine/ShrineActions'
import { ShrineClientSection } from './ShrineClientSection'
import { ChangePhotoButton } from './ChangePhotoButton'
import { NameInLatin, Translatable } from '@/components/ui/Translatable'

interface ShrinePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ShrinePageProps) {
  const pet = await getPetBySlug((await params).slug)
  if (!pet) return {}
  return {
    title: `${pet.name}'s Memorial — Mepawry`,
    description: pet.epitaph ?? `A memorial for ${pet.name}, loved and remembered.`,
    alternates: { canonical: `/${pet.slug}` },
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
  const days = Math.max(1, Math.ceil((Date.now() - Date.parse(pet.created_at)) / 86_400_000)) // counting the first day
  const look = SPECIES_LOOK[pet.species]
  await recordVisit(pet.id)
  // Neighbouring shrines for the ‹ › arrows
  const { prev, next } = await getNeighbours(pet)

  return (
    <div
      className="relative min-h-dvh overflow-hidden text-[#FAF7F2]"
      style={{ background: 'radial-gradient(70% 60% at 50% 45%, #0E1020 0%, #05060C 55%, #000 100%)' }}
    >
      <Starfield />
      <SiteNav />

      {prev && next && [['‹', prev, 'left-0 rounded-r-xl', 'Previous'], ['›', next, 'right-0 rounded-l-xl', 'Next']].map(([icon, p, pos, label]) => (
        <Link
          key={label as string}
          href={`/${(p as typeof pet).slug}`}
          aria-label={`${label}: ${(p as typeof pet).name}`}
          className={`fixed top-1/2 z-20 grid h-14 w-8 -translate-y-1/2 place-items-center border border-white/15 bg-black/30 text-xl text-[#FAF7F2]/80 backdrop-blur transition hover:bg-black/50 ${pos}`}
        >
          {icon as string}
        </Link>
      ))}

      <main className="relative z-[2] flex min-h-dvh flex-col items-center px-4 pb-40 pt-24 text-center">
        <Link href="/hall" className="mb-4 self-start text-sm text-[#FAF7F2]/60 transition hover:text-[#FAF7F2] sm:ml-6">
          ‹ <T text="Back to the hall" />
        </Link>

        <ShrineActions pet={pet} />
        <h1 className="font-serif text-4xl font-medium sm:text-5xl">{pet.name}</h1>
        <NameInLatin name={pet.name} latin={pet.name_latin} className="mt-1 font-serif text-lg italic text-[#FAF7F2]/70" />
        <p className="mt-2 text-sm text-[#FAF7F2]/70">
          {flag} {years}{age ? <> · <T text="{n} yrs" vars={{ n: age }} /></> : null} · <T text={look.label} />
        </p>

        <p className="mt-2 text-sm text-[#FFE2C0]">
          🐾 <T text="{n} visits" vars={{ n: formatCount(pet.visit_count) }} /> · 🌙 <T text={days === 1 ? 'Their first day in the hall' : 'In the hall for {n} days'} vars={{ n: formatCount(days) }} />
        </p>

        {pet.epitaph && (
          <div className="mx-auto mt-3 max-w-[40ch]">
            <Translatable text={pet.epitaph} quote light className="font-serif text-lg italic text-[#FAF7F2]/85" />
          </div>
        )}

        <ShrineClientSection pet={pet} candlesToday={await getCandlesToday(pet.id)} />
        <ChangePhotoButton petId={pet.id} hasPhoto={!!pet.primary_photo_url} />

        <p className="mt-6 text-xs text-[#FAF7F2]/45">
          <T text="Dome {n}" vars={{ n: pet.floor_id }} /> · {getFloorName(pet.floor_id)}
        </p>
      </main>
    </div>
  )
}
