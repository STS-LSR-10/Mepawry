'use client'
// components/3d/sanctuary/SanctuaryPreview.tsx — Concept preview of a new building: "Mepawry Sanctuary".
// Two curved glasshouse galleries (wooden frames, barrel-vaulted glass roofs) run in rings around a garden.
// Memorial shelves line the galleries' outer walls. A glass-domed pavilion at the front is the entrance, with side
// doors and steps either side. In the middle, on a raised terrace, a domed pavilion with two wings: the VIP zone.
// It's a standalone scene to look at (orbit camera), separate from the walkable hall.

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, Sky } from '@react-three/drei'
import {
  BufferAttribute, CanvasTexture, Color, SRGBColorSpace, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, LatheGeometry,
  MeshPhysicalMaterial, MeshStandardMaterial, Object3D, RepeatWrapping, Vector2, type BufferGeometry, type Texture,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { OrbitControls as OrbitImpl } from 'three-stdlib'
import { lawnTexture, pavingTexture, signTexture, woodTexture } from '../textures'
import { microMap } from '../look'
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useQuality } from '../quality'

// ── Plan (metres). Angles go round from +x towards +z; the front of the site (the entrance path) is +z. ──
const FRONT = Math.PI / 2
const W = 6           // gallery width
const H = 3.2         // wall height (the glass vault sits on top)
const SILL = 0.62     // top of the stone base wall + wooden sill; the glass starts here
const PLINTH = 0.5   // stone base wall under every window
const RINGS = [
  { r: 33, from: FRONT + 0.15, to: FRONT - 0.15 + Math.PI * 2 },  // outer gallery: a full ring, the dome closes it at the front
  { r: 21, from: FRONT + 0.42, to: FRONT - 0.42 + Math.PI * 2 },  // inner gallery: open at the front, steps lead through
]
const DOME = { x: 0, z: 33, r: 5.6, wall: 4.4 }                    // the entrance pavilion, facing the front
const SIDE_DOORS = [FRONT + 0.5, FRONT - 0.5]                       // smaller doors with steps either side of the dome
const VIP = { z: -9, y: 1.3 }                                       // the raised terrace with the VIP pavilion

type V3 = [number, number, number]
const SUN: V3 = [-86, 27, 58] // golden hour: low and warm, from the front-left
const polar = (a: number, r: number, y = 0): V3 => [Math.cos(a) * r, y, Math.sin(a) * r]

function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
}

/** Sets every instance of a mesh from a list of (position, y-rotation, scale) and optional colours. */
function useInstances(ref: React.RefObject<InstancedMesh | null>, items: { p: V3; ry?: number; rx?: number; rz?: number; s?: V3; c?: string }[]) {
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D(), col = new Color()
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0, 'YXZ')
      o.scale.set(...(it.s ?? [1, 1, 1]))
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.c) m.setColorAt(i, col.set(it.c))
    })
    m.count = items.length
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [ref, items])
}

function useMaterials(low: boolean) {
  return useMemo(() => {
    const wood = woodTexture()
    wood.repeat.set(1, 3)
    // Real glass: nearly clear when you look straight through it, bright and mirror-like at grazing angles
    // (Fresnel), reflecting the sky. That is what makes a glasshouse read as glass rather than an empty frame.
    const glass = new MeshPhysicalMaterial({
      color: '#8FAAB6', transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.05,
      clearcoat: low ? 0 : 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, side: DoubleSide, depthWrite: false,
    })
    glass.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        float fres = pow(1.0 - facing, 2.6);
        diffuseColor.a = clamp(diffuseColor.a + fres * 0.5, 0.0, 0.8);
        outgoingLight += vec3(0.62, 0.72, 0.8) * fres * 0.1;
        #include <opaque_fragment>`)
    }
    return {
      // honey-toned oak: a warm base with a fine grain in the bump, not the dark walnut texture
      frame: new MeshStandardMaterial({ color: '#B06A2C', roughness: 0.36, bumpMap: microMap('grain'), bumpScale: 0.25 }),
      shelf: new MeshStandardMaterial({ color: '#A8703E', roughness: 0.6, bumpMap: microMap('grain'), bumpScale: 0.6 }),
      photoFrame: new MeshStandardMaterial({ color: '#E8D2A6', roughness: 0.4, metalness: 0.3 }),
      glass,
      stone: new MeshStandardMaterial({ color: '#B39876', roughness: 0.85, bumpMap: microMap('stone'), bumpScale: 1 }),
      white: new MeshStandardMaterial({ color: '#F1ECE2', roughness: 0.5 }),
      plinth: new MeshStandardMaterial({ color: '#C4A57E', roughness: 0.9, bumpMap: microMap('stone'), bumpScale: 1.4 }),
      frameCard: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }),
    }
  }, [low])
}
type Mats = ReturnType<typeof useMaterials>

// ── Galleries ──

