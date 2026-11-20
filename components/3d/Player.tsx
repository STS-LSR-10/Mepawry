'use client'
// components/3d/Player.tsx — Walks the avatar along a route and keeps the camera following it

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { CuteAvatar } from './CuteAvatar'
import type { AvatarLook } from '@/lib/look'
import { heightAt, isInside, type P } from './walk'
import { DOME, VIP_CENTER } from './sanctuary/plan'

const SPEED = 3.2 // world units per second

export interface Route { points: P[]; onArrive?: () => void; face?: P }

interface PlayerProps {
  name: string
  gender?: 'male' | 'female'
  look?: AvatarLook
  pos: React.RefObject<P>          // shared with the scene, which plans routes from it
  route: Route | null
  onInsideChange: (inside: boolean) => void
}

export function Player({ name, gender, look, pos, route, onInsideChange }: PlayerProps) {
  const group = useRef<THREE.Group>(null!)
  const marker = useRef<THREE.Mesh>(null!)
  const queue = useRef<P[]>([])
  const arrive = useRef<(() => void) | undefined>(undefined)
  const face = useRef<P | undefined>(undefined)
  const walking = useRef(false)
  const inside = useRef(false)
  const last = useRef<P | null>(null)
  const speed = useRef(0)                  // eased walking speed (springs toward SPEED, eases to a stop)
  const want = useRef(8)                   // the camera distance you chose (indoors it may be pulled in)
  const clamped = useRef(false)
  const wantSin = useRef(0.45)             // …and its elevation
  const swing = useRef<number | null>(null) // camera heading to swing round to (after arriving at a shrine)
  const follow = useRef<P | null>(null)    // where the camera is looking, trailing the avatar a little

  useEffect(() => {
    if (!route) return
    queue.current = [...route.points]
    arrive.current = route.onArrive
    face.current = route.face
    // Dropped in somewhere (a new floor): turn the camera so you face where you're going
    const p = pos.current
    swing.current = !route.points.length && route.face ? Math.atan2(p.x - route.face.x, p.z - route.face.z) : null
    const end = route.points.at(-1)
    if (end) marker.current.position.set(end.x, heightAt(end) + 0.02, end.z)
  }, [route])

  useFrame(({ camera, controls }, dt) => {
    const p = pos.current
    const q = queue.current
    if (q.length) {
      const n = q[0]
      const dx = n.x - p.x, dz = n.z - p.z
      const d = Math.hypot(dx, dz)
      const h = Math.min(dt, 0.25)
      // Ease in at the start and ease out over the last metre (critically damped spring on the speed)
      let left = d
      for (let i = 1; i < q.length; i++) left += Math.hypot(q[i].x - q[i - 1].x, q[i].z - q[i - 1].z)
      const want = SPEED * Math.min(1, 0.25 + left / 1.2)
      speed.current += (want - speed.current) * (1 - Math.exp(-h * 7))
      const step = Math.max(0.2 * h, speed.current * h) // waypoints cap each step, so big frames can't skip through walls
      if (d <= step) {
        p.x = n.x; p.z = n.z
        q.shift()
        if (!q.length) {
          const cb = arrive.current; arrive.current = undefined; cb?.()
          // At a shrine: swing the camera round behind you, so you see the shrine over your shoulder
          if (face.current) swing.current = Math.atan2(p.x - face.current.x, p.z - face.current.z)
        }
      } else {
        p.x += (dx / d) * step; p.z += (dz / d) * step
      }
      if (d > 0.01) turnTo(Math.atan2(dx, dz))
    } else if (face.current) {
      // Arrived at a shrine: turn to look at it
      turnTo(Math.atan2(face.current.x - p.x, face.current.z - p.z))
    }

    function turnTo(want: number) {
      // Smoothly, and the shortest way round
      const r = group.current.rotation
      r.y += (((want - r.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 12)
    }
    if (!q.length) speed.current = 0
    walking.current = q.length > 0
    marker.current.visible = walking.current
    const y = heightAt(p)
    group.current.position.set(p.x, y, p.z)

    // Camera keeps its angle and distance and slides along with the avatar
    // Camera trails the avatar with a little damping (smooth starts and stops, no rigid lock)
    const orbit = controls as unknown as { target: THREE.Vector3 } | null
    if (orbit) {
      if (!last.current || !follow.current) {
        // First frame: look at the avatar from behind, wherever it starts (a restored spot may be far from the entrance)
        orbit.target.set(p.x, y + 1.1, p.z)
        // Indoors, start on the roomy side: along a ring gallery, or towards the middle of a domed hall
        // (straight behind would put the camera outside the glass)
        const r = Math.hypot(p.x, p.z), inDome = Math.hypot(p.x - DOME.x, p.z - DOME.z) < DOME.r
        const hall = inDome ? DOME : r < 15 ? VIP_CENTER : null, d = hall ? Math.hypot(hall.x - p.x, hall.z - p.z) : 0
        let ux = 0, uz = 1
        if (isInside(p) && hall && d > 0.5) { ux = (hall.x - p.x) / d; uz = (hall.z - p.z) / d }
        else if (isInside(p) && !hall) { ux = -p.z / r; uz = p.x / r }
        const back = isInside(p) ? 5 : 8.5
        camera.position.set(p.x + ux * back, y + (isInside(p) ? 2.6 : 4), p.z + uz * back)
        follow.current = { ...p }
      }
      else {
        const f = follow.current, k = 1 - Math.exp(-Math.min(dt, 0.25) * 6)
        // Snap if far behind (arrival on another floor), otherwise glide
        const far = Math.hypot(p.x - f.x, p.z - f.z) > 6
        const mx = far ? p.x - f.x : (p.x - f.x) * k, mz = far ? p.z - f.z : (p.z - f.z) * k
        const my = (y + 1.1 - orbit.target.y) * (far ? 1 : k) // up and down the terrace stairs
        f.x += mx; f.z += mz
        camera.position.x += mx; camera.position.y += my; camera.position.z += mz
        orbit.target.x += mx; orbit.target.y += my; orbit.target.z += mz
      }
      // Indoors, keep the camera inside the walls: where the room is too tight for the view you chose, slide in and
      // rise to look down over your shoulder; ease back to your view once there's room
      const t = orbit.target, c = camera.position
      if (swing.current != null) {
        const a = Math.atan2(c.x - t.x, c.z - t.z), d = Math.hypot(c.x - t.x, c.z - t.z)
        const turn = ((swing.current - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
        const b = a + turn * (1 - Math.exp(-Math.min(dt, 0.25) * 4))
        c.x = t.x + Math.sin(b) * d; c.z = t.z + Math.cos(b) * d
        if (Math.abs(turn) < 0.02) swing.current = null
      }
      const dx = c.x - t.x, dy = c.y - t.y, dz = c.z - t.z, len = Math.hypot(dx, dy, dz), flat = Math.hypot(dx, dz)
      if (inside.current && flat > 0.01) {
        if (!clamped.current) { want.current = len; wantSin.current = dy / len }
        const wantUp = want.current * wantSin.current, wantFlat = Math.sqrt(Math.max(0, want.current ** 2 - wantUp ** 2))
        // Only the building's own walls count (the camera looks over benches, planters and sofas), kept 0.7 m off the glass
        let clear = 0
        while (clear < wantFlat + 0.7 && isInside({ x: t.x + (dx / flat) * (clear + 0.2), z: t.z + (dz / flat) * (clear + 0.2) })) clear += 0.2
        const flatTo = Math.min(wantFlat, Math.max(0.3, clear - 0.7))
        clamped.current = flatTo < wantFlat - 0.05
        const upTo = clamped.current ? Math.max(wantUp, Math.min(3.2, Math.sqrt(want.current ** 2 - flatTo ** 2))) : wantUp
        const k = 1 - Math.exp(-Math.min(dt, 0.25) * 4)
        const nf = flatTo < flat ? flatTo : flat + (flatTo - flat) * k
        const nu = dy + (upTo - dy) * k
        c.set(t.x + (dx / flat) * nf, t.y + nu, t.z + (dz / flat) * nf)
      }
      else clamped.current = false
      last.current = { ...p }
    }

    const now = isInside(p)
    if (now !== inside.current) { inside.current = now; onInsideChange(now) }
  })

  return (
    <>
      <group ref={group}>
        <CuteAvatar name={name} walking={walking} gender={gender} look={look} />
      </group>
      {/* Where you tapped */}
      <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false} raycast={() => null}>
        <ringGeometry args={[0.25, 0.38, 32]} />
        <meshBasicMaterial color="#FFD27A" transparent opacity={0.85} />
      </mesh>
    </>
  )
}
