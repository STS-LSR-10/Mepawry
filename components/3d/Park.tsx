'use client'
// components/3d/Park.tsx — The park in front of the memorial: paved path and plaza, a fountain, benches,
// lamp posts that glow at night, flower beds and grass that sways in the wind. Laid out from PARK in layout.ts.
// Nothing here takes taps: they fall through to the ground, which walks you there.

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending, Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, Vector2,
  type Points, type Texture,
} from 'three'
import { BBOX, PARK, inRect } from './layout'
import { glowTexture, pavingTexture, plaqueTexture, waterTexture } from './textures'
import { windify } from './wind'
import { ContactShadow, microMap, rim, withRim } from './look'
import { Sparkles } from '@react-three/drei'
import type { Season } from '@/lib/sky'

const noRay = () => null
const STONE = '#B8AD9A'
const IRON = '#2E3330'

const BLADE: Record<Season, string[]> = {
  spring: ['#6FA34E', '#7DB257', '#5E9445'], summer: ['#5C9A3C', '#4E8A34', '#6AA845'],
  autumn: ['#8C9A44', '#A39A4A', '#7A8A3C'], winter: ['#A9B8A2', '#BCC9B5', '#98A892'],
  hot: ['#8FA048', '#9DAE52', '#80923F'], rainy: ['#4E9A3E', '#43903A', '#5AA648'], cool: ['#6A9A4C', '#5E8F44', '#78A656'],
}
const FLOWERS: Record<Season, string[]> = {
  spring: ['#F7A8C4', '#FFFFFF', '#F9D65C', '#C7A6F0'], summer: ['#E8475A', '#FFB347', '#FFFFFF', '#F7A8C4'],
  autumn: ['#E3823B', '#C4512E', '#F2C14E', '#8E3B5A'], winter: ['#E8EEF5', '#C9D6E8', '#B8323C'],
  hot: ['#FF6F91', '#FFC75F', '#F9F871', '#FF9671'], rainy: ['#9B7BE8', '#FFFFFF', '#5EC8E8', '#F7A8C4'], cool: ['#F7A8C4', '#FFD27A', '#FFFFFF', '#E86F8A'],
}

function useTex(make: () => Texture, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps)
  useEffect(() => () => t.dispose(), [t])
  return t
}

export function Park({ season, night, low }: { season: Season; night: boolean; low: boolean }) {
  return (
    <group>
      <Paving />
      <Fountain low={low} />
      {PARK.benches.map((b, i) => <Bench key={i} {...b} />)}
      {PARK.lamps.map((l, i) => <Lamp key={i} x={l.x} z={l.z} night={night} low={low} />)}
      {PARK.beds.map((b, i) => <FlowerBed key={i} {...b} season={season} seed={i} />)}
      <Grass season={season} count={low ? 1800 : 6500} />
      <ParkSign />
      {/* Grounding: soft dark pools under everything that stands on the ground */}
      <ContactShadow at={[PARK.fountain.x, 0.02, PARK.fountain.z]} size={[PARK.fountain.r * 2.9, PARK.fountain.r * 2.9]} opacity={0.5} />
      {PARK.benches.map((b, i) => <ContactShadow key={i} at={[b.x, 0.025, b.z]} size={Math.abs(Math.sin(b.rot)) > 0.5 ? [1.2, 2.2] : [2.2, 1.2]} opacity={0.45} />)}
      {PARK.lamps.map((l, i) => <ContactShadow key={i} at={[l.x, 0.025, l.z]} size={[0.9, 0.9]} opacity={0.5} />)}
      {/* Atmosphere: fireflies drifting over the lawn at night, sunlit dust motes by day */}
      {night
        ? <Sparkles position={[0, 1.2, 5]} count={low ? 18 : 45} scale={[26, 2.2, 20]} size={5} speed={0.35} noise={1.5} color="#D8FF8A" opacity={0.9} />
        : <Sparkles position={[0, 1.5, 5]} count={low ? 20 : 60} scale={[24, 3, 20]} size={1.6} speed={0.12} noise={0.6} color="#FFF3D6" opacity={0.45} />}
    </group>
  )
}

