'use client'
// components/3d/LiteAvatar.tsx — Other visitors' avatars, built for crowds: the same chibi look as CuteAvatar, but
// each moving part (body, head, two arms, two legs) is one merged, vertex-coloured mesh shared by every avatar of
// that look. About 8 draw calls per visitor instead of ~45, and almost no extra memory per visitor.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Matrix4, MeshStandardMaterial,
  Quaternion, SphereGeometry, TorusGeometry, Vector3, type BufferGeometry, type Group,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { nameTagTexture } from './textures'
import { contactShadowMap, microMap, withRim } from './look'

import { lookKey, type AvatarLook } from '@/lib/look'
import { lighter } from './CuteAvatar'

const SHOE = '#B88A68'

type Part = [BufferGeometry, string, [number, number, number]?, [number, number, number]?, [number, number, number]?]

/** Bakes parts (geometry, colour, position, rotation, scale) into one geometry with per-vertex colour. */
function bake(parts: Part[]): BufferGeometry {
  const out = parts.map(([g, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]]) => {
    const geo = (g.index ? g.toNonIndexed() : g.clone())
    geo.deleteAttribute('uv')
    geo.applyMatrix4(new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...scl)))
    const c = new Color(color), n = geo.attributes.position.count, arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
    geo.setAttribute('color', new BufferAttribute(arr, 3))
    g.dispose()
    return geo
  })
  const merged = mergeGeometries(out)!
  out.forEach(g => g.dispose())
  return merged
}

const S = (r: number) => new SphereGeometry(r, 14, 10)

function buildLook(lk: AvatarLook) {
  const girl = lk.gender === 'female', SKIN = lk.skin, HAIR = lk.hair, knitted = lk.top !== 'tee'
  const leg = bake(lk.bottom === 'pants' ? [
    [new CapsuleGeometry(0.085, 0.16, 4, 10), lk.bottomColor, [0, -0.13, 0]],
    [new CylinderGeometry(0.098, 0.096, 0.07, 12), lighter(lk.bottomColor, 0.35), [0, -0.26, 0]],
    [S(0.095), SHOE, [0, -0.34, 0.035], [0, 0, 0], [1, 0.62, 1.35]],
    [new CylinderGeometry(0.098, 0.098, 0.03, 12), '#F6EBDD', [0, -0.38, 0.035], [0, 0, 0], [1, 1, 1.3]],
  ] : [
    [new CapsuleGeometry(0.07, 0.14, 4, 10), SKIN, [0, -0.17, 0]],
    ...(lk.bottom === 'shorts' ? [[new CylinderGeometry(0.1, 0.105, 0.14, 12), lk.bottomColor, [0, -0.04, 0]] as Part] : []),
    [S(0.095), SHOE, [0, -0.34, 0.035], [0, 0, 0], [1, 0.62, 1.35]],
    [new CylinderGeometry(0.098, 0.098, 0.03, 12), '#F6EBDD', [0, -0.38, 0.035], [0, 0, 0], [1, 1, 1.3]],
  ])
  const body = bake([
    [new CapsuleGeometry(0.215, 0.12, 6, 14), lk.topColor, [0, 0.66, 0], [0, 0, 0], [1, 1, 0.86]],
    [new TorusGeometry(0.19, knitted ? 0.04 : 0.025, 8, 20), lk.topColor, [0, 0.44, 0], [Math.PI / 2, 0, 0], [1, 0.86, 1]],
    lk.top === 'hoodie'
      ? [new TorusGeometry(0.15, 0.065, 8, 20), lk.topColor, [0, 0.86, -0.05], [Math.PI / 2 - 0.25, 0, 0]]
      : [new TorusGeometry(0.11, 0.03, 8, 18), lighter(lk.topColor, 0.4), [0, 0.87, 0], [Math.PI / 2, 0, 0]],
    ...(lk.bottom === 'skirt' ? [[new CylinderGeometry(0.18, 0.3, 0.24, 16, 1, false), lk.bottomColor, [0, 0.45, 0]] as Part] : []),
  ])
  const arm = bake(knitted ? [
    [new CapsuleGeometry(0.078, 0.18, 4, 10), lk.topColor, [0, -0.14, 0]],
    [new CylinderGeometry(0.072, 0.072, 0.05, 10), lk.topColor, [0, -0.27, 0]],
    [S(0.072), SKIN, [0, -0.34, 0]],
  ] : [
    [new CapsuleGeometry(0.085, 0.07, 4, 10), lk.topColor, [0, -0.06, 0]],
    [new CapsuleGeometry(0.06, 0.14, 4, 10), SKIN, [0, -0.2, 0]],
    [S(0.072), SKIN, [0, -0.34, 0]],
  ])
  const head = bake([
    [new SphereGeometry(0.34, 22, 16), SKIN, [0, 0, 0], [0, 0, 0], [1, 0.94, 0.95]],
    [S(0.07), SKIN, [-0.33, -0.03, 0], [0, 0, 0], [0.5, 1, 0.8]],
    [S(0.07), SKIN, [0.33, -0.03, 0], [0, 0, 0], [0.5, 1, 0.8]],
    [new SphereGeometry(0.36, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), HAIR, [0, 0.04, -0.03], [-0.25, 0, 0]],
    [new SphereGeometry(0.34, 16, 12), HAIR, [0, -0.02, -0.1], [0, 0, 0], [1.02, 0.95, 0.85]],
    [new SphereGeometry(0.356, 20, 8, Math.PI / 2 - 1.15, 2.3, 0, 1.12), HAIR, [0, 0, 0], [0, 0, 0], [1, 0.94, 0.95]],
    ...[-1, 1].map(s => [S(0.12), HAIR, [s * 0.3, 0.03, 0.08], [0, 0, s * 0.35], [0.45, 1, 0.6]] as Part),
    ...[-0.12, 0.12].map(x => [S(0.068), '#17110F', [x, -0.04, 0.29], [0, 0, 0], [0.85, 1.1, 0.45]] as Part),
    ...[-0.12, 0.12].map(x => [S(0.02), '#FFFFFF', [x + 0.022, -0.01, 0.318]] as Part),
    ...[-0.2, 0.2].map(x => [S(0.045), '#F6A3B0', [x, -0.12, 0.25], [0, 0, 0], [1.2, 0.75, 0.35]] as Part),
    [new TorusGeometry(0.035, 0.008, 6, 10, Math.PI), '#7A3B2E', [0, -0.135, 0.3], [0.25, 0, Math.PI]],
    [new ConeGeometry(0.02, 0.12, 6), HAIR, [0.03, 0.4, 0.03], [0, 0, -0.5]],
    ...(girl ? [
      [new SphereGeometry(0.31, 16, 12), HAIR, [0, -0.16, -0.13], [0, 0, 0], [1.05, 1.3, 0.8]] as Part,
      ...[-0.28, 0.28].map(x => [new CapsuleGeometry(0.065, 0.24, 4, 8), HAIR, [x, -0.2, 0.05]] as Part),
      [S(0.05), '#FF8FB1', [0.2, 0.27, 0.1]] as Part,
    ] : []),
  ])
  return { leg, body, arm, head }
}

