'use client'
// components/ui/SpeciesBadge.tsx

import { cn } from '@/lib/utils'
import type { Species } from '@/types'

interface SpeciesBadgeProps {
  species: Species | string
  size?: 'sm' | 'md'
  className?: string
}

const SPECIES_CONFIG = {
  dog:   { label: 'Dog',   emoji: '🐶', bg: 'bg-[#EBF5FB]', text: 'text-[#2471A3]' },
  cat:   { label: 'Cat',   emoji: '🐱', bg: 'bg-[#FEF9E7]', text: 'text-[#9A7D0A]' },
  other: { label: 'Other', emoji: '🐾', bg: 'bg-[#E8F8F5]', text: 'text-[#1E8449]' },
} as const

export function SpeciesBadge({ species, size = 'md', className }: SpeciesBadgeProps) {
  const config = SPECIES_CONFIG[species as keyof typeof SPECIES_CONFIG] ?? SPECIES_CONFIG.other

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.bg, config.text,
        size === 'sm' ? 'text-xs py-0.5 px-2' : 'text-sm py-1 px-3',
        className
      )}
      aria-label={`Species: ${config.label}`}
    >
      <span aria-hidden="true">{config.emoji}</span>
      {config.label}
    </span>
  )
}
