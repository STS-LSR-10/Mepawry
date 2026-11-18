'use client'
// components/shrine/CountryPicker.tsx — Flag + "Change ›" that opens a searchable list of countries,
// and the "Show this flag on the plaque" switch.

import { useMemo, useState } from 'react'
import { cn, flagEmoji } from '@/lib/utils'

// ISO 3166-1 alpha-2 codes; names come from the browser (Intl.DisplayNames)
const CODES = ('AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NZ OM PA PE PF PG PH PK PL PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS YE ZA ZM ZW').split(' ')

let names: Intl.DisplayNames | null = null
export function countryName(code: string) {
  try { names ??= new Intl.DisplayNames(['en'], { type: 'region' }); return names.of(code) ?? code } catch { return code }
}

export function CountryPicker({ value, onChange, showFlag, onShowFlag }: {
  value: string
  onChange: (code: string) => void
  showFlag: boolean
  onShowFlag: (v: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const all = CODES.map(c => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n))
    const s = q.trim().toLowerCase()
    return s ? all.filter(x => x.n.toLowerCase().includes(s) || x.c.toLowerCase() === s) : all
  }, [q])

  return (
    <div className="rounded-2xl bg-[#F4EFE6] p-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          aria-label={`Country: ${value === 'XX' ? 'not set' : countryName(value)}. Change`}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-[#E8DFD6] bg-white px-2.5 py-2 text-sm font-semibold text-[#C67129] hover:border-[#D9823B]"
        >
          <span className="text-2xl leading-none" aria-hidden>{flagEmoji(value)}</span>
          Change ›
        </button>
        <span className="min-w-0 flex-1 text-sm font-medium leading-tight text-[#2A1E17]">Show this flag on the plaque</span>
        <button
          type="button" role="switch" aria-checked={showFlag} onClick={() => onShowFlag(!showFlag)}
          aria-label="Show this flag on the plaque"
          className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', showFlag ? 'bg-[#D9823B]' : 'bg-[#D4C9BF]')}
        >
          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', showFlag ? 'left-6' : 'left-1')} />
        </button>
      </div>
      {open && (
        <div className="mt-2.5 rounded-xl border border-[#E8DFD6] bg-white">
          <label htmlFor="country-search" className="sr-only">Search countries</label>
          <input
            id="country-search" autoFocus placeholder="Search a country" value={q} onChange={e => setQ(e.target.value)}
            className="w-full rounded-t-xl border-b border-[#F0E8DC] px-3 py-2 text-sm text-[#2A1E17] focus:outline-none"
          />
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox" aria-label="Countries">
            {list.map(x => (
              <li key={x.c}>
                <button
                  type="button" role="option" aria-selected={x.c === value}
                  onClick={() => { onChange(x.c); setOpen(false); setQ('') }}
                  className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#FDF0E5]', x.c === value && 'bg-[#FDF0E5] font-semibold')}
                >
                  <span aria-hidden>{flagEmoji(x.c)}</span>{x.n}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