// One set of merged parts per distinct look, shared by everyone dressed the same (bounded by the palettes)
const looks = new Map<string, ReturnType<typeof buildLook>>()
const lookFor = (lk: AvatarLook) => { const k = lookKey(lk); if (!looks.has(k)) looks.set(k, buildLook(lk)); return looks.get(k)! }
let shared: MeshStandardMaterial | null = null
const material = () => (shared ??= withRim(new MeshStandardMaterial({ vertexColors: true, roughness: 0.75, bumpMap: microMap('fuzz'), bumpScale: 0.3 }), 0.8))

export function LiteAvatar({ name, look: lk, walking }: { name: string; look: AvatarLook; walking: React.RefObject<boolean> }) {
  const look = lookFor(lk)
  const mat = material()
  const tag = useMemo(() => nameTagTexture(`✦ ${name}`), [name])
  useEffect(() => () => tag.dispose(), [tag])
  const body = useRef<Group>(null!), head = useRef<Group>(null!)
  const armL = useRef<Group>(null!), armR = useRef<Group>(null!), legL = useRef<Group>(null!), legR = useRef<Group>(null!)
  const ph = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + ph
    const walk = walking.current
    const swing = walk ? Math.sin(t * 10) : Math.sin(t * 2)
    body.current.position.y = Math.abs(swing) * (walk ? 0.06 : 0.012) + Math.sin(t * 1.55) * 0.005
    armL.current.rotation.x = swing * (walk ? 0.7 : 0.12)
    armR.current.rotation.x = -swing * (walk ? 0.7 : 0.12)
    legL.current.rotation.x = walk ? -swing * 0.6 : 0
    legR.current.rotation.x = walk ? swing * 0.6 : 0
    head.current.rotation.y = walk ? 0 : Math.sin(t * 0.45) * 0.25
    head.current.rotation.z = Math.sin(t * 0.8) * 0.04
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} raycast={() => null}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial map={contactShadowMap()} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={body}>
        <group ref={legL} position={[-0.1, 0.4, 0]}><mesh geometry={look.leg} material={mat} /></group>
        <group ref={legR} position={[0.1, 0.4, 0]}><mesh geometry={look.leg} material={mat} /></group>
        <mesh geometry={look.body} material={mat} />
        <group ref={armL} position={[-0.24, 0.8, 0]} rotation={[0, 0, -0.22]}><mesh geometry={look.arm} material={mat} /></group>
        <group ref={armR} position={[0.24, 0.8, 0]} rotation={[0, 0, 0.22]}><mesh geometry={look.arm} material={mat} /></group>
        <group ref={head} position={[0, 1.18, 0]}><mesh geometry={look.head} material={mat} /></group>
      </group>
      <sprite position={[0, 1.82, 0]} scale={[1.32, 0.29, 1]}>
        <spriteMaterial map={tag} transparent alphaTest={0.1} depthWrite={false} />
      </sprite>
    </group>
  )
}
