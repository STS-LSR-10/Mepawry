'use client'
// components/shrine/FloorSelector.tsx — S07 Floor Elevator UI

import { Modal } from '@/components/ui/Modal'
import { cn, getFloorName, formatCount } from '@/lib/utils'
import type { Floor } from '@/types'

interface FloorSelectorProps {
  open: boolean
  onClose: () => void
  floors: Floor[]
  currentFloorId: number
  onSelectFloor: (floorId: number) => void
}

export function FloorSelector({ open, onClose, floors, currentFloorId, onSelectFloor }: FloorSelectorProps) {
  const totalPets = floors.reduce((s, f) => s + f.current_count, 0)

  return (
    <Modal open={open} onClose={onClose} title="🛗 Which floor?">
      <p className="text-center text-sm text-[#8E8278] -mt-2 mb-4">
        {formatCount(totalPets)} friends · {floors.length}F
      </p>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
        role="list"
      >
        {floors.map(floor => {
          const isActive = floor.id === currentFloorId
          const isFull = floor.current_count >= floor.capacity

          return (
            <button
              key={floor.id}
              role="listitem"
              onClick={() => { onSelectFloor(floor.id); onClose() }}
              className={cn(
                'rounded-2xl p-3 text-left transition-all duration-150 border',
                isActive
                  ? 'bg-[#D9823B] border-[#D9823B] text-white scale-[1.03] shadow-md'
                  : 'bg-[#F8F4EC] border-[#E8DFD6] text-[#2A1E17] hover:border-[#D9823B] hover:shadow-sm active:scale-[0.97]'
              )}
              aria-label={`Floor ${floor.id}: ${getFloorName(floor.id)}, ${isFull ? 'full' : `${floor.current_count} pets`}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="font-serif font-bold text-lg leading-none">
                {floor.id}F
              </div>
              <div className={cn('text-xs mt-0.5', isActive ? 'text-white/80' : 'text-[#8E8278]')}>
                {getFloorName(floor.id)}
              </div>
              <div className={cn('text-xs mt-1 flex items-center gap-1', isActive ? 'text-white/80' : 'text-[#8E8278]')}>
                <span aria-hidden>🐾</span>
                {isFull ? 'Full' : formatCount(floor.current_count)}
              </div>
            </button>
          )
        })}

      </div>
    </Modal>
  )
}