function Gallery({ r, from, to, m }: { r: number; from: number; to: number; m: Mats }) {
  const len = to - from
  const ri = r - W / 2, ro = r + W / 2
  const bays = Math.ceil((len * r) / 3.4)
  const step = len / bays
  const angles = useMemo(() => Array.from({ length: bays + 1 }, (_, i) => from + i * step), [from, step, bays])

  // Posts on both walls, ribs across the vault at every post
  const posts = useMemo(() => angles.flatMap(a => [ri, ro].map(rr => ({ p: polar(a, rr, H / 2), ry: -a }))), [angles, ri, ro])
  const ribs = useMemo(() => angles.slice(0, -1).flatMap(a0 => [0, 1 / 3, 2 / 3].map(f => ({ p: polar(a0 + step * f, r, H + 0.28), ry: -(a0 + step * f), s: [1, 1, f ? 0.6 : 1] as V3 }))).concat([{ p: polar(to, r, H + 0.28), ry: -to, s: [1, 1, 1] }]), [angles, r, step, to])
  // Glass panes and wooden sills between posts, on both walls
  const panes = useMemo(() => angles.slice(0, -1).flatMap(a0 => [ri, ro].map(rr => {
    const a = a0 + step / 2, w = 2 * rr * Math.sin(step / 2)
    return { a, w, p: polar(a, rr, SILL + (H - SILL) / 2), ry: -a + Math.PI / 2, s: [w, H - SILL, 1] as V3 }
  })), [angles, ri, ro, step])
  // Along a pane: a point `off` metres sideways from its centre, at height y
  const along = (pn: { a: number; p: V3 }, off: number, y: number): V3 => [pn.p[0] + Math.sin(pn.a) * off, y, pn.p[2] - Math.cos(pn.a) * off]
  // Stone base wall, a wooden sill on it, and a heavy timber beam along the top of every bay
  const plinths = useMemo(() => panes.map(pn => ({ p: [pn.p[0], PLINTH / 2, pn.p[2]] as V3, ry: pn.ry, s: [pn.w + 0.24, PLINTH, 0.55] as V3 })), [panes])
  const sills = useMemo(() => panes.map(pn => ({ p: [pn.p[0], PLINTH + 0.06, pn.p[2]] as V3, ry: pn.ry, s: [pn.w + 0.1, 0.12, 0.34] as V3 })), [panes])
  const beams = useMemo(() => panes.map(pn => ({ p: [pn.p[0], H + 0.12, pn.p[2]] as V3, ry: pn.ry, s: [pn.w + 0.24, 0.34, 0.42] as V3 })), [panes])
  // Glazing bars: three uprights and two rails per window, small panes like a real conservatory
  const mullions = useMemo(() => panes.flatMap(pn => [-1, 0, 1].map(k => ({ p: along(pn, k * pn.w / 4, (SILL + H) / 2), ry: pn.ry, s: [0.055, H - SILL, 0.07] as V3 }))), [panes])
  const transoms = useMemo(() => panes.flatMap(pn => [SILL + 0.75, SILL + 1.45].map(y => ({ p: along(pn, 0, y), ry: pn.ry, s: [pn.w, 0.05, 0.07] as V3 }))), [panes])
  // An arched head in every window: an outer and an inner arch springing from the transom
  const arches = useMemo(() => panes.flatMap(pn => [1, 0.55].map(k => ({ p: along(pn, 0, H - pn.w / 2 * 0.98), ry: pn.ry, s: [k * pn.w / 2 * 0.96, k * pn.w / 2 * 0.96, 1] as V3 }))), [panes])
  // Vault glass: a half-cylinder per bay, laid along the curve
  const vaults = useMemo(() => angles.slice(0, -1).map(a0 => {
    const a = a0 + step / 2
    return { p: polar(a, r, H + 0.28), ry: -a - Math.PI / 2, s: [1, 1, 1] as V3 }
  }), [angles, r, step])
  const vaultGeo = useMemo(() => {
    const g = new CylinderGeometry(W / 2, W / 2, 2 * r * Math.sin(step / 2) + 0.02, 28, 1, true, 0, Math.PI)
    g.rotateZ(Math.PI / 2)
    return g
  }, [r, step])

  // Memorial shelves: a tall bookcase in every bay of the outer wall, facing in, each holding a grid of portraits
  const cases = useMemo(() => angles.slice(0, -1).map(a0 => {
    const a = a0 + step / 2, w = 2 * (ro - 0.35) * Math.sin(step / 2) * 0.9
    return { p: polar(a, ro - 0.35, 1.45), ry: -a - Math.PI / 2, s: [w, 2.6, 0.38] as V3 }
  }), [angles, ro, step])
  // Inside each bookcase: shelf boards, and a framed portrait in most cubbies (some still waiting for a pet)
  const { portraits, frames, boards } = useMemo(() => {
    const rnd = seeded(Math.round(r * 100))
    const portraits: { p: V3; ry: number; s: V3; c: string }[] = [], frames: { p: V3; ry: number; s: V3 }[] = [], boards: { p: V3; ry: number; s: V3 }[] = []
    const pal = ['#F6C9A8', '#F2B8C6', '#CDBDEB', '#B8D9F0', '#C4E3BB', '#FBE3A3', '#F4EDE2', '#E7B48F', '#D9A27A']
    angles.slice(0, -1).forEach(a0 => {
      const a = a0 + step / 2, w = 2 * (ro - 0.55) * Math.sin(step / 2) * 0.82
      const tx = -Math.sin(a), tz = Math.cos(a), ry = -a - Math.PI / 2
      const at = (rr: number, off: number, y: number): V3 => { const [px, , pz] = polar(a, rr, 0); return [px + tx * off, y, pz + tz * off] }
      const cols = 6, rows = 6
      for (let k = 0; k <= rows; k++) boards.push({ p: at(ro - 0.5, 0, 0.24 + k * 0.4), ry, s: [w * 1.08, 0.04, 0.34] })
      for (let ci = 0; ci < cols; ci++) for (let rw = 0; rw < rows; rw++) {
        if (rnd() < 0.18) continue
        const off = (ci - (cols - 1) / 2) * (w / cols), y = 0.44 + rw * 0.4, fw = (w / cols) * 0.66
        frames.push({ p: at(ro - 0.56, off, y), ry, s: [fw, 0.3, 0.035] })
        portraits.push({ p: at(ro - 0.58, off, y), ry, s: [fw * 0.78, 0.23, 1], c: pal[Math.floor(rnd() * pal.length)] })
      }
    })
    return { portraits, frames, boards }
  }, [angles, ro, r, step])

  // Purlins: thin wooden rails running round the vault
  const purlins = useMemo(() => [0.07, 0.17, 0.28, 0.39, 0.5, 0.61, 0.72, 0.83, 0.93].map(f => {
    const b = Math.PI * f
    return { rr: r + (W / 2) * Math.cos(b), y: H + 0.28 + (W / 2) * Math.sin(b), t: f === 0.5 ? 0.09 : 0.04 }
  }), [r])

  const refs = {
    posts: useRef<InstancedMesh>(null), ribs: useRef<InstancedMesh>(null), panes: useRef<InstancedMesh>(null),
    sills: useRef<InstancedMesh>(null), vaults: useRef<InstancedMesh>(null), cases: useRef<InstancedMesh>(null),
    plinths: useRef<InstancedMesh>(null), beams: useRef<InstancedMesh>(null), arches: useRef<InstancedMesh>(null),
    portraits: useRef<InstancedMesh>(null), frames: useRef<InstancedMesh>(null), boards: useRef<InstancedMesh>(null), mullions: useRef<InstancedMesh>(null), transoms: useRef<InstancedMesh>(null),
  }
  useInstances(refs.posts, posts)
  useInstances(refs.ribs, ribs)
  useInstances(refs.panes, panes)
  useInstances(refs.sills, sills)
  useInstances(refs.vaults, vaults)
  useInstances(refs.cases, cases)
  useInstances(refs.portraits, portraits)
  useInstances(refs.frames, frames)
  useInstances(refs.boards, boards)
  useInstances(refs.mullions, mullions)
  useInstances(refs.transoms, transoms)
  useInstances(refs.plinths, plinths)
  useInstances(refs.beams, beams)
  useInstances(refs.arches, arches)

  return (
    <group>
      {/* Floor of the gallery: pale stone */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow material={m.stone}>
        <ringGeometry args={[ri, ro, 160, 1, -to, len]} />
      </mesh>
      <instancedMesh ref={refs.posts} args={[undefined, undefined, posts.length]} material={m.frame} castShadow receiveShadow>
        <boxGeometry args={[0.24, H, 0.24]} />
      </instancedMesh>
      <instancedMesh ref={refs.plinths} args={[undefined, undefined, plinths.length]} material={m.plinth} castShadow receiveShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.beams} args={[undefined, undefined, beams.length]} material={m.frame} castShadow receiveShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.arches} args={[undefined, undefined, arches.length]} material={m.frame}>
        <torusGeometry args={[1, 0.045, 5, 24, Math.PI]} />
      </instancedMesh>
      <instancedMesh ref={refs.ribs} args={[undefined, undefined, ribs.length]} material={m.frame} castShadow>
        <torusGeometry args={[W / 2, 0.08, 6, 32, Math.PI]} />
      </instancedMesh>
      <instancedMesh ref={refs.sills} args={[undefined, undefined, sills.length]} material={m.frame} castShadow receiveShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.mullions} args={[undefined, undefined, mullions.length]} material={m.frame} castShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.transoms} args={[undefined, undefined, transoms.length]} material={m.frame}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.cases} args={[undefined, undefined, cases.length]} material={m.shelf} castShadow receiveShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.boards} args={[undefined, undefined, boards.length]} material={m.frame} castShadow receiveShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.frames} args={[undefined, undefined, frames.length]} material={m.photoFrame}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.portraits} args={[undefined, undefined, portraits.length]} material={m.frameCard}>
        <planeGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.panes} args={[undefined, undefined, panes.length]} material={m.glass} renderOrder={2}>
        <planeGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.vaults} args={[vaultGeo, m.glass, vaults.length]} renderOrder={2} />
      {purlins.map(({ rr, y, t }, i) => (
        <mesh key={i} position-y={y} rotation-y={-from} material={m.frame} castShadow={t > 0.05}>
          <torusGeometry args={[rr, t, 5, 200, len]} />
        </mesh>
      ))}
      {/* Gable ends where the ring opens: a wooden arch with glass */}
      {[from, to].map(a => (
        <group key={a} position={polar(a, r, 0)} rotation-y={-a}>
          <mesh position-y={H + 0.28} rotation-y={Math.PI / 2} material={m.glass} renderOrder={2}>
            <circleGeometry args={[W / 2, 28, 0, Math.PI]} />
          </mesh>
          <mesh position-y={H + 0.28} rotation-y={Math.PI / 2} material={m.frame} castShadow>
            <torusGeometry args={[W / 2, 0.11, 6, 28, Math.PI]} />
          </mesh>
          <mesh position-y={H} rotation-y={Math.PI / 2} material={m.frame}>
            <boxGeometry args={[W, 0.14, 0.14]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** The purlins above are tori in the XY plane; this lays every child torus flat once. */
function FlattenTori({ children }: { children: React.ReactNode }) {
  const ref = useRef<import('three').Group>(null)
  useLayoutEffect(() => {
    ref.current?.traverse(o => {
      const g = (o as import('three').Mesh).geometry as BufferGeometry | undefined
      if (g?.type === 'TorusGeometry' && (g as unknown as { parameters: { radius: number } }).parameters.radius > 10 && !o.userData.flat) {
        g.rotateX(Math.PI / 2)
        o.userData.flat = true
      }
    })
  }, [])
  return <group ref={ref}>{children}</group>
}

// ── Entrance pavilion: octagonal glasshouse with a lattice dome and a cupola ──

function DomePavilion({ m, sign, at, r, wall, y = 0, doors = [2] }: { m: Mats; sign?: Texture; at: [number, number]; r: number; wall: number; y?: number; doors?: number[] }) {
  const sides = 8
  return (
    <group position={[at[0], y, at[1]]} rotation-y={Math.PI / 8}> {/* turns side 2 (the door) to face straight down the path */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.03} receiveShadow material={m.stone}><circleGeometry args={[r, 8]} /></mesh>
      {Array.from({ length: sides }, (_, i) => {
        const a = (i / sides) * Math.PI * 2, a2 = ((i + 0.5) / sides) * Math.PI * 2
        const side = 2 * r * Math.sin(Math.PI / sides)
        const isDoor = doors.includes(i) // side 2 faces +z (the front), side 6 faces the back
        return (
          <group key={i}>
            <mesh position={polar(a, r, wall / 2)} material={m.frame} castShadow><boxGeometry args={[0.22, wall, 0.22]} /></mesh>
            <group position={polar(a2, r * Math.cos(Math.PI / sides), 0)} rotation-y={-a2 + Math.PI / 2}>
              {!isDoor && <>
                <mesh position-y={PLINTH / 2} material={m.plinth} castShadow receiveShadow><boxGeometry args={[side, PLINTH, 0.5]} /></mesh>
                <mesh position-y={PLINTH + 0.06} material={m.frame} castShadow><boxGeometry args={[side, 0.12, 0.34]} /></mesh>
                {/* arched window head with an inner arch, and two extra glazing bars */}
                {[1, 0.55].map(k => <mesh key={k} position-y={wall - side / 2 * 0.95} material={m.frame}><torusGeometry args={[k * side / 2 * 0.92, 0.05, 5, 24, Math.PI]} /></mesh>)}
                {[-1, 1].map(k => <mesh key={k} position={[k * side / 4, (SILL + wall) / 2, 0]} material={m.frame}><boxGeometry args={[0.05, wall - SILL, 0.07]} /></mesh>)}
              </>}
              <mesh position-y={isDoor ? wall - 0.55 : SILL + (wall - SILL) / 2} material={m.glass} renderOrder={2}>
                <planeGeometry args={[side, isDoor ? 1.1 : wall - SILL]} />
              </mesh>
              <mesh position-y={wall - 1.1} material={m.frame}><boxGeometry args={[side, 0.08, 0.1]} /></mesh>
              {!isDoor && <mesh position-y={(SILL + wall) / 2} material={m.frame}><boxGeometry args={[0.07, wall - SILL, 0.1]} /></mesh>}
              {isDoor && (
                <group position-z={0.05}>
                  {/* arched doorway and the sign above it */}
                  <mesh position-y={2.3} material={m.frame} castShadow><torusGeometry args={[1.05, 0.1, 8, 24, Math.PI]} /></mesh>
                  {[-1, 1].map(s => <mesh key={s} position={[s * 1.05, 1.15, 0]} material={m.frame} castShadow><boxGeometry args={[0.2, 2.3, 0.2]} /></mesh>)}
                  {sign && i === 2 && (
                    <mesh position={[0, 3.55, 0.12]}>
                      <planeGeometry args={[3.4, 0.62]} />
                      <meshStandardMaterial map={sign} roughness={0.6} transparent alphaTest={0.4} />
                    </mesh>
                  )}
                </group>
              )}
            </group>
          </group>
        )
      })}
      <mesh position-y={wall} rotation-x={Math.PI / 2} material={m.frame} castShadow><torusGeometry args={[r, 0.16, 8, 8]} /></mesh>
      {/* glass dome with ribs and rings */}
      <mesh position-y={wall} material={m.glass} renderOrder={2}><sphereGeometry args={[r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {/* a heavy drum beam, then the dome's ribs (every other one heavier) and rings */}
      <mesh position-y={wall + 0.18} material={m.frame} castShadow><cylinderGeometry args={[r + 0.12, r + 0.18, 0.36, 8, 1, true]} /></mesh>
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} position-y={wall} rotation-y={(i / 24) * Math.PI} material={m.frame} castShadow>
          <torusGeometry args={[r, i % 2 ? 0.04 : 0.075, 5, 48, Math.PI]} />
        </mesh>
      ))}
      {[0.18, 0.36, 0.52, 0.67, 0.8, 0.9].map(f => (
        <mesh key={f} position-y={wall + r * Math.sin(f * Math.PI / 2)} rotation-x={Math.PI / 2} material={m.frame}>
          <torusGeometry args={[r * Math.cos(f * Math.PI / 2), 0.05, 5, 48]} />
        </mesh>
      ))}
      {/* cupola */}
      <group position-y={wall + r - 0.15}>
        <mesh position-y={0.55} material={m.frame} castShadow><cylinderGeometry args={[1.1, 1.2, 1.1, 8, 1, true]} /></mesh>
        <mesh position-y={0.55} material={m.glass}><cylinderGeometry args={[1.05, 1.15, 1.0, 8]} /></mesh>
        <mesh position-y={1.1} material={m.frame} castShadow><sphereGeometry args={[1.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position-y={2.4} material={m.frame}><coneGeometry args={[0.12, 0.6, 8]} /></mesh>
        <mesh position-y={2.1} material={m.frame}><sphereGeometry args={[0.16, 12, 8]} /></mesh>
      </group>
    </group>
  )
}

// ── Garden: lawn, paths, fountain, gazebos, flower beds, hedges, benches, trees, forest ──

function Ground({ low }: { low: boolean }) {
  const lawn = useMemo(() => { const t = lawnTexture('#6F9B4A'); t.repeat.set(70, 70); return t }, [])
  const paving = useMemo(() => { const t = pavingTexture(); t.repeat.set(1, 1); return t }, [])
  const path = (inner: number, outer: number, rep: number) => {
    const t = paving.clone(); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(rep, 2); t.needsUpdate = true
    return { inner, outer, t }
  }
  const rings = useMemo(() => [path(37.2, 39.6, 120), path(26.6, 27.6, 80)], []) // eslint-disable-line react-hooks/exhaustive-deps
  const straight = useMemo(() => { const t = paving.clone(); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(2, 30); t.needsUpdate = true; return t }, [paving])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[260, 64]} />
        <meshStandardMaterial map={lawn} color="#668F3C" roughness={0.95} />
      </mesh>
      {rings.map(({ inner, outer, t }) => (
        <mesh key={inner} rotation-x={-Math.PI / 2} position-y={0.015} receiveShadow>
          <ringGeometry args={[inner, outer, 160]} />
          <meshStandardMaterial map={t} color="#EBD2AE" roughness={0.9} />
        </mesh>
      ))}
      {/* the entrance path from the front, through both openings to the fountain */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.016, 58]} receiveShadow>
        <planeGeometry args={[4, 40]} />
        <meshStandardMaterial map={straight} color="#EBD2AE" roughness={0.9} />
      </mesh>
      {/* path from the entrance through the inner opening to the terrace stairs */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.017, 15]} receiveShadow>
        <planeGeometry args={[3.4, 30]} />
        <meshStandardMaterial map={straight} color="#EBD2AE" roughness={0.9} />
      </mesh>
      {!low && <Hills />}
    </group>
  )
}

