'use client'
// components/shrine/SlotPicker.tsx — Choose a shelf on the floor that's filling now (floors fill one at a time).
// Shelves are shown room by room in the order a visitor meets them, eye-level rows first.

import { useEffect, useMemo, useState } from 'react'
import { ROOMS, SLOTS } from '@/components/3d/layout'
import { cn } from '@/lib/utils'

export type SlotChoice = { floor: number; position: number } | null

export function SlotPicker({ value, onChange, reloadKey }: { value: SlotChoice; onChange: (v: SlotChoice) => void; reloadKey?: number }) {
  const [data, setData] = useState<{ floor: number; taken: number[] } | null>(null)
  const [openRoom, setOpenRoom] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/slots', { cache: 'no-store' }).then(r => r.json()).then(setData).catch(() => {})
  }, [reloadKey])

  const groups = useMemo(() => {
    const taken = new Set(data?.taken ?? [])
    const byRoom = new Map<string, { i: number; free: boolean }[]>()
    SLOTS.forEach((s, i) => {
      if (!byRoom.has(s.room)) byRoom.set(s.room, [])
      byRoom.get(s.room)!.push({ i, free: !taken.has(i) })
    })
    return [...byRoom].map(([room, slots]) => ({
      room, name: ROOMS.find(r => r.id === room)?.name ?? room, slots, free: slots.filter(s => s.free).length,
    }))
  }, [data])

  if (!data) return <p className="text-xs text-[#8E8278]">Finding free shelves…</p>
  const roomOf = (i: number) => groups.find(g => g.slots.some(s => s.i === i))?.name

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-[#2A1E17]">Choose their shelf</span>
        <span className="text-xs text-[#8E8278]">Floor {data.floor} is filling now</span>
      </div>

      <button
        type="button" onClick={() => onChange(null)} aria-pressed={value === null}
        className={cn('w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
          value === null ? 'border-[#D9823B] bg-[#FDF0E5] text-[#2A1E17]' : 'border-[#E8DFD6] bg-white text-[#5C5046] hover:border-[#D9823B]/50')}
      >
        ✨ Any free shelf <span className="text-xs text-[#8E8278]">— we’ll find the next one near the entrance</span>
      </button>

      {groups.map(g => (
        <div key={g.room} className="rounded-xl border border-[#E8DFD6] bg-white">
          <button
            type="button" onClick={() => setOpenRoom(r => (r === g.room ? null : g.room))} aria-expanded={openRoom === g.room}
            className="flex w-full items-center justify-between px-3 py-2 text-sm"
          >
            <span className="font-medium text-[#2A1E17]">📚 {g.name}</span>
            <span className="text-xs text-[#8E8278]">{g.free} free {openRoom === g.room ? '▴' : '▾'}</span>
          </button>
          {openRoom === g.room && (
            <div className="flex max-h-48 flex-wrap gap-[3px] overflow-y-auto border-t border-[#F0E8DC] p-2">
              {g.slots.map(s => {
                const on = value?.position === s.i && value.floor === data.floor
                return (
                  <button
                    key={s.i} type="button" disabled={!s.free}
                    onClick={() => onChange({ floor: data.floor, position: s.i })}
                    title={s.free ? `${g.name} · shelf ${s.i + 1}` : 'Taken'}
                    aria-label={`${g.name} shelf ${s.i + 1}${s.free ? '' : ', taken'}`}
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

      <p className="text-xs text-[#8E8278]">
        {value ? <>Chosen: <b>{roomOf(value.position)} · shelf {value.position + 1}</b>, floor {value.floor}</> : <>Dark squares are taken; light ones are free.</>}
      </p>
    </div>
  )
}
