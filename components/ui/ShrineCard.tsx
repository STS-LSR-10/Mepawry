'use client'
// components/ui/ShrineCard.tsx — Memorial Card for /memorials grid

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn, formatCount, formatYears, flagEmoji, SPECIES_LOOK } from '@/lib/utils'
import type { Pet } from '@/types'

interface ShrineCardProps {
  pet: Pet
  className?: string
}

export function ShrineCard({ pet, className }: ShrineCardProps) {
  const [translated, setTranslated] = useState(false)
  const flag = flagEmoji(pet.country_code)
  const look = SPECIES_LOOK[pet.species]
  const years = formatYears(pet.birth_year, pet.death_year)
  const epitaph = translated
    ? (pet.epitaph_translations['en'] ?? pet.epitaph)
    : pet.epitaph
  const needsTranslation = !!pet.epitaph_translations['en'] && pet.epitaph !== pet.epitaph_translations['en']

  return (
    <article
      className={cn(
        'card group flex flex-col overflow-hidden transition duration-300',
        'hover:-translate-y-1 hover:shadow-[0_24px_44px_-24px_rgba(42,30,23,.4)]',
        'focus-within:ring-2 focus-within:ring-[#D9823B]',
        className
      )}
      aria-label={`${pet.name} memorial`}
    >
      <Link href={`/${pet.slug}`} className="block flex-1 outline-none">
        {/* Portrait */}
        <div
          className="relative grid aspect-[4/3.2] place-items-center overflow-hidden text-6xl"
          style={{ background: `linear-gradient(135deg, ${look.from}, ${look.to})` }}
        >
          {pet.primary_photo_url ? (
            <Image src={pet.primary_photo_url} alt={`Photo of ${pet.name}`} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <span aria-hidden className="transition duration-500 group-hover:scale-110">{look.emoji}</span>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold backdrop-blur">{look.label}</span>
          {pet.candle_count === 0 && (
            <span className="absolute inset-x-3 bottom-3 rounded-full bg-[#17131B]/75 py-1.5 text-center text-xs text-[#FFD9A8]">
              Waiting for their first candle
            </span>
          )}
        </div>

        <div className="px-[1.15rem] pt-4">
          <h3 className="font-serif text-xl font-medium leading-tight">{pet.name}</h3>
          <div className="mt-0.5 text-[0.82rem] text-[#8E8278]">
            <span aria-label={`From ${pet.country_code}`}>{flag}</span> {years}
            {pet.birth_year && pet.death_year && <> · {pet.death_year - pet.birth_year} yrs</>}
          </div>
          {epitaph && <p className="mt-2 line-clamp-2 font-serif text-sm italic text-[#5C5046]">&ldquo;{epitaph}&rdquo;</p>}
        </div>
      </Link>

      {needsTranslation && (
        <button
          onClick={() => setTranslated(t => !t)}
          className="mx-[1.15rem] mt-1 self-start text-xs text-[#C67129] hover:underline"
          aria-label={translated ? 'Show original' : 'Translate to English'}
        >
          🌐 {translated ? 'Show original' : 'See translation'}
        </button>
      )}

      <div className="flex gap-4 px-[1.15rem] pb-4 pt-3 text-sm text-[#5C5046]">
        <span aria-label={`${pet.candle_count} candles`}>🕯️ {formatCount(pet.candle_count)}</span>
        <span aria-label={`${pet.flower_count} flowers`}>💐 {formatCount(pet.flower_count)}</span>
      </div>
    </article>
  )
}