function Hills() {
  const geo = useMemo(() => {
    const g = mergeVertices(new IcosahedronGeometry(1, 4))
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
      const k = 1 + 0.08 * Math.sin(x * 5 + z * 3) + 0.05 * Math.sin(y * 7 - x * 4)
      p.setXYZ(i, x * k, y * k, z * k)
    }
    g.computeVertexNormals()
    return g
  }, [])
  const hills = useMemo(() => {
    const rnd = seeded(7)
    return Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 + rnd() * 0.3, d = 170 + rnd() * 50
      return { p: [Math.cos(a) * d, -18, Math.sin(a) * d] as V3, s: [60 + rnd() * 40, 34 + rnd() * 26, 50 + rnd() * 30] as V3 }
    })
  }, [])
  return (
    <>
      {hills.map((h, i) => (
        <mesh key={i} geometry={geo} position={h.p} scale={h.s}>
          <meshStandardMaterial color={i % 2 ? '#5E8247' : '#6D8F52'} roughness={1} />
        </mesh>
      ))}
    </>
  )
}

function Fountain({ m }: { m: Mats }) {
  const basin = useMemo(() => new LatheGeometry([new Vector2(0, 0), new Vector2(3.2, 0), new Vector2(3.3, 0.55), new Vector2(3.0, 0.6), new Vector2(2.9, 0.25), new Vector2(0, 0.25)], 48), [])
  const bowl = useMemo(() => new LatheGeometry([new Vector2(0.25, 0), new Vector2(0.3, 1.2), new Vector2(1.3, 1.5), new Vector2(1.4, 1.75), new Vector2(1.25, 1.75), new Vector2(0.2, 1.6)], 40), [])
  const water = useRef<import('three').Mesh>(null)
  useFrame(({ clock }) => { if (water.current) water.current.position.y = 0.48 + Math.sin(clock.elapsedTime * 2) * 0.01 })
  return (
    <group>
      <mesh geometry={basin} material={m.white} castShadow receiveShadow />
      <mesh ref={water} rotation-x={-Math.PI / 2} position-y={0.48}>
        <circleGeometry args={[2.95, 48]} />
        <meshPhysicalMaterial color="#6FB3C9" roughness={0.05} metalness={0.1} transparent opacity={0.85} clearcoat={1} />
      </mesh>
      <mesh geometry={bowl} material={m.white} castShadow />
      <mesh position-y={1.72} rotation-x={-Math.PI / 2}><circleGeometry args={[1.25, 32]} /><meshPhysicalMaterial color="#7FC0D2" roughness={0.05} transparent opacity={0.85} /></mesh>
      <mesh position-y={2.1} material={m.white}><sphereGeometry args={[0.25, 16, 12]} /></mesh>
      {/* the jet */}
      <mesh position-y={2.6}><cylinderGeometry args={[0.03, 0.08, 1, 8, 1, true]} /><meshBasicMaterial color="#E8F7FF" transparent opacity={0.5} /></mesh>
    </group>
  )
}

