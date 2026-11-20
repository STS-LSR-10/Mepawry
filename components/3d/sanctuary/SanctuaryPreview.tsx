'use client'
// components/3d/sanctuary/SanctuaryPreview.tsx — Concept preview of a new building: "Mepawry Sanctuary".
// Two curved glasshouse galleries (wooden frames, barrel-vaulted glass roofs) run in rings around a garden.
// Memorial shelves line the galleries' outer walls. A glass-domed pavilion at the front is the entrance, with side
// doors and steps either side. In the middle, on a raised terrace, a domed pavilion with two wings: the VIP zone.
// It's a standalone scene to look at (orbit camera), separate from the walkable hall.

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, Sky, Stars } from '@react-three/drei'
import {
  AdditiveBlending, BufferAttribute, CanvasTexture, Color, SRGBColorSpace, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, LatheGeometry,
  MeshPhysicalMaterial, MeshStandardMaterial, Object3D, RepeatWrapping, Vector2, type BufferGeometry, type Texture,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { OrbitControls as OrbitImpl } from 'three-stdlib'
import { lawnTexture, pavingTexture, signTexture, woodTexture } from '../textures'
import { microMap } from '../look'
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useQuality } from '../quality'
import { H, LampContext, leafCardTexture, lightPoolTexture, polar, Roof, RoofContext, seeded, useInstances, useLamp, W, type V3 } from './shared'
import { GalleryInterior } from './GalleryInterior'
import { VipInterior, type VipPets } from './VipInterior'
import { EntranceHall } from './EntranceHall'

import { DOME, FOUNTAIN, FRONT, PLINTH, RINGS, SIDE_DOORS, SILL, STAIRS, VIP, VIP_BACK, VIP_DOME, VIP_WING } from './plan'

/** Glass lets taps through to whatever is behind it. */
const noRay = () => null

const SUN: V3 = [-86, 27, 58] // golden hour: low and warm, from the front-left


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

