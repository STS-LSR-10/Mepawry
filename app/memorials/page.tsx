// app/memorials/page.tsx — S08 All Memorials Directory

import { Suspense } from 'react'
import Link from 'next/link'
import { SiteNav, SiteFooter } from '@/components/site/SiteNav'
import { ShrineCard } from '@/components/ui/ShrineCard'
import { getMemorials } from '@/lib/data'
import { T } from '@/lib/i18n'
import { k } from '@/lib/tkey'
import { MemorialSearch } from '@/components/site/MemorialSearch'

interface SearchParams {
  species?: string
  waiting?: string
  search?: string
  page?: string
}

export const metadata = {
  title: 'All Memorials — Mepawry',
  description: 'Browse and search pet memorials from around the world.',
}

export default async function MemorialsPage({
  searchParams: sp,
}: {
  searchParams: Promise<SearchParams>
}) {
  const searchParams = await sp
  const { pets, total } = await getMemorials({
    species: searchParams.species,
    waitingOnly: searchParams.waiting === 'true',
    search: searchParams.search,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  })

  return (
    <div className="min-h-dvh">
      <SiteNav solid />

      <main className="max-w-6xl mx-auto px-4 pt-[calc(68px+3rem)] pb-16">
        {/* Title */}
        <div className="mb-8">
          <span className="eyebrow"><T text="The memorials" /></span>
          <h1 className="title"><T text="Say their names." /></h1>
          <p className="text-[#5C5046]"><T text="{n} companions from every corner of the world. Open a shrine to light a candle." vars={{ n: total.toLocaleString('en-US') }} /></p>
        </div>

        {/* Filters */}
        <Suspense>
          <FilterBar searchParams={searchParams} />
        </Suspense>

        {/* Grid */}
        {pets.length === 0 ? (
          <EmptyState search={searchParams.search} />
        ) : (
          <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-5">
            {pets.map(pet => (
              <ShrineCard key={pet.id} pet={pet} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

function FilterBar({ searchParams }: { searchParams: SearchParams }) {
  const active = searchParams.species ?? 'all'
  const waiting = searchParams.waiting === 'true'

  const speciesFilters = [
    { value: 'all', emoji: '🐾', label: k('All') },
    { value: 'dog', emoji: '🐶', label: k('Dogs') },
    { value: 'cat', emoji: '🐱', label: k('Cats') },
    { value: 'other', emoji: '🌿', label: k('Others') },
  ]

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Species filters */}
      <div className="flex gap-2" role="group" aria-label="Species">
        {speciesFilters.map(f => (
          <Link
            key={f.value}
            href={`/memorials?species=${f.value}${waiting ? '&waiting=true' : ''}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ''}`}
            className="chip"
            aria-current={active === f.value ? 'true' : undefined}
          >
            {f.emoji} <T text={f.label} />
          </Link>
        ))}
      </div>

      {/* Waiting filter */}
      <Link
        href={`/memorials?${waiting ? '' : 'waiting=true'}&species=${active}`}
        className="chip"
        aria-current={waiting ? 'true' : undefined}
      >
        🕯️ <T text="Waiting for a candle" />
      </Link>

      {/* Search */}
      <MemorialSearch species={active} waiting={waiting} search={searchParams.search} />
    </div>
  )
}

function EmptyState({ search }: { search?: string }) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="text-5xl">🔍</div>
      <h2 className="font-serif text-xl italic text-[#2A1E17]">
        {search ? <T text="No one named “{name}” yet" vars={{ name: search }} /> : <T text="A quiet space, awaiting a companion’s memory" />}
      </h2>
      <p className="text-[#8E8278] text-sm"><T text="Try a different search or filter" /></p>
      <Link href="/memorials" className="text-sm text-[#C67129] hover:underline">
        <T text="Clear filters" />
      </Link>
    </div>
  )
}
