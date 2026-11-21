'use client'
// components/site/MemorialSearch.tsx — The name search on /memorials (its placeholder in the visitor's language).

import { useT } from '@/lib/i18n'

export function MemorialSearch({ species, waiting, search }: { species: string; waiting: boolean; search?: string }) {
  const t = useT()
  return (
    <form action="/memorials" method="get" className="ml-auto">
      <input type="hidden" name="species" value={species} />
      {waiting && <input type="hidden" name="waiting" value="true" />}
      <input
        type="search" name="search" defaultValue={search} placeholder={t('Search by name…')}
        className="field w-56 rounded-full py-2 text-sm" aria-label={t('Search by name…')}
      />
    </form>
  )
}