function Gallery({ r, from, to, m, demo }: { r: number; from: number; to: number; m: Mats; demo: boolean }) {
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

  // Purlins: thin wooden rails running round the vault
  const purlins = useMemo(() => [0.07, 0.17, 0.28, 0.39, 0.5, 0.61, 0.72, 0.83, 0.93].map(f => {
    const b = Math.PI * f
    return { rr: r + (W / 2) * Math.cos(b), y: H + 0.28 + (W / 2) * Math.sin(b), t: f === 0.5 ? 0.09 : 0.04 }
  }), [r])

  const refs = {
    posts: useRef<InstancedMesh>(null), ribs: useRef<InstancedMesh>(null), panes: useRef<InstancedMesh>(null),
    sills: useRef<InstancedMesh>(null), vaults: useRef<InstancedMesh>(null),
    plinths: useRef<InstancedMesh>(null), beams: useRef<InstancedMesh>(null), arches: useRef<InstancedMesh>(null),
    mullions: useRef<InstancedMesh>(null), transoms: useRef<InstancedMesh>(null),
  }
  useInstances(refs.posts, posts)
  useInstances(refs.ribs, ribs)
  useInstances(refs.panes, panes)
  useInstances(refs.sills, sills)
  useInstances(refs.vaults, vaults)
  useInstances(refs.mullions, mullions)
  useInstances(refs.transoms, transoms)
  useInstances(refs.plinths, plinths)
  useInstances(refs.beams, beams)
  useInstances(refs.arches, arches)

  return (
    <group>
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
      <Roof>
        <instancedMesh ref={refs.ribs} args={[undefined, undefined, ribs.length]} material={m.frame} castShadow>
          <torusGeometry args={[W / 2, 0.08, 6, 32, Math.PI]} />
        </instancedMesh>
      </Roof>
      <instancedMesh ref={refs.sills} args={[undefined, undefined, sills.length]} material={m.frame} castShadow receiveShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.mullions} args={[undefined, undefined, mullions.length]} material={m.frame} castShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={refs.transoms} args={[undefined, undefined, transoms.length]} material={m.frame}>
        <boxGeometry />
      </instancedMesh>
      <GalleryInterior r={r} angles={angles} step={step} twoSided m={m} demo={demo} />
      <instancedMesh ref={refs.panes} args={[undefined, undefined, panes.length]} material={m.glass} raycast={noRay} renderOrder={2}>
        <planeGeometry />
      </instancedMesh>
      <Roof>
      <instancedMesh ref={refs.vaults} args={[vaultGeo, m.glass, vaults.length]} renderOrder={2} raycast={noRay} />
      {purlins.map(({ rr, y, t }, i) => (
        <mesh key={i} position-y={y} rotation-y={-from} material={m.frame} castShadow={t > 0.05}>
          <torusGeometry args={[rr, t, 5, 200, len]} />
        </mesh>
      ))}
      {/* Gable ends where the ring opens: a wooden arch with glass */}
      {[from, to].map(a => (
        <group key={a} position={polar(a, r, 0)} rotation-y={-a}>
          {r < 30 && ( // the outer gallery's ends open straight into the reception dome
            <mesh position-y={H + 0.28} rotation-y={Math.PI / 2} material={m.glass} raycast={noRay} renderOrder={2}>
              <circleGeometry args={[W / 2, 28, 0, Math.PI]} />
            </mesh>
          )}
          <mesh position-y={H + 0.28} rotation-y={Math.PI / 2} material={m.frame} castShadow>
            <torusGeometry args={[W / 2, 0.11, 6, 28, Math.PI]} />
          </mesh>
          <mesh position-y={H} rotation-y={Math.PI / 2} material={m.frame}>
            <boxGeometry args={[W, 0.14, 0.14]} />
          </mesh>
        </group>
      ))}
      </Roof>
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
              <mesh position-y={isDoor ? wall - 0.55 : SILL + (wall - SILL) / 2} material={m.glass} raycast={noRay} renderOrder={2}>
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
      <Roof>
      <mesh position-y={wall} material={m.glass} raycast={noRay} renderOrder={2}><sphereGeometry args={[r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
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
        <mesh position-y={0.55} material={m.glass} raycast={noRay}><cylinderGeometry args={[1.05, 1.15, 1.0, 8]} /></mesh>
        <mesh position-y={1.1} material={m.frame} castShadow><sphereGeometry args={[1.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position-y={2.4} material={m.frame}><coneGeometry args={[0.12, 0.6, 8]} /></mesh>
        <mesh position-y={2.1} material={m.frame}><sphereGeometry args={[0.16, 12, 8]} /></mesh>
      </group>
      </Roof>
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
  const round = useMemo(() => { const t = paving.clone(); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(6, 6); t.needsUpdate = true; return t }, [paving])
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
      {/* a paved walkway right round the fountain */}
      <mesh rotation-x={-Math.PI / 2} position={[FOUNTAIN.x, 0.018, FOUNTAIN.z]} receiveShadow>
        <ringGeometry args={[FOUNTAIN.r + 0.05, FOUNTAIN.r + 1.7, 64]} />
        <meshStandardMaterial map={round} color="#EBD2AE" roughness={0.9} />
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

function Fountain({ m, low }: { m: Mats; low: boolean }) {
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
      <FountainWater low={low} />
    </group>
  )
}

/**
 * The moving water: a jet shooting up from the top and falling back into the upper bowl, a curtain of drops
 * spilling over the bowl's rim, eight little arcs leaping in from the basin's edge, and rings spreading on the water.
 * Plain ballistic droplets (one Points draw call), restarted as they land.
 */
function FountainWater({ low }: { low: boolean }) {
  const n = low ? 360 : 900
  const sim = useMemo(() => {
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), kind = new Uint8Array(n)
    const spawn = (i: number) => {
      const k = kind[i], a = Math.random() * Math.PI * 2
      if (k === 0) { // the jet
        pos.set([0, 2.35, 0], i * 3)
        const s = 0.18 + Math.random() * 0.12
        vel.set([Math.cos(a) * s, 4.2 + Math.random() * 0.6, Math.sin(a) * s], i * 3)
      } else if (k === 1) { // over the rim of the upper bowl
        pos.set([Math.cos(a) * 1.38, 1.74, Math.sin(a) * 1.38], i * 3)
        vel.set([Math.cos(a) * 0.35, -0.2 - Math.random() * 0.3, Math.sin(a) * 0.35], i * 3)
      } else { // arcs from the basin edge, eight of them
        const j = Math.floor(Math.random() * 8), b = (j / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.05
        pos.set([Math.cos(b) * 2.75, 0.55, Math.sin(b) * 2.75], i * 3)
        vel.set([-Math.cos(b) * 1.55, 2.6 + Math.random() * 0.25, -Math.sin(b) * 1.55], i * 3)
      }
    }
    for (let i = 0; i < n; i++) {
      kind[i] = i < n * 0.4 ? 0 : i < n * 0.75 ? 1 : 2
      spawn(i)
      // spread them out in time so the streams are full from the start
      const t = Math.random() * 1.2
      for (let c = 0; c < 3; c++) pos[i * 3 + c] += vel[i * 3 + c] * t
      pos[i * 3 + 1] -= 4.9 * t * t
      vel[i * 3 + 1] -= 9.8 * t
    }
    return { pos, vel, kind, spawn }
  }, [n])
  const geo = useRef<import('three').BufferGeometry>(null)
  const ripples = useRef<(import('three').Mesh | null)[]>([])
  useFrame(({ clock }, dt) => {
    const h = Math.min(dt, 0.05), { pos, vel, kind, spawn } = sim
    for (let i = 0; i < n; i++) {
      const o = i * 3
      vel[o + 1] -= 9.8 * h
      pos[o] += vel[o] * h; pos[o + 1] += vel[o + 1] * h; pos[o + 2] += vel[o + 2] * h
      const floor = kind[i] === 0 && Math.hypot(pos[o], pos[o + 2]) < 1.3 ? 1.72 : 0.5
      if (pos[o + 1] < floor && vel[o + 1] < 0) spawn(i)
    }
    const attr = geo.current?.getAttribute('position')
    if (attr) attr.needsUpdate = true
    // rings spreading where the water lands, one after another
    ripples.current.forEach((m, k) => {
      if (!m) return
      const f = (clock.elapsedTime * 0.45 + k / 3) % 1
      m.scale.setScalar(0.4 + f * 2.4)
      ;(m.material as import('three').MeshBasicMaterial).opacity = 0.35 * (1 - f)
    })
  })
  return (
    <group raycast={() => null}>
      <points raycast={() => null}>
        <bufferGeometry ref={geo}>
          <bufferAttribute attach="attributes-position" args={[sim.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#EAF8FF" size={0.07} transparent opacity={0.8} depthWrite={false} />
      </points>
      {[0, 1, 2].map(k => (
        <mesh key={k} ref={el => { ripples.current[k] = el }} rotation-x={-Math.PI / 2} position-y={0.5} raycast={() => null}>
          <ringGeometry args={[0.95, 1, 48]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Lamp posts along the garden paths: down both sides of the central path, round the fountain walkway and along
 * the two ring walks. They light up (glowing heads, warm pools on the ground) as the evening comes on.
 */
function GardenLamps({ low }: { low: boolean }) {
  const lamp = useLamp()
  const spots = useMemo(() => {
    const out: V3[] = []
    // the central path, entrance to terrace stairs, either side (clear of the fountain walkway)
    for (const z of [11, 15, 19, 23]) for (const s of [-1, 1]) out.push([s * 2.15, 0, z]) // the reception dome starts at z ≈ 27
    for (const s of [-1, 1]) out.push([s * 2.15, 0, STAIRS.z1 + 0.7])                  // at the foot of the terrace stairs
    // round the fountain walkway, leaving the path ends open
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; out.push([FOUNTAIN.x + Math.cos(a) * (FOUNTAIN.r + 2.05), 0, FOUNTAIN.z + Math.sin(a) * (FOUNTAIN.r + 2.05)]) }
    // the walk between the galleries and the one round the outside
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 + 0.08; if (Math.abs(Math.atan2(Math.sin(a - FRONT), Math.cos(a - FRONT))) < 0.18) continue; out.push(polar(a, 28.0)) }
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2 + 0.05; if (Math.abs(Math.atan2(Math.sin(a - FRONT), Math.cos(a - FRONT))) < 0.1) continue; out.push(polar(a, 40.1)) }
    return out
  }, [])
  const posts = useMemo(() => spots.map(p => ({ p: [p[0], 1.1, p[2]] as V3 })), [spots])
  const heads = useMemo(() => spots.map(p => ({ p: [p[0], 2.3, p[2]] as V3 })), [spots])
  const caps = useMemo(() => spots.map(p => ({ p: [p[0], 2.58, p[2]] as V3 })), [spots])
  const pools = useMemo(() => spots.map(p => ({ p: [p[0], 0.03, p[2]] as V3, rx: -Math.PI / 2, s: [4.2, 4.2, 1] as V3 })), [spots])
  const refs = { posts: useRef<InstancedMesh>(null), heads: useRef<InstancedMesh>(null), caps: useRef<InstancedMesh>(null), pools: useRef<InstancedMesh>(null) }
  useInstances(refs.posts, posts); useInstances(refs.heads, heads); useInstances(refs.caps, caps); useInstances(refs.pools, pools)
  const glass = useMemo(() => new MeshStandardMaterial({ color: '#FFE7B8', emissive: '#FFB45A', roughness: 0.4 }), [])
  useEffect(() => { glass.emissiveIntensity = 0.15 + 4 * lamp }, [glass, lamp])
  const pool = useMemo(lightPoolTexture, [])
  const noRay = () => null
  return (
    <group>
      <instancedMesh ref={refs.posts} args={[undefined, undefined, posts.length]} castShadow={!low} raycast={noRay}>
        <cylinderGeometry args={[0.045, 0.07, 2.2, 8]} />
        <meshStandardMaterial color="#2E2A26" roughness={0.5} metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={refs.heads} args={[undefined, undefined, heads.length]} material={glass} raycast={noRay}>
        <cylinderGeometry args={[0.13, 0.1, 0.36, 6]} />
      </instancedMesh>
      <instancedMesh ref={refs.caps} args={[undefined, undefined, caps.length]} raycast={noRay}>
        <coneGeometry args={[0.2, 0.2, 6]} />
        <meshStandardMaterial color="#2E2A26" roughness={0.5} metalness={0.6} />
      </instancedMesh>
      {/* always mounted (so it's placed from the start), shown once the lamps are on */}
      <instancedMesh ref={refs.pools} args={[undefined, undefined, pools.length]} raycast={noRay} visible={lamp > 0}>
        <planeGeometry />
        <meshBasicMaterial map={pool} transparent opacity={0.9 * lamp} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
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
    // round beds around the fountain path, beds in the inner garden, and a border along the outside walkway (none
    // inside the galleries)
    // around the fountain, either side of the path, and in front of the terrace
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; if (Math.sin(a) > 0.7 || Math.sin(a) < -0.7) continue; bed(Math.cos(a) * 7.2, 5 + Math.sin(a) * 6.6, 1.5, 1.0, 90 * k) }
    ;[-1, 1].forEach(sd => { bed(sd * 7.5, 11, 3.2, 2, 200 * k); bed(sd * 6.5, -2.4, 3.6, 1.2, 160 * k); bed(sd * 13, 5.5, 2.2, 2.8, 150 * k) })
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
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + Math.PI / 12; if (Math.abs(Math.cos(a)) < 0.3) continue; const [x, , z] = polar(a, 6.1); out.push({ p: [x, 0.5, 5 + z], s: [0.55, 0.85, 0.55], c: '#3F6B34' }) }
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
function VipPavilion({ m, vip }: { m: Mats; vip?: VipPets }) {
  const { z, y } = VIP
  const rails = useMemo(() => {
    const out: { p: V3; s: V3 }[] = []
    const run = (x0: number, z0: number, x1: number, z1: number) => {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.32)
      for (let i = 0; i <= n; i++) out.push({ p: [x0 + (x1 - x0) * i / n, y + 0.35, z0 + (z1 - z0) * i / n], s: [1, 1, 1] })
    }
    // front edge of the terrace, leaving the stairs open, and the sides
    run(-11, z + 5, -1.8, z + 5); run(1.8, z + 5, 11, z + 5)
    run(-11, z + 5, -11, z - 6.6); run(11, z + 5, 11, z - 6.6)
    return out
  }, [z, y])
  const ref = useRef<InstancedMesh>(null)
  useInstances(ref, rails)
  return (
    <group>
      {/* terrace */}
      <mesh position={[0, y / 2, z - 0.8]} material={m.white} castShadow receiveShadow><boxGeometry args={[22.4, y, 12]} /></mesh>
      <mesh position={[0, y + 0.02, z - 0.8]} rotation-x={-Math.PI / 2} material={m.stone} receiveShadow><planeGeometry args={[22, 11.6]} /></mesh>
      {/* balustrade: little turned balusters and a handrail */}
      <instancedMesh ref={ref} args={[undefined, undefined, rails.length]} material={m.white} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.62, 8]} />
      </instancedMesh>
      {[[-6.4, z + 5, 9.2, 0], [6.4, z + 5, 9.2, 0], [-11, z - 0.8, 11.6, Math.PI / 2], [11, z - 0.8, 11.6, Math.PI / 2]].map(([x, zz, len, ry], i) => (
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
      {/* doors: the front, and arched doorways left and right into the wings */}
      <DomePavilion m={m} at={[0, z - VIP_BACK]} r={VIP_DOME.r} wall={VIP_DOME.wall} y={y} doors={[0, 2, 4]} />
      <VipInterior y={y} z={z - VIP_BACK} vip={vip} />
      {[-1, 1].map(s => (
        <group key={s} position={[s * VIP_WING.x, y, z - VIP_BACK]}>
          <Wing m={m} open={-s as 1 | -1} />
          <Roof><group position-y={3.4}>
            <mesh material={m.glass} raycast={noRay} renderOrder={2}><sphereGeometry args={[1.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} rotation-y={(i / 8) * Math.PI} material={m.frame}><torusGeometry args={[1.9, 0.045, 5, 24, Math.PI]} /></mesh>
            ))}
            <mesh position-y={2.05} material={m.frame}><coneGeometry args={[0.1, 0.5, 8]} /></mesh>
          </group></Roof>
        </group>
      ))}
    </group>
  )
}

/** A wing of the VIP pavilion: a small glass hall with wooden posts and arched windows; the end facing the domed
 *  hall (`open`: which way along x that is) has an arched doorway. */
function Wing({ m, open }: { m: Mats; open: 1 | -1 }) {
  const w = 5.2, d = 4.4, h = 3.4
  return (
    <group>
      {[[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, d / 2], [0, -d / 2]].map(([x, z], i) => (
        <mesh key={i} position={[x, h / 2, z]} material={m.frame} castShadow><boxGeometry args={[0.18, h, 0.18]} /></mesh>
      ))}
      {[[0, d / 2, w, 0], [0, -d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]].filter(([x]) => x !== (open * w) / 2).map(([x, z, len, ry], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={ry}>
          <mesh position-y={SILL / 2} material={m.frame} castShadow><boxGeometry args={[len, SILL, 0.2]} /></mesh>
          <mesh position-y={(SILL + h) / 2} material={m.glass} raycast={noRay} renderOrder={2}><planeGeometry args={[len, h - SILL]} /></mesh>
          {[-len / 4, len / 4].map(ax => <mesh key={ax} position={[ax, h - 0.9, 0.02]} material={m.frame}><torusGeometry args={[len / 4 - 0.12, 0.05, 5, 16, Math.PI]} /></mesh>)}
        </group>
      ))}
      {/* the end towards the hall: an arched doorway with glass above it */}
      <group position={[(open * w) / 2, 0, 0]} rotation-y={Math.PI / 2}>
        {[-1, 1].map(k => <mesh key={k} position={[k * (d / 4 + 0.53), SILL / 2, 0]} material={m.frame} castShadow><boxGeometry args={[d / 2 - 1.06, SILL, 0.2]} /></mesh>)}
        {[-1, 1].map(k => <mesh key={k} position={[k * (d / 4 + 0.53), (SILL + h) / 2, 0]} material={m.glass} raycast={noRay} renderOrder={2}><planeGeometry args={[d / 2 - 1.06, h - SILL]} /></mesh>)}
        <mesh position-y={(2.3 + h) / 2} material={m.glass} raycast={noRay} renderOrder={2}><planeGeometry args={[2.1, h - 2.3]} /></mesh>
        <mesh position-y={2.3} material={m.frame} castShadow><torusGeometry args={[1.05, 0.1, 8, 24, Math.PI]} /></mesh>
        {[-1, 1].map(k => <mesh key={k} position={[k * 1.05, 1.15, 0]} material={m.frame} castShadow><boxGeometry args={[0.2, 2.3, 0.2]} /></mesh>)}
      </group>
      <mesh position-y={h} material={m.frame} castShadow><boxGeometry args={[w + 0.3, 0.22, d + 0.3]} /></mesh>
      <Roof><mesh position-y={h + 0.1} rotation-x={-Math.PI / 2} material={m.glass} raycast={noRay}><planeGeometry args={[w, d]} /></mesh></Roof>
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

export type View = 'aerial' | 'entrance' | 'lobby' | 'gallery' | 'shelf' | 'garden' | 'vip'
const VIEWS: Record<View, { pos: V3; target: V3 }> = {
  aerial: { pos: [0, 48, 92], target: [0, 0, 2] },
  entrance: { pos: [0, 3.4, 58], target: [0, 4, DOME.z] },
  gallery: { pos: [...polar(FRONT + 0.28, 33, 1.65)] as V3, target: [...polar(FRONT + 0.5, 33, 1.75)] as V3 },
  garden: { pos: [0, 5, 22], target: [0, 2.5, VIP.z] },
  vip: { pos: [2.2, VIP.y + 3.0, VIP.z - VIP_BACK + 4.7], target: [-0.6, VIP.y + 0.9, VIP.z - VIP_BACK - 2.2] },
  lobby: { pos: [1.2, 2.4, DOME.z + 4.9], target: [-0.3, 1.1, DOME.z - 2.5] },
  shelf: { pos: [...polar(FRONT + 0.4, 33.4, 1.75)] as V3, target: [...polar(FRONT + 0.4, 36, 1.55)] as V3 },
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
function Grade({ interior, night, day }: { interior: boolean; night: boolean; day: boolean }) {
  // Indoors: tighter, deeper contact shadows, a little darker and more contrast, a firmer vignette — a lit room, not
  // a floodlit stage. Outdoors keeps the open golden-hour look.
  return (
    <EffectComposer multisampling={0}>
      {/* indoors a small radius, so AO darkens corners and joins, not the whole inside of every cubby; gentler at night,
          when the lamps light those insides */}
      <N8AO aoRadius={interior ? 0.45 : 2.2} intensity={interior ? (night ? 1.6 : 3.2) : 3} distanceFalloff={1} halfRes quality="medium" />
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.2} intensity={0.45} radius={0.7} />
      <HueSaturation saturation={interior ? 0.1 : 0.16} />
      {/* indoors by day: a touch darker and punchier; at night no darkening and less contrast, or the lamp-lit
          shadows crush to black */}
      <BrightnessContrast brightness={interior ? (night ? 0.03 : day ? 0 : -0.05) : 0.01} contrast={interior ? (night ? 0.04 : 0.14) : 0.1} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={interior ? 0.6 : 0.42} />
      <SMAA />
    </EffectComposer>
  )
}

export type TimeOfDay = 'day' | 'evening' | 'night'

/**
 * Light for each time of day. By day the sun does all the work and the lamps are off; in the evening a low golden
 * sun and the lamps coming on; at night faint moonlight, stars, and every lamp lit. `inside` is for indoor views.
 */
const TIMES: Record<TimeOfDay, {
  sun: V3; color: string; intensity: number; bounce: number; sky: [number, number, number]; envSun: number
  fog: [string, number, number]; hemi: [string, string, number]; env: number; lamp: number
  /** indoors: fill strength and colour (warm at night, as if from the lamps), sky reflections */
  inside: { hemi: number; env: number; sky?: string; ground?: string }
  /** where the sky draws its sun (below the horizon at night, so the sky goes dark) */
  skySun?: V3
}> = {
  day: {
    sun: [-45, 88, 55], color: '#FFF3DE', intensity: 3.3, bounce: 0.4, sky: [5, 1.0, 0.004], envSun: 6,
    fog: ['#D9E4E6', 170, 520], hemi: ['#C8DCF2', '#55663A', 0.6], env: 1, inside: { hemi: 0.8, env: 0.65, sky: '#F2E6D2', ground: '#7A6650' }, lamp: 0,
  },
  evening: {
    sun: SUN, color: '#FFBF78', intensity: 4.2, bounce: 0.35, sky: [8, 2.2, 0.006], envSun: 8,
    fog: ['#E9DCC2', 120, 430], hemi: ['#BCD3EE', '#4F5F2C', 0.55], env: 1, inside: { hemi: 0.45, env: 0.32, sky: '#E8C49A', ground: '#4A3624' }, lamp: 0.75,
  },
  night: {
    sun: [50, 60, -40], color: '#9FB4E8', intensity: 0.45, bounce: 0.05, sky: [2, 0.4, 0.002], envSun: 0.6,
    fog: ['#121826', 80, 380], hemi: ['#34446E', '#151810', 0.16], env: 0.22, inside: { hemi: 1.0, env: 0.14, sky: '#E0A468', ground: '#4A3220' }, lamp: 1,
    skySun: [0, -25, -100],
  },
}

/** Indoor views: the rooms take their light from the sun through the glass and their own lamps, not the open sky. */
const INTERIOR_VIEWS: View[] = ['lobby', 'gallery', 'shelf', 'vip']

/** How strongly the sky reflections light the scene (lower indoors). */
function EnvStrength({ value }: { value: number }) {
  const scene = useThree(s => s.scene)
  useEffect(() => { scene.environmentIntensity = value }, [scene, value])
  return null
}

// ── Scene ──

/**
 * The whole sanctuary — sky and light for the time of day, the grounds, the galleries, the reception, the VIP pavilion
 * and the finishing pass — for the concept preview and for the walkable hall. `children` (the real pets, the
 * avatars) sit inside it and share its lamps. `demo` fills the cubbies with sample portraits.
 */
export function SanctuaryWorld({ time, interior: inRoom, cutaway = false, low, demo = false, vip, onFloor, children }: {
  time: TimeOfDay; interior: boolean; low: boolean; demo?: boolean; vip?: VipPets
  /** roofs off (you're indoors in the walkable hall): the rooms are lit by the open sky, like outside */
  cutaway?: boolean
  /** a tap on the floor, the grounds or the building: walk there */
  onFloor?: (p: { x: number; z: number }) => void
  children?: React.ReactNode
}) {
  const t = TIMES[time]
  const interior = inRoom && !cutaway
  const lampFill = inRoom && cutaway && t.lamp > 0
  const m = useMaterials(low)
  const sign = useMemo(() => signTexture('🐾 Mepawry Sanctuary 🐾', { w: 900, h: 160, bg: '#F6EFE2', fg: '#3E2A1A', font: 'italic 700 70px Georgia, serif' }), [])
  return (
    <>
      {/* The sun (or moon), the sky, the haze and every reflection in the glass all follow the time of day */}
      <Sky sunPosition={t.skySun ?? t.sun} turbidity={t.sky[0]} rayleigh={t.sky[1]} mieCoefficient={t.sky[2]} mieDirectionalG={0.88} />
      {time === 'night' && <Stars radius={260} depth={60} count={low ? 1200 : 2500} factor={5} fade speed={0.3} />}
      <fog attach="fog" args={t.fog} />
      {/* indoors after dark the rooms are filled by their own lamps, roof or no roof */}
      <hemisphereLight key={`${time}${interior}${lampFill}`} args={interior || lampFill ? [t.inside.sky ?? t.hemi[0], t.inside.ground ?? t.hemi[1], t.inside.hemi] : t.hemi} />
      <EnvStrength value={interior ? t.inside.env : t.env} />
      <directionalLight
        position={t.sun} intensity={t.intensity} color={t.color} castShadow={!low}
        shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} shadow-normalBias={0.09} shadow-radius={4}
        shadow-camera-left={-58} shadow-camera-right={58} shadow-camera-top={58} shadow-camera-bottom={-58} shadow-camera-near={1} shadow-camera-far={260}
      />
      {/* a cool bounce from the opposite side so shadowed faces stay readable, not black */}
      <directionalLight position={[60, 25, -50]} intensity={t.bounce} color="#9DB7E0" />
      <Environment key={time} resolution={256} frames={1}>
        <Sky sunPosition={t.skySun ?? t.sun} turbidity={t.sky[0]} rayleigh={t.sky[1]} mieCoefficient={t.sky[2]} mieDirectionalG={0.88} />
        <Lightformer intensity={t.envSun} color={t.color} position={t.sun} scale={[18, 12, 1]} />
        <Lightformer intensity={time === 'night' ? 0.1 : 0.8} color="#5E8A36" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[200, 200, 1]} />
      </Environment>

      <LampContext.Provider value={t.lamp}>
      <RoofContext.Provider value={!cutaway}>
      <group onClick={onFloor && (e => { if (e.delta < 6) { e.stopPropagation(); onFloor({ x: e.point.x, z: e.point.z }) } })}>
        <Ground low={low} />
        <FlattenTori>
          {RINGS.map(g => <Gallery key={g.r} {...g} m={m} demo={demo} />)}
        </FlattenTori>
        <DomePavilion m={m} sign={sign} at={[DOME.x, DOME.z]} r={DOME.r} wall={DOME.wall} doors={[0, 2, 4, 6]} />
        <EntranceHall at={[DOME.x, DOME.z]} r={DOME.r} />
        {SIDE_DOORS.map(a => <SideDoor key={a} a={a} m={m} />)}
        <VipPavilion m={m} vip={vip} />
        <group position={[FOUNTAIN.x, 0, FOUNTAIN.z]}><Fountain m={m} low={low} /></group>
        <GardenLamps low={low} />
        <Willow at={[-11, 1]} />
        <Willow at={[12, -1]} />
        <Trees low={low} />
        <Flowers low={low} />
        <Hedges />
      </group>
        {children}
      </RoofContext.Provider>
      </LampContext.Provider>
      {!low && <Grade interior={interior} night={time === 'night'} day={time === 'day'} />}
    </>
  )
}

function Scene({ view, time, low, onReady }: { view: View; time: TimeOfDay; low: boolean; onReady?: () => void }) {
  const told = useRef(false)
  useFrame(() => { if (!told.current) { told.current = true; requestAnimationFrame(() => onReady?.()) } })
  return (
    <SanctuaryWorld time={time} interior={INTERIOR_VIEWS.includes(view)} low={low} demo>
      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2 - 0.03} minDistance={4} maxDistance={220} autoRotate={view === 'aerial'} autoRotateSpeed={0.25} />
      <CameraRig view={view} />
    </SanctuaryWorld>
  )
}

export default function SanctuaryPreview({ view, time = 'evening', onReady }: { view: View; time?: TimeOfDay; onReady?: () => void }) {
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
        <Scene view={view} time={time} low={low} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
