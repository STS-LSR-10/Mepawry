// app/memorials/page.tsx — S08 All Memorials Directory

import { Suspense } from 'react'
import Link from 'next/link'
import { SiteNav, SiteFooter } from '@/components/site/SiteNav'
import { ShrineCard } from '@/components/ui/ShrineCard'
import { getMemorials } from '@/lib/data'

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
          <span className="eyebrow">The memorials</span>
          <h1 className="title">Say their names.</h1>
          <p className="text-[#5C5046]">{total.toLocaleString()} companions from every corner of the world. Open a shrine to light a candle.</p>
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
    { value: 'all', emoji: '🐾', label: 'All' },
    { value: 'dog', emoji: '🐶', label: 'Dogs' },
    { value: 'cat', emoji: '🐱', label: 'Cats' },
    { value: 'other', emoji: '🌿', label: 'Others' },
  ]

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Species filters */}
      <div className="flex gap-2" role="group" aria-label="Filter by species">
        {speciesFilters.map(f => (
          <Link
            key={f.value}
            href={`/memorials?species=${f.value}${waiting ? '&waiting=true' : ''}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ''}`}
            className="chip"
            aria-current={active === f.value ? 'true' : undefined}
          >
            {f.emoji} {f.label}
          </Link>
        ))}
      </div>

      {/* Waiting filter */}
      <Link
        href={`/memorials?${waiting ? '' : 'waiting=true'}&species=${active}`}
        className="chip"
        aria-current={waiting ? 'true' : undefined}
      >
        🕯️ Waiting for a candle
      </Link>

      {/* Search */}
      <form action="/memorials" method="get" className="ml-auto">
        <input type="hidden" name="species" value={active} />
        {waiting && <input type="hidden" name="waiting" value="true" />}
        <input
          type="search"
          name="search"
          defaultValue={searchParams.search}
          placeholder="Search by name…"
          className="field w-56 rounded-full py-2 text-sm"
          aria-label="Search pet memorials"
        />
      </form>
    </div>
  )
}

function EmptyState({ search }: { search?: string }) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="text-5xl">🔍</div>
      <h2 className="font-serif text-xl italic text-[#2A1E17]">
        {search ? `No one named "${search}" yet` : "A quiet space, awaiting a companion's memory"}
      </h2>
      <p className="text-[#8E8278] text-sm">Try a different search or filter</p>
      <Link href="/memorials" className="text-sm text-[#C67129] hover:underline">
        Clear filters
      </Link>
    </div>
  )
}
