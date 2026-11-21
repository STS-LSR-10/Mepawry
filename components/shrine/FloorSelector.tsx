'use client'
// components/shrine/FloorSelector.tsx — Pick which dome (sanctuary) to visit. The first `openCount` are open; one more
// after them may be passed in and shows greyed out as the next to open.

import { Modal } from '@/components/ui/Modal'
import { cn, getFloorName, formatCount } from '@/lib/utils'
import type { Floor } from '@/types'
import { OPEN_NEXT_AT_FREE } from '@/components/3d/sanctuary/plan'

interface FloorSelectorProps {
  open: boolean
  onClose: () => void
  floors: Floor[]
  openCount: number
  currentFloorId: number
  onSelectFloor: (floorId: number) => void
}

export function FloorSelector({ open, onClose, floors, openCount, currentFloorId, onSelectFloor }: FloorSelectorProps) {
  const totalPets = floors.reduce((s, f) => s + f.current_count, 0)

  return (
    <Modal open={open} onClose={onClose} title="🏛️ Which dome?">
      <p className="text-center text-sm text-[#8E8278] -mt-2 mb-4">
        {formatCount(totalPets)} {totalPets === 1 ? 'pet' : 'pets'} · {openCount} {openCount === 1 ? 'dome' : 'domes'}
      </p>

      <div
        className="flex flex-wrap justify-center gap-1.5"
        role="list"
      >
        {floors.map(floor => {
          const isActive = floor.id === currentFloorId
          const isFull = floor.current_count >= floor.capacity
          if (floor.id > openCount) return (
            <div key={floor.id} role="listitem" aria-disabled="true"
              className="cursor-not-allowed rounded-xl border border-dashed border-[#E8DFD6] bg-[#F8F4EC]/60 px-2.5 py-1.5 text-left text-[#2A1E17] opacity-50"
              aria-label={`Dome ${floor.id}: not open yet`}>
              <div className="font-serif font-bold text-sm leading-none">Dome {floor.id}</div>
              <div className="text-[11px] mt-0.5 leading-tight text-[#8E8278]">{getFloorName(floor.id)}</div>
              <div className="text-[11px] mt-0.5 flex items-center gap-1 leading-tight text-[#8E8278]"><span aria-hidden>🔒</span>Opens soon</div>
            </div>
          )

          return (
            <button
              key={floor.id}
              role="listitem"
              onClick={() => { onSelectFloor(floor.id); onClose() }}
              className={cn(
                'rounded-xl px-2.5 py-1.5 text-left transition-all duration-150 border',
                isActive
                  ? 'bg-[#D9823B] border-[#D9823B] text-white shadow-md'
                  : 'bg-[#F8F4EC] border-[#E8DFD6] text-[#2A1E17] hover:border-[#D9823B] hover:shadow-sm active:scale-[0.97]'
              )}
              aria-label={`Dome ${floor.id}: ${getFloorName(floor.id)}, ${isFull ? 'full' : `${floor.current_count} pets`}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="font-serif font-bold text-sm leading-none">
                Dome {floor.id}
              </div>
              <div className={cn('text-[11px] mt-0.5 leading-tight', isActive ? 'text-white/80' : 'text-[#8E8278]')}>
                {getFloorName(floor.id)}
              </div>
              <div className={cn('text-[11px] mt-0.5 flex items-center gap-1 leading-tight', isActive ? 'text-white/80' : 'text-[#8E8278]')}>
                <span aria-hidden>🐾</span>
                {isFull ? 'Full' : formatCount(floor.current_count)}
              </div>
            </button>
          )
        })}

      </div>
      {floors.length > openCount && (
        <p className="mt-3 text-center text-xs text-[#8E8278]">
          Dome {openCount + 1} opens when Dome {openCount} has fewer than {OPEN_NEXT_AT_FREE} shelves left.
        </p>
      )}
    </Modal>
  )
}