/** Path, cross path and round plaza in stone pavers, edged with a kerb. */
function Paving() {
  const pav = useTex(() => pavingTexture(), [])
  const strip = (w: number, d: number) => { const t = pav.clone(); t.repeat.set(w / 2, d / 2); t.needsUpdate = true; return t }
  const main = useMemo(() => strip(PARK.path.x1 - PARK.path.x0, PARK.path.z1 - PARK.path.z0), [pav]) // eslint-disable-line react-hooks/exhaustive-deps
  const cross = useMemo(() => strip(PARK.cross.x1 - PARK.cross.x0, PARK.cross.z1 - PARK.cross.z0), [pav]) // eslint-disable-line react-hooks/exhaustive-deps
  const plaza = useMemo(() => strip(PARK.plaza.r * 2, PARK.plaza.r * 2), [pav]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { main.dispose(); cross.dispose(); plaza.dispose() }, [main, cross, plaza])
  const rect = (r: typeof PARK.path, tex: Texture, y: number) => {
    const w = r.x1 - r.x0, d = r.z1 - r.z0
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2]} receiveShadow raycast={noRay}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={2.5} roughness={0.92} roughnessMap={microMap('stone')} />
        </mesh>
        {/* kerbs along the long sides */}
        {(w > d ? [[0, r.z0], [0, r.z1]] : [[r.x0, 0], [r.x1, 0]]).map(([x, z], i) => (
          <mesh key={i} position={w > d ? [(r.x0 + r.x1) / 2, 0.03, z] : [x, 0.03, (r.z0 + r.z1) / 2]} raycast={noRay} receiveShadow>
            <boxGeometry args={w > d ? [w, 0.07, 0.12] : [0.12, 0.07, d]} />
            <meshStandardMaterial color="#9C917F" roughness={1} />
          </mesh>
        ))}
      </group>
    )
  }
  return (
    <group>
      {rect(PARK.path, main, 0.012)}
      {rect(PARK.cross, cross, 0.014)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PARK.plaza.x, 0.016, PARK.plaza.z]} receiveShadow raycast={noRay}>
        <circleGeometry args={[PARK.plaza.r, 48]} />
        <meshStandardMaterial map={plaza} bumpMap={plaza} bumpScale={2.5} roughness={0.92} roughnessMap={microMap('stone')} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PARK.plaza.x, 0.03, PARK.plaza.z]} raycast={noRay}>
        <ringGeometry args={[PARK.plaza.r, PARK.plaza.r + 0.14, 64]} />
        <meshStandardMaterial color="#9C917F" roughness={1} />
      </mesh>
    </group>
  )
}

