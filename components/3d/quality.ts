'use client'
// components/3d/quality.ts — Pick a graphics budget the device can hold, and survive the browser dropping WebGL.
// Phones (above all iOS Safari and the LINE/Facebook/Instagram in-app browsers) reload the page when graphics
// memory runs out, so on those we draw less: no real-time shadows, fewer lights, lower resolution.

import { useCallback, useEffect, useState } from 'react'
import type { RootState } from '@react-three/fiber'

export type Quality = 'low' | 'high'

/** ?quality=low|high forces a level (handy for testing on a desktop). */
export function detectQuality(): Quality {
  try {
    const forced = new URLSearchParams(window.location.search).get('quality')
    if (forced === 'low' || forced === 'high') return forced
    const ua = navigator.userAgent
    const phone = /iPhone|iPad|iPod|Android|Mobile|Line\/|FBAN|FBAV|Instagram/i.test(ua)
    const nav = navigator as Navigator & { deviceMemory?: number }
    const weak = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4
    return phone || weak ? 'low' : 'high'
  } catch {
    return 'low'
  }
}

export function useQuality(): Quality {
  const [q, setQ] = useState<Quality>('low') // start cheap; upgrade once we know the device
  useEffect(() => setQ(detectQuality()), [])
  return q
}

/**
 * If the browser takes WebGL away (memory pressure, tab in background), rebuild the canvas
 * instead of leaving a blank page. Returns a key to put on <Canvas>, its onCreated, and whether we're recovering.
 */
export function useContextLossRecovery() {
  const [key, setKey] = useState(0)
  const [lost, setLost] = useState(false)
  const onCreated = useCallback(({ gl }: RootState) => {
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault() // tells the browser we'll handle it, so it may give the context back
      setLost(true)
      setTimeout(() => { setKey(k => k + 1); setLost(false) }, 600)
    }, { once: true })
  }, [])
  return { key, onCreated, lost }
}
