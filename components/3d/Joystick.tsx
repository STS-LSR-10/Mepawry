'use client'
// components/3d/Joystick.tsx — An on-screen stick for walking (bottom left). Push the knob: up walks the way the camera
// faces, sideways strafes. Writes {x, y} in -1…1 (screen axes, y down) into a shared ref the avatar reads every frame.

import { useRef, useState } from 'react'

export type Stick = { x: number; y: number }

const R = 44 // how far the knob travels (px)

export function Joystick({ stick }: { stick: React.RefObject<Stick> }) {
  const pad = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const active = useRef<number | null>(null)

  const move = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId || !pad.current) return
    const b = pad.current.getBoundingClientRect()
    let x = e.clientX - (b.left + b.width / 2), y = e.clientY - (b.top + b.height / 2)
    const d = Math.hypot(x, y)
    if (d > R) { x *= R / d; y *= R / d }
    setKnob({ x, y })
    stick.current.x = x / R; stick.current.y = y / R
  }
  const end = (e: { pointerId: number }) => {
    if (active.current !== e.pointerId) return
    active.current = null
    setKnob({ x: 0, y: 0 })
    stick.current.x = 0; stick.current.y = 0
  }

  return (
    <div
      ref={pad}
      role="application"
      aria-label="Walking stick: drag to walk"
      className="glass fixed bottom-20 left-4 z-20 h-32 w-32 touch-none select-none rounded-full border border-white/20 shadow-md"
      onPointerDown={e => {
        active.current = e.pointerId
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
        // Let go anywhere (even if the capture was lost) and the stick springs back
        const up = (ev: PointerEvent) => { if (ev.pointerId !== e.pointerId) return; end(ev); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
        window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
        move(e)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      {/* direction marks */}
      {['top-1.5 left-1/2 -translate-x-1/2', 'bottom-1.5 left-1/2 -translate-x-1/2 rotate-180', 'left-1.5 top-1/2 -translate-y-1/2 -rotate-90', 'right-1.5 top-1/2 -translate-y-1/2 rotate-90'].map(c => (
        <span key={c} aria-hidden className={`absolute ${c} text-[10px] leading-none text-white/60`}>▲</span>
      ))}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-white/40 bg-white/30 shadow-lg backdrop-blur-sm"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, transition: active.current == null ? 'transform 150ms ease-out' : 'none' }}
      />
    </div>
  )
}