/** Round stone basin with rippling water, a two-tier centrepiece and falling spray. */
function Fountain({ low }: { low: boolean }) {
  const f = PARK.fountain
  const water = useTex(() => waterTexture(), [])
  const spray = useRef<Points>(null)
  const N = low ? 60 : 160
  const drops = useMemo(() => {
    const pos = new Float32Array(N * 3), seed = new Float32Array(N)
    for (let i = 0; i < N; i++) seed[i] = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
    return { pos, seed }
  }, [N])
  const bowl = useMemo(() => [[0, 0], [0.75, 0.02], [0.85, 0.16], [0.8, 0.2], [0.1, 0.12]].map(([x, y]) => new Vector2(x, y)), [])
  const small = useMemo(() => [[0, 0], [0.42, 0.02], [0.48, 0.12], [0.44, 0.15], [0.06, 0.1]].map(([x, y]) => new Vector2(x, y)), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    water.offset.set(Math.sin(t * 0.2) * 0.05, t * 0.03)
    if (!spray.current) return
    const p = drops.pos
    for (let i = 0; i < N; i++) {
      // Each drop leaves the top bowl's rim, arcs out and falls into the basin, then starts again
      const sd = drops.seed[i], k = (t * (0.45 + sd * 0.25) + sd * 7) % 1, a = sd * 97.3
      const out = 0.46 + k * (0.45 + sd * 0.2)
      p[i * 3] = Math.cos(a) * out
      p[i * 3 + 1] = 1.55 + 0.25 * Math.sin(k * Math.PI) - k * k * 1.1
      p[i * 3 + 2] = Math.sin(a) * out
    }
    spray.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group position={[f.x, 0, f.z]}>
      {/* Basin wall and rim */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow raycast={noRay}>
        <cylinderGeometry args={[f.r, f.r + 0.08, 0.5, 48, 1, true]} />
        <meshStandardMaterial color={STONE} roughness={0.9} side={DoubleSide} bumpMap={microMap('stone')} bumpScale={3} onBeforeCompile={rim} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRay} castShadow>
        <torusGeometry args={[f.r, 0.11, 10, 64]} />
        <meshStandardMaterial color="#CFC5B2" roughness={0.8} bumpMap={microMap('stone')} bumpScale={2} onBeforeCompile={rim} />
      </mesh>
      {/* Water */}
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
        <circleGeometry args={[f.r - 0.02, 48]} />
        <meshStandardMaterial map={water} color="#BFE3F0" roughness={0.08} metalness={0.2} transparent opacity={0.88} />
      </mesh>
      {/* Centrepiece: column, wide bowl, small bowl, finial */}
      <mesh position={[0, 0.75, 0]} castShadow raycast={noRay}><cylinderGeometry args={[0.16, 0.24, 0.8, 16]} /><meshStandardMaterial color={STONE} roughness={0.85} /></mesh>
      <mesh position={[0, 1.12, 0]} castShadow raycast={noRay}><latheGeometry args={[bowl, 32]} /><meshStandardMaterial color="#CFC5B2" roughness={0.8} side={DoubleSide} /></mesh>
      <mesh position={[0, 1.32, 0]} raycast={noRay}><cylinderGeometry args={[0.09, 0.12, 0.3, 12]} /><meshStandardMaterial color={STONE} roughness={0.85} /></mesh>
      <mesh position={[0, 1.45, 0]} castShadow raycast={noRay}><latheGeometry args={[small, 28]} /><meshStandardMaterial color="#CFC5B2" roughness={0.8} side={DoubleSide} /></mesh>
      <mesh position={[0, 1.66, 0]} raycast={noRay}><sphereGeometry args={[0.09, 14, 12]} /><meshStandardMaterial color="#CFC5B2" roughness={0.6} /></mesh>
      {/* Water sheets spilling over the bowls */}
      {[[1.3, 0.83, 0.55], [1.56, 0.47, 0.32]].map(([y, r, h], i) => (
        <mesh key={i} position={[0, y - h / 2, 0]} raycast={noRay}>
          <cylinderGeometry args={[r, r + 0.08, h, 32, 1, true]} />
          <meshStandardMaterial map={water} color="#DDF2FA" transparent opacity={0.35} roughness={0.05} side={DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <points ref={spray} raycast={noRay}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[drops.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#E8F7FF" size={0.06} transparent opacity={0.8} depthWrite={false} />
      </points>
    </group>
  )
}

/** Wooden slat bench on cast-iron legs. rot: which way it faces. */
function Bench({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, 0.45, -0.12 + i * 0.13]} castShadow raycast={noRay}>
          <boxGeometry args={[1.6, 0.05, 0.11]} />
          <meshStandardMaterial color="#9A6A42" roughness={0.75} bumpMap={microMap('grain')} bumpScale={1.5} roughnessMap={microMap('grain')} onBeforeCompile={rim} />
        </mesh>
      ))}
      {[0, 1].map(i => (
        <mesh key={i} position={[0, 0.65 + i * 0.16, -0.22 - i * 0.03]} rotation={[-0.2, 0, 0]} castShadow raycast={noRay}>
          <boxGeometry args={[1.6, 0.11, 0.04]} />
          <meshStandardMaterial color="#9A6A42" roughness={0.75} bumpMap={microMap('grain')} bumpScale={1.5} roughnessMap={microMap('grain')} onBeforeCompile={rim} />
        </mesh>
      ))}
      {[-0.7, 0.7].map(lx => (
        <group key={lx} position={[lx, 0, 0]}>
          <mesh position={[0, 0.22, 0.12]} raycast={noRay}><boxGeometry args={[0.06, 0.44, 0.06]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} /></mesh>
          <mesh position={[0, 0.45, -0.2]} rotation={[-0.1, 0, 0]} raycast={noRay}><boxGeometry args={[0.06, 0.9, 0.06]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} /></mesh>
          <mesh position={[0, 0.58, 0]} raycast={noRay}><boxGeometry args={[0.06, 0.05, 0.42]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** Cast-iron lamp post; its lantern glows warmly at night. */
/** Cast-iron lamp post. At night its lantern glows (soft halo) and lays a warm pool of light on the ground around it
 *  — a cheap stand-in for a real light, so the park reads as lit even on phones. */
function Lamp({ x, z, night }: { x: number; z: number; night: boolean; low: boolean }) {
  const glow = useTex(() => glowTexture(), [])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.12, 0]} raycast={noRay}><cylinderGeometry args={[0.14, 0.18, 0.24, 12]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} /></mesh>
      <mesh position={[0, 1.4, 0]} castShadow raycast={noRay}><cylinderGeometry args={[0.045, 0.06, 2.6, 10]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} /></mesh>
      <group position={[0, 2.85, 0]}>
        <mesh raycast={noRay}><cylinderGeometry args={[0.13, 0.1, 0.32, 6]} />
          <meshStandardMaterial color="#FFE3A8" emissive="#FFB85C" emissiveIntensity={night ? 5 : 0.3} roughness={0.3} toneMapped={!night} />
        </mesh>
        <mesh position={[0, 0.22, 0]} raycast={noRay}><coneGeometry args={[0.2, 0.16, 6]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} /></mesh>
        {night && (
          <sprite scale={[2.4, 2.4, 1]}>
            <spriteMaterial map={glow} color="#FFB85C" transparent opacity={0.75} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
        )}
      </group>
      {night && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} raycast={noRay} renderOrder={2}>
          <planeGeometry args={[8, 8]} />
          <meshBasicMaterial map={glow} color="#FFB065" transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

/** Round bed edged in stone: leafy plants and flowers in the season's colours, swaying a little. */
function FlowerBed({ x, z, r, season, seed }: { x: number; z: number; r: number; season: Season; seed: number }) {
  const flowers = useRef<InstancedMesh>(null!)
  const leaves = useRef<InstancedMesh>(null!)
  const matF = useMemo(() => withRim(windify(new MeshStandardMaterial({ roughness: 0.6 }), 'grass', 6), 0.8), [])
  const matL = useMemo(() => withRim(windify(new MeshStandardMaterial({ color: '#4E8A3A', roughness: 0.8 }), 'grass', 3), 0.8), [])
  useEffect(() => () => { matF.dispose(); matL.dispose() }, [matF, matL])
  const NF = 70, NL = 26
  useLayoutEffect(() => {
    const o = new Object3D(), c = new Color(), cols = FLOWERS[season]
    for (let i = 0; i < NF; i++) {
      const a = i * 2.39996 + seed, d = Math.sqrt((i + 0.5) / NF) * (r - 0.2)
      o.position.set(Math.cos(a) * d, 0.32 + ((i * 7) % 5) * 0.04, Math.sin(a) * d); o.scale.setScalar(0.8 + (i % 3) * 0.2); o.updateMatrix()
      flowers.current.setMatrixAt(i, o.matrix); flowers.current.setColorAt(i, c.set(cols[(i + seed) % cols.length]))
    }
    for (let i = 0; i < NL; i++) {
      const a = i * 2.1 + seed, d = Math.sqrt((i + 0.5) / NL) * (r - 0.25)
      o.position.set(Math.cos(a) * d, 0.16, Math.sin(a) * d); o.scale.set(1.2, 0.8, 1.2); o.updateMatrix()
      leaves.current.setMatrixAt(i, o.matrix)
    }
    for (const m of [flowers.current, leaves.current]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere() }
  }, [season, seed, r])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRay} castShadow>
        <torusGeometry args={[r, 0.1, 8, 40]} />
        <meshStandardMaterial color="#A89D89" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
        <circleGeometry args={[r, 32]} />
        <meshStandardMaterial color="#4A3424" roughness={1} />
      </mesh>
      <instancedMesh ref={leaves} args={[undefined, matL, NL]} raycast={noRay} castShadow>
        <icosahedronGeometry args={[0.16, 1]} />
      </instancedMesh>
      <instancedMesh ref={flowers} args={[undefined, matF, NF]} raycast={noRay}>
        <icosahedronGeometry args={[0.06, 0]} />
      </instancedMesh>
    </group>
  )
}

/** Thousands of grass blades in one draw call, kept off the paths, plaza, fountain, beds and building. */
function Grass({ season, count }: { season: Season; count: number }) {
  const ref = useRef<InstancedMesh>(null!)
  const geo = useMemo(() => {
    const g = new PlaneGeometry(0.06, 0.38, 1, 3)
    g.translate(0, 0.19, 0)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) / 0.42)) // taper to a tip
    return g
  }, [])
  const mat = useMemo(() => withRim(windify(new MeshStandardMaterial({ roughness: 0.9, side: DoubleSide }), 'grass', 1), 0.6), [])
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  useLayoutEffect(() => {
    const o = new Object3D(), c = new Color(), cols = BLADE[season]
    let n = 0, seed = 1
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
    const clear = (x: number, z: number) =>
      !inRect({ x, z }, PARK.path, 0.15) && !inRect({ x, z }, PARK.cross, 0.15) && !inRect({ x, z }, BBOX, 0.6) &&
      Math.hypot(x - PARK.plaza.x, z - PARK.plaza.z) > PARK.plaza.r + 0.2 &&
      PARK.beds.every(b => Math.hypot(x - b.x, z - b.z) > b.r + 0.15)
    for (let tries = 0; n < count && tries < count * 4; tries++) {
      const x = (rnd() - 0.5) * 40, z = -6 + rnd() * 23
      if (!clear(x, z)) continue
      o.position.set(x, 0, z)
      o.rotation.set(0, rnd() * Math.PI, (rnd() - 0.5) * 0.3)
      o.scale.set(1, 0.7 + rnd() * 0.8, 1)
      o.updateMatrix()
      ref.current.setMatrixAt(n, o.matrix)
      ref.current.setColorAt(n, c.set(cols[n % cols.length]).multiplyScalar(0.85 + rnd() * 0.3))
      n++
    }
    ref.current.count = n
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [season, count])

  return <instancedMesh ref={ref} args={[geo, mat, count]} raycast={noRay} receiveShadow />
}

/** Low carved stone at the park's edge. */
function ParkSign() {
  const tex = useTex(() => plaqueTexture('Mepawry Memorial Park', 'stone', 800, 160), [])
  return (
    <group position={[-2.9, 0, 15]} rotation={[0, 0.25, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow raycast={noRay}>
        <boxGeometry args={[2.2, 0.7, 0.35]} />
        <meshStandardMaterial color="#A89D89" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.38, 0.18]} raycast={noRay}>
        <planeGeometry args={[2.1, 0.42]} />
        <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={2} roughness={0.95} transparent alphaTest={0.5} />
      </mesh>
    </group>
  )
}
