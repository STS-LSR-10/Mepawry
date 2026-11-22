'use client'
// components/shrine/SlotPicker.tsx — Choose a shelf in the dome that's filling now (domes fill one at a time;
// when it's down to its last 100 shelves the next dome opens too, and you can pick either).
// Shelves are shown room by room in the order a visitor meets them, eye-level rows first.

import { useEffect, useMemo, useState } from 'react'
import { SLOTS, VIP_CAPACITY } from '@/components/3d/sanctuary/plan'
import { useAccount } from '@/lib/account'
import { VIP_PRICE_THB } from '@/components/shrine/VipUpgrade'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

export type SlotChoice = { floor: number; position: number } | null

export function SlotPicker({ value, onChange, reloadKey, vip, onVip }: {
  value: SlotChoice; onChange: (v: SlotChoice) => void; reloadKey?: number
  /** A VIP niche (0–23) on the same floor, or null. Only admins can pick one until payments open. */
  vip?: number | null; onVip?: (v: number | null, floor: number) => void
}) {
  const [data, setData] = useState<{ floor: number; openFloors?: number[]; taken: number[]; vipTaken?: number[] } | null>(null)
  const [floor, setFloor] = useState<number | null>(null)
  const admin = !!useAccount().user?.isAdmin
  const t = useT()
  const [openRoom, setOpenRoom] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/slots${floor ? `?floor=${floor}` : ''}`, { cache: 'no-store' }).then(r => r.json()).then(setData).catch(() => {})
  }, [reloadKey, floor])

  const groups = useMemo(() => {
    const taken = new Set(data?.taken ?? [])
    const byRoom = new Map<string, { i: number; free: boolean }[]>()
    SLOTS.forEach((s, i) => {
      if (!byRoom.has(s.room)) byRoom.set(s.room, [])
      byRoom.get(s.room)!.push({ i, free: !taken.has(i) })
    })
    // Listed outer gallery first, then inner, each Zone A to H (the slots themselves fill nearest the entrance first)
    const order = (room: string) => (room.startsWith('Inner') ? 1 : 0) * 100 + room.charCodeAt(room.length - 1)
    return [...byRoom].sort(([a], [b]) => order(a) - order(b)).map(([room, slots]) => ({
      room, name: room, slots, free: slots.filter(s => s.free).length,
    }))
  }, [data])

  if (!data) return <p className="text-xs text-[#8E8278]">{t('Finding free shelves…')}</p>
  const roomOf = (i: number) => groups.find(g => g.slots.some(s => s.i === i))?.name

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-[#2A1E17]">{t('Choose their shelf')}</span>
        <span className="text-xs text-[#8E8278]">{(data.openFloors?.length ?? 1) > 1 ? t('Two domes are open') : t('Dome {n} is filling now', { n: data.floor })}</span>
      </div>

      {(data.openFloors?.length ?? 1) > 1 && (
        <div role="tablist" aria-label={t('Choose their shelf')} className="grid grid-cols-2 gap-1 rounded-xl bg-[#F4EBDD] p-1">
          {data.openFloors!.map((f, i) => (
            <button key={f} type="button" role="tab" aria-selected={data.floor === f}
              onClick={() => { setFloor(f); onChange(null); onVip?.(null, f) }}
              className={cn('rounded-lg py-1.5 text-xs font-semibold', data.floor === f ? 'bg-white text-[#2A1E17] shadow-sm' : 'text-[#8E8278]')}>
              {t('Dome {n}', { n: f })} · {i === 0 ? t('almost full') : t('just opened')}
            </button>
          ))}
        </div>
      )}

      <button
        type="button" onClick={() => onChange(null)} aria-pressed={value === null}
        className={cn('w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
          value === null ? 'border-[#D9823B] bg-[#FDF0E5] text-[#2A1E17]' : 'border-[#E8DFD6] bg-white text-[#5C5046] hover:border-[#D9823B]/50')}
      >
        ✨ {t('Any free shelf')} <span className="text-xs text-[#8E8278]">— {t('we’ll find the next one near the entrance')}</span>
      </button>

      {groups.map(g => (
        <div key={g.room} className="rounded-xl border border-[#E8DFD6] bg-white">
          <button
            type="button" onClick={() => setOpenRoom(r => (r === g.room ? null : g.room))} aria-expanded={openRoom === g.room}
            className="flex w-full items-center justify-between px-3 py-2 text-sm"
          >
            <span className="font-medium text-[#2A1E17]">📚 {g.name}</span>
            <span className="text-xs text-[#8E8278]">{t('{n} free', { n: g.free })} {openRoom === g.room ? '▴' : '▾'}</span>
          </button>
          {openRoom === g.room && (
            <div className="flex max-h-48 flex-wrap gap-[3px] overflow-y-auto border-t border-[#F0E8DC] p-2">
              {g.slots.map(s => {
                const on = value?.position === s.i && value.floor === data.floor
                return (
                  <button
                    key={s.i} type="button" disabled={!s.free}
                    onClick={() => onChange({ floor: data.floor, position: s.i })}
                    title={s.free ? `${g.name} · ${t('shelf {n}', { n: s.i + 1 })}` : t('Taken')}
                    aria-label={`${g.name} ${t('shelf {n}', { n: s.i + 1 })}${s.free ? '' : `, ${t('Taken')}`}`}
                    aria-pressed={on}
                    className={cn('h-4 w-3 rounded-[3px] transition-transform',
                      on ? 'scale-125 bg-[#D9823B] ring-2 ring-[#D9823B]/40'
                        : s.free ? 'bg-[#EADFCF] hover:bg-[#D9823B]/60' : 'cursor-not-allowed bg-[#5C5046]/70')}
                  />
                )
              })}
            </div>
          )}
        </div>
      ))}

      <VipSection
        floor={data.floor} taken={new Set(data.vipTaken ?? [])} admin={admin}
        open={openRoom === 'vip'} onToggle={() => setOpenRoom(r => (r === 'vip' ? null : 'vip'))}
        value={vip ?? null} onPick={v => onVip?.(v, data.floor)}
      />

      <p className="text-xs text-[#8E8278]">
        {value ? <>{t('Chosen:')} <b>{roomOf(value.position)} · {t('shelf {n}', { n: value.position + 1 })}</b>, {t('Dome {n}', { n: value.floor })}</> : <>{t('Dark squares are taken; light ones are free.')}</>}
      </p>
    </div>
  )
}

/** The VIP pavilion's big niches in this dome: gold squares. Admins can pick one now; others see it's coming. */
function VipSection({ floor, taken, admin, open, onToggle, value, onPick }: {
  floor: number; taken: Set<number>; admin: boolean; open: boolean; onToggle: () => void
  value: number | null; onPick: (v: number | null) => void
}) {
  const free = VIP_CAPACITY - taken.size
  const t = useT()
  return (
    <div className="rounded-xl border border-[#E8C365] bg-gradient-to-b from-[#FFF8E6] to-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between px-3 py-2 text-sm">
        <span className="font-semibold text-[#8A6418]">✿ {t('VIP pavilion')} <span className="font-normal text-[#B08A3A]">· {t('big arched niche')} · ฿{VIP_PRICE_THB}</span></span>
        <span className="text-xs text-[#8E8278]">{t('{n} free', { n: free })} {open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="border-t border-[#F3E2B0] p-2">
          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: VIP_CAPACITY }, (_, i) => {
              const isFree = !taken.has(i), on = value === i
              return (
                <button
                  key={i} type="button" disabled={!isFree}
                  onClick={() => onPick(on ? null : i)}
                  aria-label={`${t('VIP niche {n}', { n: i + 1 })}${isFree ? '' : `, ${t('Taken')}`}`} aria-pressed={on}
                  title={isFree ? `${t('VIP niche {n}', { n: i + 1 })}, ${t('Dome {n}', { n: floor })}` : t('Taken')}
                  className={cn('h-7 rounded-md text-[10px] font-semibold transition',
                    on ? 'bg-[#D9A12B] text-white ring-2 ring-[#D9A12B]/40'
                      : isFree ? 'bg-[#F6E6B8] text-[#8A6418] enabled:hover:bg-[#EBCF7E] disabled:cursor-not-allowed' : 'cursor-not-allowed bg-[#5C5046]/70 text-white')}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#8A6418]">
            {admin
              ? value != null ? <>{t('Admin: they’ll be placed in VIP niche {n} as well as their shelf.', { n: value + 1 })}</> : <>{t('Admin: tap a niche to place them in the VIP pavilion too.')}</>
              : value != null ? <>{t('VIP niche {n} · ฿{p}. You’ll sign in and pay first, then their shrine is placed there.', { n: value + 1, p: VIP_PRICE_THB })}</>
              : <>{t('Tap a free niche to choose it. You’ll sign in and pay ฿{p} before their shrine is placed.', { p: VIP_PRICE_THB })}</>}
          </p>
        </div>
      )}
    </div>
  )
}
