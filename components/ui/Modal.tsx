'use client'
// components/ui/Modal.tsx

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Callers often pass a new onClose every render; keep the latest in a ref so the effect below runs only when
  // the dialog opens or closes. (Re-running it on every keystroke stole focus from the input being typed in.)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Focus the dialog when it opens, close on Escape, give focus back when it closes
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement
    dialogRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      prev?.focus()
    }
  }, [open])

  if (!open) return null

  // Portal to <body> so a parent's stacking context (e.g. the hero) can't paint over the dialog
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full sm:max-w-[480px]',
          'bg-white rounded-t-3xl sm:rounded-3xl shadow-xl',
          'max-h-[90dvh] overflow-y-auto',
          'outline-none',
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 id="modal-title" className="text-xl font-bold text-[#2A1E17] font-serif">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-[#F4EFE6] text-[#8E8278] hover:text-[#2A1E17] transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className={cn('p-6', title && 'pt-4')}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