/** Round, slightly lumpy leaf clumps, darker underneath — read as real foliage from above. */
function leafGeo() {
  const g = mergeVertices(new IcosahedronGeometry(1, 3))
  const p = g.attributes.position, c = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const k = 1 + 0.14 * Math.sin(x * 6.1 + z * 4.3) + 0.1 * Math.sin(y * 7.7 - x * 5.2) + 0.06 * Math.sin(z * 13 + y * 11)
    p.setXYZ(i, x * k, y * k * 0.85, z * k)
    const v = 0.55 + 0.45 * (y + 1) / 2
    c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v
  }
  g.setAttribute('color', new BufferAttribute(c, 3))
  g.computeVertexNormals()
  return g
}

/** A cluster of small leaves on a transparent card. Many crossed cards make a canopy that reads as foliage. */
function leafCardTexture(kind: 'tree' | 'willow') {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const rnd = seeded(kind === 'tree' ? 5 : 9)
  const greens = kind === 'tree' ? ['#2F5A22', '#3D6E2B', '#4E8235', '#5E9440', '#76A84E', '#8DBA5C'] : ['#7FA548', '#94B85A', '#A9C86E', '#6E9640', '#BCD685']
  if (kind === 'tree') {
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 112
      const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d
      g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI * 2)
      g.fillStyle = greens[Math.floor((1 - d / 112) * 3 + rnd() * 3)]
      g.beginPath(); g.ellipse(0, 0, 5 + rnd() * 5, 2.5 + rnd() * 2.5, 0, 0, Math.PI * 2); g.fill()
      g.restore()
    }
  } else {
    // long hanging strands of narrow leaves
    for (let sx = 6; sx < 256; sx += 9 + rnd() * 6) {
      const len = 140 + rnd() * 116
      for (let y = 0; y < len; y += 5) {
        g.save(); g.translate(sx + Math.sin(y * 0.03) * 3, y); g.rotate((rnd() - 0.5) * 0.9)
        g.fillStyle = greens[Math.floor(rnd() * greens.length)]
        g.beginPath(); g.ellipse(0, 0, 1.6, 4.5, 0, 0, Math.PI * 2); g.fill()
        g.restore()
      }
    }
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

function Trees({ low }: { low: boolean }) {
  const leaves = useMemo(leafGeo, [])
  const leafTex = useMemo(() => leafCardTexture('tree'), [])
  const { trunks, clumps, cards } = useMemo(() => {
    const rnd = seeded(11)
    const trunks: { p: V3; s: V3; ry: number }[] = [], clumps: { p: V3; s: V3; ry: number; c: string }[] = []
    const cards: { p: V3; s: V3; rx: number; ry: number; rz: number; c: string }[] = []
    const tints = ['#FFFFFF', '#EEF5DF', '#DCE9C6', '#F4F0D8', '#D2E2B8']
    const greens = ['#3A6A24', '#4A7C2C', '#5A8A32', '#2F5E20', '#6A9438', '#2A521C']
    const place = (x: number, z: number, size: number) => {
      trunks.push({ p: [x, size * 1.1, z], s: [size * 0.5, size * 2.2, size * 0.5], ry: 0 })
      const n = 7 + Math.floor(rnd() * 4)
      for (let k = 0; k < n; k++) {
        const a = rnd() * Math.PI * 2, d = rnd() * size * 1.1
        const s = size * (0.6 + rnd() * 0.45)
        const cy = size * (2.4 + rnd() * 1.4), cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d
        // a dark inner volume so the canopy never looks see-through, wrapped in leaf cards
        clumps.push({ p: [cx, cy, cz], s: [s * 0.78, s * 0.7, s * 0.78], ry: rnd() * 6, c: greens[Math.floor(rnd() * greens.length)] })
        const nc = low ? 2 : 5
        for (let j = 0; j < nc; j++) {
          const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1)
          const nx = Math.sin(v) * Math.cos(u), ny = Math.cos(v) * 0.8, nz = Math.sin(v) * Math.sin(u)
          const cs = s * (1.3 + rnd() * 0.6)
          cards.push({ p: [cx + nx * s * 0.7, cy + ny * s * 0.7, cz + nz * s * 0.7], s: [cs, cs, cs], rx: rnd() * 6, ry: rnd() * 6, rz: rnd() * 6, c: tints[Math.floor(rnd() * tints.length)] })
        }
      }
    }
    // a few big trees in the inner garden and between the rings
    ;[[24, -14, 1.8], [-26, 4, 1.7], [-14, 22, 1.4], [14, -24, 1.9], [-20, -18, 1.6]].forEach(([x, z, s]) => place(x, z, s))
    // the forest around the site
    const n = low ? 160 : 520
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = 45 + Math.pow(rnd(), 0.9) * 120
      const x = Math.cos(a) * d, z = Math.sin(a) * d
      if (z > 30 && Math.abs(x) < 12) continue // keep the entrance path clear
      place(x, z, 1.4 + rnd() * 1.6)
    }
    return { trunks, clumps, cards }
  }, [low])
  const tRef = useRef<InstancedMesh>(null), cRef = useRef<InstancedMesh>(null), kRef = useRef<InstancedMesh>(null)
  useInstances(tRef, trunks)
  useInstances(cRef, clumps)
  useInstances(kRef, cards)
  // a gentle sway in the canopy
  useFrame(({ clock }) => { if (cRef.current) cRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.002 })
  return (
    <>
      <instancedMesh ref={tRef} args={[undefined, undefined, trunks.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.3, 1, 7]} />
        <meshStandardMaterial color="#5A4130" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={cRef} args={[leaves, undefined, clumps.length]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.9} color="#B8C8A4" />
      </instancedMesh>
      <instancedMesh ref={kRef} args={[undefined, undefined, cards.length]} castShadow receiveShadow>
        <planeGeometry />
        <meshStandardMaterial map={leafTex} alphaTest={0.45} side={DoubleSide} roughness={0.85} />
      </instancedMesh>
    </>
  )
}

