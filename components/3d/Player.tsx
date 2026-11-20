'use client'
// components/3d/Player.tsx — Walks the avatar along a route and keeps the camera following it

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type * as THREE from 'three'
import { CuteAvatar } from './CuteAvatar'
import type { AvatarLook } from '@/lib/look'
import { heightAt, isFree, isInside, type P } from './walk'
import type { Stick } from './Joystick'
import { DOME, VIP_CENTER } from './sanctuary/plan'

const SPEED = 3.2 // world units per second
const MIN_INDOOR_TILT = 0.87 // radians above the horizon (~50°): indoors the camera looks down over the cabinets

export interface Route { points: P[]; onArrive?: () => void; face?: P }

interface PlayerProps {
  name: string
  gender?: 'male' | 'female'
  look?: AvatarLook
  pos: React.RefObject<P>          // shared with the scene, which plans routes from it
  route: Route | null
  onInsideChange: (inside: boolean) => void
  stick?: React.RefObject<Stick>   // the on-screen walking stick
  walkSpeed?: number               // × normal walking speed (Settings → Walking speed)
  turnSpeed?: number               // × how fast the camera swings round by itself (Settings → Turning speed)
}

export function Player({ name, gender, look, pos, route, onInsideChange, stick, walkSpeed = 1, turnSpeed = 1 }: PlayerProps) {
  const group = useRef<THREE.Group>(null!)
  const marker = useRef<THREE.Mesh>(null!)
  const queue = useRef<P[]>([])
  const arrive = useRef<(() => void) | undefined>(undefined)
  const face = useRef<P | undefined>(undefined)
  const walking = useRef(false)
  const inside = useRef(false)
  const last = useRef<P | null>(null)
  const speed = useRef(0)                  // eased walking speed (springs toward SPEED, eases to a stop)
  const want = useRef(6)                   // the camera distance you chose (indoors it may be pulled in)
  const armSet = useRef<number | null>(null) // the distance the arm last put the camera at
  const swing = useRef<number | null>(null) // camera heading to swing round to (after arriving at a shrine)
  const tiltUp = useRef(false)              // easing the camera up to look down into a room you just entered
  const follow = useRef<P | null>(null)    // where the camera is looking, trailing the avatar a little

  // Your own drag wins over an automatic camera swing
  const canvas = useThree(st => st.gl.domElement)
  useEffect(() => {
    const stop = () => { swing.current = null; tiltUp.current = false }
    canvas.addEventListener('pointerdown', stop)
    return () => canvas.removeEventListener('pointerdown', stop)
  }, [canvas])

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
    // The walking stick: up walks the way the camera looks, sideways steps across; it overrides any tap-to-walk route
    const st = stick?.current, push = st ? Math.min(1, Math.hypot(st.x, st.y)) : 0
    const steering = push > 0.12
    if (steering) {
      q.length = 0; arrive.current = undefined; face.current = undefined; swing.current = null
      let fx = p.x - camera.position.x, fz = p.z - camera.position.z
      const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl
      const mx = fx * -st!.y + -fz * st!.x, mz = fz * -st!.y + fx * st!.x, ml = Math.hypot(mx, mz) || 1
      const step = SPEED * walkSpeed * push * Math.min(dt, 0.1)
      const nx = p.x + (mx / ml) * step, nz = p.z + (mz / ml) * step
      // Slide along walls rather than stopping dead
      if (isFree({ x: nx, z: nz })) { p.x = nx; p.z = nz }
      else if (isFree({ x: nx, z: p.z })) p.x = nx
      else if (isFree({ x: p.x, z: nz })) p.z = nz
      turnTo(Math.atan2(mx, mz))
    } else if (q.length) {
      const n = q[0]
      const dx = n.x - p.x, dz = n.z - p.z
      const d = Math.hypot(dx, dz)
      const h = Math.min(dt, 0.25)
      // Ease in at the start and ease out over the last metre (critically damped spring on the speed)
      let left = d
      for (let i = 1; i < q.length; i++) left += Math.hypot(q[i].x - q[i - 1].x, q[i].z - q[i - 1].z)
      const want = SPEED * walkSpeed * Math.min(1, 0.25 + left / 1.2)
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
    walking.current = q.length > 0 || steering
    marker.current.visible = q.length > 0
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
        const back = isInside(p) ? 7.1 : 8.5
        camera.position.set(p.x + ux * back, y + (isInside(p) ? 8.4 : 4), p.z + uz * back)
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
      // In the ring galleries the camera is on a spring arm (behind the cabinets it would see only their backs): it only
      // ever comes closer along the line you're looking, never changes your angle, so dragging to look around stays free,
      // and eases back out to your distance when there's room. The domed halls have glass walls, so there it's left free.
      const t = orbit.target, c = camera.position
      if (swing.current != null) {
        const a = Math.atan2(c.x - t.x, c.z - t.z), d = Math.hypot(c.x - t.x, c.z - t.z)
        const turn = ((swing.current - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
        const b = a + turn * (1 - Math.exp(-Math.min(dt, 0.25) * 4 * turnSpeed))
        c.x = t.x + Math.sin(b) * d; c.z = t.z + Math.cos(b) * d
        // …and rise to look down at about 45°, over the cabinets across the aisle
        c.y += (t.y + Math.max(d, 3) - c.y) * (1 - Math.exp(-Math.min(dt, 0.25) * 4 * turnSpeed))
        if (Math.abs(turn) < 0.02) swing.current = null
      }
      const dx = c.x - t.x, dy = c.y - t.y, dz = c.z - t.z, len = Math.hypot(dx, dy, dz), flat = Math.hypot(dx, dz)
      // A distance we didn't set means you zoomed: that's the distance you want now
      if (armSet.current == null || Math.abs(len - armSet.current) > 0.01) want.current = len
      let next = want.current
      // Indoors the roofs are off (a dollhouse cutaway). On walking in, the camera eases up to look down into the room
      // (~50°, over the cabinets); after that it stays wherever you put it, and touching the screen stops the easing.
      let ux = dx / len, uy = dy / len, uz = dz / len
      if (tiltUp.current && flat > 0.01) {
        const e = Math.atan2(dy, flat)
        if (e >= MIN_INDOOR_TILT - 0.01) tiltUp.current = false
        else {
          const ne = e + (MIN_INDOOR_TILT - e) * (1 - Math.exp(-Math.min(dt, 0.25) * 3 * turnSpeed)), h = Math.cos(ne)
          ux = (dx / flat) * h; uy = Math.sin(ne); uz = (dz / flat) * h
        }
      }
      // Ease to your chosen distance (after a zoom it's already there)
      if (next !== len) next = len + (next - len) * (1 - Math.exp(-Math.min(dt, 0.25) * 3))
      c.set(t.x + ux * next, t.y + uy * next, t.z + uz * next)
      armSet.current = next
      last.current = { ...p }
    }

    const now = isInside(p)
    if (now !== inside.current) { inside.current = now; tiltUp.current = now; onInsideChange(now) }
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
