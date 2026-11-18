'use client'
// components/3d/Crowd.tsx — Other visitors in the hall, live (Supabase Realtime, one channel per floor).
//
// Cheap on the network: nobody streams positions. When you tap to walk, your route is sent once and everyone
// else plays it back at the same walking speed; a presence heartbeat every few seconds carries where you stand.
// Cheap on the device: at most MAX others are shown (a random pick when there are more, kept stable while they
// stay), and only those near you are drawn.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { LiteAvatar } from './LiteAvatar'
import { useAccount } from '@/lib/account'
import type { P } from './layout'
import { sanitizeLook, type AvatarLook } from '@/lib/look'

const SPEED = 3.2           // same walking speed as Player
const HEARTBEAT_MS = 5000
const STALE_MS = 20000      // no heartbeat for this long: treat as gone
const GRACE_MS = 30000      // left the channel: keep them a little in case they're only switching apps

export interface Me { id: string; name: string; look: AvatarLook }

interface Remote {
  id: string
  name: string
  look: AvatarLook
  pos: P                     // where they are now (simulated)
  path: P[]                  // remaining walk, if any
  heading: number
  seen: number
  goneSince?: number          // when they dropped out of the channel (still shown during the grace period)
}

/** Joins this floor's channel; returns the visitors to draw and a way to announce your own walks. */
export function useCrowd(floor: number, me: Me | null, myPos: React.RefObject<P>, max: number) {
  const { supabase, loading } = useAccount()
  const remotes = useRef(new Map<string, Remote>())
  const shown = useRef<string[]>([])
  const [version, setVersion] = useState(0)
  const [present, setPresent] = useState(0) // everyone on this floor's channel (not just those drawn)
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>('connecting')
  // Bumped to rejoin from scratch (coming back to the tab after the phone slept or the tab was in the background)
  const [attempt, setAttempt] = useState(0)
  const channel = useRef<RealtimeChannel | null>(null)
  const meRef = useRef(me)
  meRef.current = me
  // One key per open tab: the same person on a phone and a computer (or two tabs) shows up as two visitors,
  // instead of the second one being mistaken for "me" and hidden
  const tabKey = useMemo(() => (me ? `${me.id}:${Math.random().toString(36).slice(2, 8)}` : ''), [me?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const tabRef = useRef(tabKey)
  tabRef.current = tabKey

  // Keep the drawn set stable: keep whoever is still here, top up at random from the rest
  const reselect = () => {
    setPresent(remotes.current.size)
    const ids = [...remotes.current.keys()]
    const keep = shown.current.filter(id => remotes.current.has(id))
    const rest = ids.filter(id => !keep.includes(id))
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]] }
    const next = [...keep, ...rest].slice(0, max)
    if (next.length !== shown.current.length || next.some((id, i) => id !== shown.current[i])) {
      shown.current = next
      setVersion(v => v + 1)
    }
  }

  useEffect(() => {
    const sb = supabase()
    if (loading || !sb || !me) return
    let lookChanged = false
    let retry: ReturnType<typeof setTimeout> | undefined
    let disposed = false // our own cleanup also reports CLOSED; don't treat that as a drop
    const ch = sb.channel(`hall-floor-${floor}`, { config: { presence: { key: tabKey }, broadcast: { self: false } } })
    const upsert = (id: string, d: { name?: string; look?: unknown; x?: number; z?: number }) => {
      if (id === tabRef.current || typeof d.x !== 'number' || typeof d.z !== 'number') return
      const r = remotes.current.get(id)
      const look = sanitizeLook(d.look) // untrusted: only known options get through
      const name = String(d.name ?? 'Visitor').slice(0, 40)
      if (!r) remotes.current.set(id, { id, name, look, pos: { x: d.x, z: d.z }, path: [], heading: 0, seen: Date.now() })
      else {
        if (JSON.stringify(r.look) !== JSON.stringify(look)) { r.look = look; lookChanged = true }
        r.name = name; r.seen = Date.now()
        // Idle heartbeat: drift to where they say they are (if not mid-walk)
        if (!r.path.length && Math.hypot(r.pos.x - d.x, r.pos.z - d.z) > 0.3) r.path = [{ x: d.x, z: d.z }]
      }
    }
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ name: string; look: unknown; x: number; z: number }>()
      const here = new Set(Object.keys(state))
      lookChanged = false
      for (const [id, metas] of Object.entries(state)) upsert(id, metas[metas.length - 1])
      if (lookChanged) setVersion(v => v + 1)
      // Someone missing from the channel may just have switched apps or locked their phone for a moment
      // (their tab rejoins with the same key when they come back): keep them standing for a grace period.
      const now = Date.now()
      for (const [id, r] of remotes.current) {
        if (here.has(id)) r.goneSince = undefined
        else if (r.goneSince === undefined) r.goneSince = now
      }
      reselect()
    })
    ch.on('broadcast', { event: 'walk' }, ({ payload }) => {
      const id = String(payload?.id ?? '')
      const pts = Array.isArray(payload?.points) ? (payload.points as P[]).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.z)).slice(0, 60) : []
      const r = remotes.current.get(id)
      if (!r || !pts.length) return
      r.path = pts
      r.seen = Date.now()
    })
    ch.subscribe((s, err) => {
      // Shown as the dot on "here now": green live, amber connecting, red offline (supabase-js keeps retrying)
      setStatus(s === 'SUBSCRIBED' ? 'live' : s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' ? 'offline' : 'connecting')
      if (s !== 'SUBSCRIBED') {
        if (err) console.warn('[hall] live visitors:', s, err.message)
        if (!disposed && (s === 'CLOSED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT')) retry = setTimeout(() => setAttempt(a => a + 1), 4000)
        return
      }
      const p = myPos.current
      ch.track({ name: me.name, look: me.look, x: p.x, z: p.z })
    })
    channel.current = ch
    // Heartbeat: where I stand now (also covers the end of a walk), and drop anyone gone quiet
    const beat = setInterval(() => {
      const p = myPos.current, m = meRef.current
      if (m) ch.track({ name: m.name, look: m.look, x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100 })
      const now = Date.now()
      let dropped = false
      for (const [id, r] of remotes.current) {
        const gone = r.goneSince !== undefined && now - r.goneSince > GRACE_MS
        if (gone || now - r.seen > STALE_MS + GRACE_MS) { remotes.current.delete(id); dropped = true }
      }
      if (dropped) reselect()
    }, HEARTBEAT_MS)
    return () => {
      disposed = true
      clearTimeout(retry)
      clearInterval(beat)
      sb.removeChannel(ch)
      channel.current = null
      remotes.current.clear()
      shown.current = []
      setVersion(v => v + 1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, tabKey, loading, max, attempt])

  // Back on this tab: if the channel dropped while we were away, join again right away (and re-announce where we are)
  useEffect(() => {
    const back = () => {
      if (document.visibilityState !== 'visible') return
      const st = (channel.current as unknown as { state?: string } | null)?.state
      if (!channel.current || st !== 'joined') setAttempt(a => a + 1)
      else { const p = myPos.current, m = meRef.current; if (m) channel.current.track({ name: m.name, look: m.look, x: p.x, z: p.z }) }
    }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('online', back)
    return () => { document.removeEventListener('visibilitychange', back); window.removeEventListener('online', back) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Changed my look: tell everyone right away rather than at the next heartbeat
  useEffect(() => {
    const p = myPos.current
    if (me && channel.current) channel.current.track({ name: me.name, look: me.look, x: p.x, z: p.z })
  }, [me?.look]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Tell the others about a walk I just started. */
  const announce = (points: P[]) => {
    const m = meRef.current
    if (!m || !points.length) return
    channel.current?.send({ type: 'broadcast', event: 'walk', payload: { id: tabRef.current, points: points.map(p => ({ x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100 })) } })
  }

  const list = useMemo(() => shown.current.map(id => remotes.current.get(id)).filter(Boolean) as Remote[], [version]) // eslint-disable-line react-hooks/exhaustive-deps
  return { list, announce, count: present, status }
}

/** Draws the chosen visitors; each walks its received route and only renders when near you. */
export function CrowdAvatars({ list, myPos, radius }: { list: Remote[]; myPos: React.RefObject<P>; radius: number }) {
  return <>{list.map(r => <RemoteAvatar key={r.id + JSON.stringify(r.look)} r={r} myPos={myPos} radius={radius} />)}</>
}

function RemoteAvatar({ r, myPos, radius }: { r: Remote; myPos: React.RefObject<P>; radius: number }) {
  const group = useRef<Group>(null!)
  const walking = useRef(false)
  useFrame((_, dt) => {
    const h = Math.min(dt, 0.25)
    if (r.path.length) {
      const n = r.path[0], dx = n.x - r.pos.x, dz = n.z - r.pos.z, d = Math.hypot(dx, dz)
      const step = SPEED * h
      if (d <= step) { r.pos = { ...n }; r.path.shift() } else { r.pos.x += (dx / d) * step; r.pos.z += (dz / d) * step }
      if (d > 0.01) r.heading = Math.atan2(dx, dz)
    }
    walking.current = r.path.length > 0
    const g = group.current
    g.position.set(r.pos.x, -0.5, r.pos.z)
    // Turn smoothly toward where they're heading
    g.rotation.y += (((r.heading - g.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * Math.min(1, h * 10)
    const me = myPos.current
    g.visible = Math.hypot(r.pos.x - me.x, r.pos.z - me.z) < radius
  })
  return (
    <group ref={group}>
      <LiteAvatar name={r.name} look={r.look} walking={walking} />
    </group>
  )
}