function Flowers({ low }: { low: boolean }) {
  const items = useMemo(() => {
    const rnd = seeded(23), out: { p: V3; s: V3; c: string }[] = [], leaves: { p: V3; s: V3; c: string }[] = []
    const pal = ['#F28AA8', '#F6C24B', '#B78BE0', '#F37A5A', '#FFFFFF', '#E95F8A', '#F9A23A', '#8FB8F0']
    const bed = (cx: number, cz: number, rx: number, rz: number, n: number) => {
      for (let i = 0; i < n / 3; i++) { // leafy mounds under the blooms
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()), s = 0.3 + rnd() * 0.25
        leaves.push({ p: [cx + Math.cos(a) * rx * d, s * 0.35, cz + Math.sin(a) * rz * d], s: [s, s * 0.6, s], c: rnd() < 0.5 ? '#3E6A2E' : '#4C7A36' })
      }
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd())
        const s = 0.07 + rnd() * 0.06
        out.push({ p: [cx + Math.cos(a) * rx * d, 0.22 + rnd() * 0.18, cz + Math.sin(a) * rz * d], s: [s, s, s], c: pal[Math.floor(rnd() * pal.length)] })
      }
    }
    const k = low ? 0.8 : 1.8
    // round beds around the fountain path, beds in the inner garden, and a border along the outside walkway
    // around the fountain, either side of the path, and in front of the terrace
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; if (Math.sin(a) > 0.7 || Math.sin(a) < -0.7) continue; bed(Math.cos(a) * 5.2, 5 + Math.sin(a) * 4.6, 1.6, 1.1, 90 * k) }
    ;[-1, 1].forEach(sd => { bed(sd * 7.5, 11, 3.2, 2, 200 * k); bed(sd * 6.5, -2.4, 3.6, 1.2, 160 * k); bed(sd * 14, 6, 2.4, 3.2, 160 * k) })
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; if (Math.abs(Math.sin(a) - 1) < 0.05) continue; bed(Math.cos(a) * 30.3, Math.sin(a) * 30.3, 2, 1.2, 90 * k) }
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; if (Math.sin(a) > 0.97) continue; bed(Math.cos(a) * 40.8, Math.sin(a) * 40.8, 2.2, 0.9, 60 * k) }
    return { out, leaves }
  }, [low])
  const ref = useRef<InstancedMesh>(null), leafRef = useRef<InstancedMesh>(null)
  useInstances(ref, items.out)
  useInstances(leafRef, items.leaves)
  return (
    <>
      <instancedMesh ref={leafRef} args={[undefined, undefined, items.leaves.length]} receiveShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={ref} args={[undefined, undefined, items.out.length]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </>
  )
}

