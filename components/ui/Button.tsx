'use client'
// components/ui/Button.tsx

import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none select-none'

    const variants = {
      primary:   'bg-[#D9823B] hover:bg-[#C67129] text-white focus-visible:ring-[#D9823B] active:scale-[0.97]',
      secondary: 'bg-[#F4EFE6] hover:bg-[#EDE5D8] text-[#2A1E17] border border-[#E8DFD6] focus-visible:ring-[#D9823B] active:scale-[0.97]',
      ghost:     'bg-transparent hover:bg-[#F4EFE6] text-[#5C5046] focus-visible:ring-[#D9823B] active:scale-[0.97]',
      danger:    'bg-[#E74C3C] hover:bg-[#C0392B] text-white focus-visible:ring-[#E74C3C] active:scale-[0.97]',
    }

    const sizes = {
      sm: 'h-8 px-4 text-sm',
      md: 'h-10 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        aria-disabled={loading ? 'true' : undefined}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export { Button }
