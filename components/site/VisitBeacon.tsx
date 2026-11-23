'use client'
// components/site/VisitBeacon.tsx — Tells the server "this browser visited today", once a day (for the admin page's
// visitor counts). Uses the same random id as the hall; nothing personal is sent.

import { useEffect } from 'react'
import { getVisitor } from '@/lib/visitor'

export function VisitBeacon() {
  useEffect(() => {
    const day = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10) // Bangkok day, as the server counts it
    try { if (localStorage.getItem('pm-visit-day') === day) return } catch { /* private mode: check in anyway */ }
    fetch('/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: getVisitor().id }) })
      .then(r => { if (r.ok) try { localStorage.setItem('pm-visit-day', day) } catch {} })
      .catch(() => {})
  }, [])
  return null
}