function Hedges() {
  const items = useMemo(() => {
    const out: { p: V3; s: V3; c: string }[] = []
    // a ring of clipped shrubs round the fountain, leaving the path open front and back
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + Math.PI / 12; if (Math.abs(Math.cos(a)) < 0.3) continue; const [x, , z] = polar(a, 4.6); out.push({ p: [x, 0.5, 5 + z], s: [0.55, 0.85, 0.55], c: '#3F6B34' }) }
    ;[-1, 1].forEach(s => [44, 50, 56, 62].forEach(z => out.push({ p: [s * 3, 0.7, z], s: [0.55, 1.3, 0.55], c: '#3A6630' })))
    return out
  }, [])
  const ref = useRef<InstancedMesh>(null)
  useInstances(ref, items)
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial roughness={0.95} />
    </instancedMesh>
  )
}

/** A side door in the outer gallery: arched frame on the outside wall with stone steps up to it. */
function SideDoor({ a, m }: { a: number; m: Mats }) {
  const ro = 33 + W / 2
  return (
    <group position={polar(a, ro + 0.05, 0)} rotation-y={-a + Math.PI / 2}>
      <mesh position-y={2.15} material={m.frame} castShadow><torusGeometry args={[0.95, 0.09, 8, 24, Math.PI]} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.95, 1.08, 0]} material={m.frame} castShadow><boxGeometry args={[0.16, 2.16, 0.18]} /></mesh>)}
      {[0, 1, 2].map(k => (
        <mesh key={k} position={[0, 0.1 + k * 0.17 - 0.34, 0.5 + (2 - k) * 0.38]} material={m.stone} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.34, 0.4]} />
        </mesh>
      ))}
      {/* little hedges and lamp posts either side */}
      {[-1, 1].map(s => (
        <group key={s} position={[s * 2.1, 0, 1.2]}>
          <mesh position-y={0.55} castShadow><coneGeometry args={[0.35, 1.3, 10]} /><meshStandardMaterial color="#3D6B33" roughness={0.95} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** The VIP zone: a raised stone terrace with balustrades and a staircase, a big domed pavilion and two glass wings with small domes. */
function VipPavilion({ m }: { m: Mats }) {
  const { z, y } = VIP
  const rails = useMemo(() => {
    const out: { p: V3; s: V3 }[] = []
    const run = (x0: number, z0: number, x1: number, z1: number) => {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.32)
      for (let i = 0; i <= n; i++) out.push({ p: [x0 + (x1 - x0) * i / n, y + 0.35, z0 + (z1 - z0) * i / n], s: [1, 1, 1] })
    }
    // front edge of the terrace, leaving the stairs open, and the sides
    run(-11, z + 5, -1.8, z + 5); run(1.8, z + 5, 11, z + 5)
    run(-11, z + 5, -11, z - 5); run(11, z + 5, 11, z - 5)
    return out
  }, [z, y])
  const ref = useRef<InstancedMesh>(null)
  useInstances(ref, rails)
  return (
    <group>
      {/* terrace */}
      <mesh position={[0, y / 2, z]} material={m.white} castShadow receiveShadow><boxGeometry args={[22.4, y, 10.4]} /></mesh>
      <mesh position={[0, y + 0.02, z]} rotation-x={-Math.PI / 2} material={m.stone} receiveShadow><planeGeometry args={[22, 10]} /></mesh>
      {/* balustrade: little turned balusters and a handrail */}
      <instancedMesh ref={ref} args={[undefined, undefined, rails.length]} material={m.white} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.62, 8]} />
      </instancedMesh>
      {[[-6.4, z + 5, 9.2, 0], [6.4, z + 5, 9.2, 0], [-11, z, 10, Math.PI / 2], [11, z, 10, Math.PI / 2]].map(([x, zz, len, ry], i) => (
        <mesh key={i} position={[x, y + 0.7, zz]} rotation-y={ry} material={m.white} castShadow><boxGeometry args={[len, 0.1, 0.22]} /></mesh>
      ))}
      {/* stairs down to the garden, with urns of flowers at the top */}
      {Array.from({ length: 6 }, (_, k) => (
        <mesh key={k} position={[0, y - (k + 0.5) * (y / 6), z + 5.2 + k * 0.38]} material={m.white} castShadow receiveShadow>
          <boxGeometry args={[3.6, y / 6, 0.4]} />
        </mesh>
      ))}
      {[-1, 1].map(s => (
        <group key={s} position={[s * 2.1, y, z + 5]}>
          <mesh position-y={0.35} material={m.white} castShadow><cylinderGeometry args={[0.28, 0.18, 0.7, 12]} /></mesh>
          <mesh position-y={0.85}><sphereGeometry args={[0.38, 12, 10]} /><meshStandardMaterial color="#E86E92" roughness={0.8} /></mesh>
        </group>
      ))}
      {/* main domed pavilion and its two wings */}
      <DomePavilion m={m} at={[0, z - 0.5]} r={4.2} wall={4.2} y={y} doors={[2]} />
      {[-1, 1].map(s => (
        <group key={s} position={[s * 7.2, y, z - 0.5]}>
          <Wing m={m} />
          <group position-y={3.4}>
            <mesh material={m.glass} renderOrder={2}><sphereGeometry args={[1.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} rotation-y={(i / 8) * Math.PI} material={m.frame}><torusGeometry args={[1.9, 0.045, 5, 24, Math.PI]} /></mesh>
            ))}
            <mesh position-y={2.05} material={m.frame}><coneGeometry args={[0.1, 0.5, 8]} /></mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

/** A wing of the VIP pavilion: a small glass hall with wooden posts and arched windows. */
function Wing({ m }: { m: Mats }) {
  const w = 5.2, d = 4.4, h = 3.4
  return (
    <group>
      {[[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, d / 2], [0, -d / 2]].map(([x, z], i) => (
        <mesh key={i} position={[x, h / 2, z]} material={m.frame} castShadow><boxGeometry args={[0.18, h, 0.18]} /></mesh>
      ))}
      {[[0, d / 2, w, 0], [0, -d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]].map(([x, z, len, ry], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={ry}>
          <mesh position-y={SILL / 2} material={m.frame} castShadow><boxGeometry args={[len, SILL, 0.2]} /></mesh>
          <mesh position-y={(SILL + h) / 2} material={m.glass} renderOrder={2}><planeGeometry args={[len, h - SILL]} /></mesh>
          {[-len / 4, len / 4].map(ax => <mesh key={ax} position={[ax, h - 0.9, 0.02]} material={m.frame}><torusGeometry args={[len / 4 - 0.12, 0.05, 5, 16, Math.PI]} /></mesh>)}
        </group>
      ))}
      <mesh position-y={h} material={m.frame} castShadow><boxGeometry args={[w + 0.3, 0.22, d + 0.3]} /></mesh>
      <mesh position-y={h + 0.1} rotation-x={-Math.PI / 2} material={m.glass}><planeGeometry args={[w, d]} /></mesh>
    </group>
  )
}

/** Weeping willow: a stout trunk and long drooping curtains of pale green. */
function Willow({ at }: { at: [number, number] }) {
  const strands = useMemo(() => {
    const rnd = seeded(at[0] * 31 + at[1] * 7 + 100)
    // curtains of hanging strands all round the crown, facing outwards, longer at the edge
    return Array.from({ length: 64 }, () => {
      const a = rnd() * Math.PI * 2, d = 1.2 + Math.sqrt(rnd()) * 2.2, len = 3.4 + rnd() * 2
      return { p: [Math.cos(a) * d, 6.2 - len / 2, Math.sin(a) * d] as V3, s: [1.6 + rnd(), len, 1] as V3, ry: -a + Math.PI / 2 + (rnd() - 0.5) * 0.6, c: ['#FFFFFF', '#E6F0D2', '#F2F6E4'][Math.floor(rnd() * 3)] }
    })
  }, [at])
  const ref = useRef<InstancedMesh>(null)
  const tex = useMemo(() => leafCardTexture('willow'), [])
  useInstances(ref, strands)
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position-y={2.2} castShadow><cylinderGeometry args={[0.28, 0.45, 4.4, 9]} /><meshStandardMaterial color="#5B4634" roughness={0.95} /></mesh>
      <mesh position-y={6.1} scale={[2.6, 1.0, 2.6]} castShadow><sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial color="#86A84E" roughness={0.9} /></mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, strands.length]} castShadow>
        <planeGeometry />
        <meshStandardMaterial map={tex} alphaTest={0.4} side={DoubleSide} roughness={0.85} />
      </instancedMesh>
    </group>
  )
}

