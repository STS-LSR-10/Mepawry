'use client'
// components/3d/Player.tsx — Walks the avatar along a route and keeps the camera following it

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { CuteAvatar } from './CuteAvatar'
import type { AvatarLook } from '@/lib/look'
import { isInside, type P } from './layout'

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
  const follow = useRef<P | null>(null)    // where the camera is looking, trailing the avatar a little

  useEffect(() => {
    if (!route) return
    queue.current = [...route.points]
    arrive.current = route.onArrive
    face.current = route.face
    const end = route.points.at(-1)
    if (end) marker.current.position.set(end.x, -0.48, end.z)
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
        if (!q.length) { const cb = arrive.current; arrive.current = undefined; cb?.() }
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
    group.current.position.set(p.x, -0.5, p.z)

    // Camera keeps its angle and distance and slides along with the avatar
    // Camera trails the avatar with a little damping (smooth starts and stops, no rigid lock)
    const orbit = controls as unknown as { target: THREE.Vector3 } | null
    if (orbit) {
      if (!last.current || !follow.current) { orbit.target.set(p.x, 0.6, p.z); follow.current = { ...p } }
      else {
        const f = follow.current, k = 1 - Math.exp(-Math.min(dt, 0.25) * 6)
        // Snap if far behind (arrival on another floor), otherwise glide
        const far = Math.hypot(p.x - f.x, p.z - f.z) > 6
        const mx = far ? p.x - f.x : (p.x - f.x) * k, mz = far ? p.z - f.z : (p.z - f.z) * k
        f.x += mx; f.z += mz
        camera.position.x += mx; camera.position.z += mz
        orbit.target.x += mx; orbit.target.z += mz
      }
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