// ── Camera views ──

export type View = 'aerial' | 'entrance' | 'gallery' | 'garden'
const VIEWS: Record<View, { pos: V3; target: V3 }> = {
  aerial: { pos: [0, 48, 92], target: [0, 0, 2] },
  entrance: { pos: [0, 3.4, 58], target: [0, 4, DOME.z] },
  gallery: { pos: [...polar(FRONT + 0.3, 33.6, 1.7)] as V3, target: [...polar(FRONT + 0.62, 33.6, 1.9)] as V3 },
  garden: { pos: [0, 5, 22], target: [0, 2.5, VIP.z] },
}

function CameraRig({ view }: { view: View }) {
  const { camera, controls } = useThree()
  useEffect(() => {
    const v = VIEWS[view]
    camera.position.set(...v.pos)
    const c = controls as unknown as OrbitImpl | null
    if (c) { c.target.set(...v.target); c.update() } else camera.lookAt(...v.target)
  }, [view, camera, controls])
  return null
}

/**
 * The finishing pass, in this order: ambient occlusion where things meet, a soft bloom on the glints in the glass,
 * a touch more saturation and contrast for the warm golden-hour look, ACES filmic tone mapping, a gentle vignette,
 * then SMAA to smooth the thin glazing bars. (The Canvas runs `flat`, so tone mapping happens only here.)
 */
function Grade() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={2.2} intensity={3} distanceFalloff={1} halfRes quality="medium" />
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.2} intensity={0.45} radius={0.7} />
      <HueSaturation saturation={0.16} />
      <BrightnessContrast brightness={0.01} contrast={0.1} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  )
}

// ── Scene ──

function Scene({ view, low, onReady }: { view: View; low: boolean; onReady?: () => void }) {
  const m = useMaterials(low)
  const told = useRef(false)
  useFrame(() => { if (!told.current) { told.current = true; requestAnimationFrame(() => onReady?.()) } })
  const sign = useMemo(() => signTexture('🐾 Mepawry Sanctuary 🐾', { w: 900, h: 160, bg: '#F6EFE2', fg: '#3E2A1A', font: 'italic 700 70px Georgia, serif' }), [])
  return (
    <>
      {/* Golden hour: a low warm sun from the front-left throws long soft shadows across the lawn; the sky, the haze
          and every reflection in the glass are warmed by the same sun */}
      <Sky sunPosition={SUN} turbidity={8} rayleigh={2.2} mieCoefficient={0.006} mieDirectionalG={0.88} />
      <fog attach="fog" args={['#E9DCC2', 120, 430]} />
      <hemisphereLight args={['#BCD3EE', '#4F5F2C', 0.55]} />
      <directionalLight
        position={SUN} intensity={4.2} color="#FFBF78" castShadow={!low}
        shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} shadow-normalBias={0.09} shadow-radius={4}
        shadow-camera-left={-58} shadow-camera-right={58} shadow-camera-top={58} shadow-camera-bottom={-58} shadow-camera-near={1} shadow-camera-far={260}
      />
      {/* a cool bounce from the opposite side so shadowed faces stay readable, not black */}
      <directionalLight position={[60, 25, -50]} intensity={0.35} color="#9DB7E0" />
      <Environment resolution={256} frames={1}>
        <Sky sunPosition={SUN} turbidity={8} rayleigh={2.2} mieCoefficient={0.006} mieDirectionalG={0.88} />
        <Lightformer intensity={8} color="#FFC888" position={SUN} scale={[18, 12, 1]} />
        <Lightformer intensity={0.8} color="#5E8A36" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[200, 200, 1]} />
      </Environment>

      <Ground low={low} />
      <FlattenTori>
        {RINGS.map(g => <Gallery key={g.r} {...g} m={m} />)}
      </FlattenTori>
      <DomePavilion m={m} sign={sign} at={[DOME.x, DOME.z]} r={DOME.r} wall={DOME.wall} doors={[2, 6]} />
      {SIDE_DOORS.map(a => <SideDoor key={a} a={a} m={m} />)}
      <VipPavilion m={m} />
      <group position={[0, 0, 5]}><Fountain m={m} /></group>
      <Willow at={[-11, 1]} />
      <Willow at={[12, -1]} />
      <Trees low={low} />
      <Flowers low={low} />
      <Hedges />

      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2 - 0.03} minDistance={4} maxDistance={220} autoRotate={view === 'aerial'} autoRotateSpeed={0.25} />
      <CameraRig view={view} />
      {!low && <Grade />}
    </>
  )
}

export default function SanctuaryPreview({ view, onReady }: { view: View; onReady?: () => void }) {
  const low = useQuality() === 'low'
  return (
    <Canvas
      shadows={!low ? 'soft' : false}
      flat={!low}
      dpr={[1, low ? 1.5 : 2]}
      camera={{ position: VIEWS.aerial.pos, fov: 42, near: 0.3, far: 900 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <Scene view={view} low={low} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
