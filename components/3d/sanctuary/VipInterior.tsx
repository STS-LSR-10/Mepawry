'use client'
// components/3d/sanctuary/VipInterior.tsx — Inside the VIP pavilion on the terrace.
// The domed hall: a radial marble floor, a small marble fountain crowned with flowers in the middle, velvet benches
// round it, a brass-and-crystal chandelier under the dome, and an arched VIP niche on every wall that isn't a doorway.
// Each wing: VIP niches along its walls, a velvet bench and a smaller chandelier.
// A VIP niche is a deep arched alcove: a velvet back, a gilded arch, a console with a large gilt-framed portrait on
// an easel, a brass nameplate, two candles and a vase of roses.

import { useMemo } from 'react'
import { CanvasTexture, LatheGeometry, MeshStandardMaterial, SRGBColorSpace, Vector2, type Texture } from 'three'
import { portraitTexture } from './GalleryInterior'
import { polar, seeded, type V3 } from './shared'

const WING = { w: 5.2, d: 4.4 }

function useVipMaterials() {
  return useMemo(() => ({
    gilt: new MeshStandardMaterial({ color: '#C2A060', roughness: 0.34, metalness: 0.8 }),
    velvet: new MeshStandardMaterial({ color: '#4A1420', roughness: 1 }),
    velvetSeat: new MeshStandardMaterial({ color: '#5C1A28', roughness: 0.95 }),
    marbleWhite: new MeshStandardMaterial({ color: '#F2EEE7', roughness: 0.2 }),
    walnut: new MeshStandardMaterial({ color: '#5A3420', roughness: 0.4 }),
    mat: new MeshStandardMaterial({ color: '#F7F1E6', roughness: 0.8 }),
    wax: new MeshStandardMaterial({ color: '#F8EEDC', roughness: 0.6, emissive: '#FFB866', emissiveIntensity: 0.4 }),
    flame: new MeshStandardMaterial({ color: '#FFE0A0', emissive: '#FFB040', emissiveIntensity: 9, toneMapped: false }),
    crystal: new MeshStandardMaterial({ color: '#FFF4DE', emissive: '#FFD9A0', emissiveIntensity: 4, toneMapped: false }),
    rose: new MeshStandardMaterial({ color: '#E8879E', roughness: 0.7 }),
    roseWhite: new MeshStandardMaterial({ color: '#FBF3EE', roughness: 0.7 }),
    leaf: new MeshStandardMaterial({ color: '#4E7A3A', roughness: 0.9 }),
    water: new MeshStandardMaterial({ color: '#7FC0D2', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 }),
  }), [])
}
type VMats = ReturnType<typeof useVipMaterials>

/** A marble floor with a gilt compass rose: rings and rays from the centre. */
function radialMarble() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#EEE9E1'; g.fillRect(0, 0, 512, 512)
  const rnd = seeded(5)
  for (let i = 0; i < 20; i++) { // soft veins
    g.strokeStyle = `rgba(110,110,118,${0.1 + rnd() * 0.15})`; g.lineWidth = 0.8 + rnd() * 1.5
    g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y)
    for (let k = 0; k < 12; k++) { x += (rnd() - 0.4) * 50; y += (rnd() - 0.5) * 50; g.lineTo(x, y) }
    g.stroke()
  }
  g.translate(256, 256)
  ;[[230, '#B48A4A', 6], [150, '#B48A4A', 4], [60, '#8C5A3A', 5]].forEach(([r, col, w]) => { g.strokeStyle = col as string; g.lineWidth = w as number; g.beginPath(); g.arc(0, 0, r as number, 0, Math.PI * 2); g.stroke() })
  for (let i = 0; i < 16; i++) { // the star
    const a = (i / 16) * Math.PI * 2, long = i % 2 === 0
    g.fillStyle = long ? 'rgba(180,138,74,.85)' : 'rgba(140,90,58,.7)'
    g.beginPath(); g.moveTo(Math.cos(a - 0.06) * 60, Math.sin(a - 0.06) * 60); g.lineTo(Math.cos(a) * (long ? 228 : 150), Math.sin(a) * (long ? 228 : 150)); g.lineTo(Math.cos(a + 0.06) * 60, Math.sin(a + 0.06) * 60); g.fill()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function plaqueTexture(name: string) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 64
  const g = c.getContext('2d')!
  const gr = g.createLinearGradient(0, 0, 0, 64)
  gr.addColorStop(0, '#E6C67E'); gr.addColorStop(1, '#B48A44')
  g.fillStyle = gr; g.fillRect(0, 0, 256, 64)
  g.fillStyle = '#3A2410'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 700 30px Georgia, serif'
  g.fillText(name, 128, 34)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

const NAMES = ['Mochi', 'Bella', 'Max', 'Luna', 'Coco', 'Milo', 'Daisy', 'Leo', 'Nala', 'Oscar', 'Kiki', 'Toby', 'Bun', 'Ginger', 'Pepper', 'Sunny']

/** A posy of roses: a few spheres in pink and white on a little green mound. */
function Roses({ at, r = 0.12, m }: { at: V3; r?: number; m: VMats }) {
  const buds = useMemo(() => {
    const rnd = seeded((at[0] * 31 + at[1] * 17 + at[2] * 7) * 100)
    const n = Math.round(9 + r * r * 900)
    return Array.from({ length: n }, () => {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r
      const bs = Math.min(0.06, r * 0.32) * (0.8 + rnd() * 0.5)
      return { p: [Math.cos(a) * d, r * 0.36 * Math.sqrt(1 - (d / r) ** 2) + bs * 0.7, Math.sin(a) * d] as V3, s: bs, white: rnd() < 0.35 }
    })
  }, [at, r])
  return (
    <group position={at}>
      <mesh scale={[r * 1.02, r * 0.36, r * 1.02]} material={m.leaf}><sphereGeometry args={[1, 12, 8]} /></mesh>
      {buds.map((b, i) => <mesh key={i} position={b.p} material={b.white ? m.roseWhite : m.rose}><icosahedronGeometry args={[b.s, 1]} /></mesh>)}
    </group>
  )
}

function Candle({ at, m, h = 0.18 }: { at: V3; m: VMats; h?: number }) {
  return (
    <group position={at}>
      <mesh position-y={0.015} material={m.gilt}><cylinderGeometry args={[0.06, 0.07, 0.03, 12]} /></mesh>
      <mesh position-y={0.03 + h / 2} material={m.wax}><cylinderGeometry args={[0.03, 0.03, h, 12]} /></mesh>
      <mesh position-y={0.05 + h} scale={[1, 1.7, 1]} material={m.flame}><sphereGeometry args={[0.016, 8, 6]} /></mesh>
    </group>
  )
}

/** One VIP niche, facing +z in its own space. */
function VipNiche({ m, photo, plaque }: { m: VMats; photo: Texture; plaque: Texture }) {
  const w = 1.5, h = 2.7
  return (
    <group>
      {/* velvet back with a gilded arch and pilasters */}
      <mesh position={[0, h / 2, -0.02]} material={m.velvet} receiveShadow><boxGeometry args={[w, h, 0.04]} /></mesh>
      <mesh position={[0, h - w / 2, 0.02]} material={m.gilt} castShadow><torusGeometry args={[w / 2, 0.05, 8, 32, Math.PI]} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * w / 2, (h - w / 2) / 2, 0.02]} material={m.gilt} castShadow><boxGeometry args={[0.1, h - w / 2, 0.1]} /></mesh>)}
      {/* console table */}
      <mesh position={[0, 0.82, 0.24]} material={m.walnut} castShadow receiveShadow><boxGeometry args={[1.1, 0.07, 0.42]} /></mesh>
      {[-0.48, 0.48].map(x => <mesh key={x} position={[x, 0.4, 0.24]} material={m.gilt}><cylinderGeometry args={[0.03, 0.022, 0.8, 8]} /></mesh>)}
      {/* the portrait on a little easel, leaning back */}
      <group position={[0, 1.33, 0.2]} rotation-x={-0.12}>
        <mesh material={m.gilt} castShadow><boxGeometry args={[0.66, 0.84, 0.05]} /></mesh>
        <mesh position-z={0.027} material={m.mat}><planeGeometry args={[0.56, 0.74]} /></mesh>
        <mesh position-z={0.029}><planeGeometry args={[0.44, 0.58]} /><meshStandardMaterial map={photo} roughness={0.5} /></mesh>
      </group>
      <mesh position={[0, 0.9, 0.42]} rotation-x={-0.6}><planeGeometry args={[0.4, 0.1]} /><meshStandardMaterial map={plaque} metalness={0.6} roughness={0.35} /></mesh>
      <Candle at={[-0.42, 0.855, 0.3]} m={m} />
      <Candle at={[0.42, 0.855, 0.3]} m={m} h={0.12} />
      <group position={[0.3, 0.855, 0.12]}>
        <mesh position-y={0.1} material={m.marbleWhite}><cylinderGeometry args={[0.05, 0.07, 0.2, 12]} /></mesh>
      </group>
      <Roses at={[0.3, 1.1, 0.12]} r={0.12} m={m} />
    </group>
  )
}

/** Brass ring of glowing crystal candles on a chain, with a warm light. */
function Chandelier({ at, r, drop, m }: { at: V3; r: number; drop: number; m: VMats }) {
  return (
    <group position={at}>
      <mesh position-y={drop / 2} material={m.gilt}><cylinderGeometry args={[0.015, 0.015, drop, 6]} /></mesh>
      <mesh rotation-x={Math.PI / 2} material={m.gilt}><torusGeometry args={[r, 0.035, 8, 32]} /></mesh>
      <mesh rotation-x={Math.PI / 2} position-y={-0.25} material={m.gilt}><torusGeometry args={[r * 0.55, 0.025, 8, 24]} /></mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const [x, , z] = polar((i / 10) * Math.PI * 2, r)
        return <mesh key={i} position={[x, 0.08, z]} material={m.crystal}><octahedronGeometry args={[0.05, 0]} /></mesh>
      })}
      {Array.from({ length: 6 }, (_, i) => {
        const [x, , z] = polar((i / 6) * Math.PI * 2 + 0.3, r * 0.55)
        return <mesh key={i} position={[x, -0.36, z]} material={m.crystal}><octahedronGeometry args={[0.04, 0]} /></mesh>
      })}
      <mesh position-y={-0.5} material={m.crystal}><octahedronGeometry args={[0.09, 0]} /></mesh>
      <pointLight position-y={-0.3} intensity={22} distance={9} decay={2} color="#FFD3A0" />
    </group>
  )
}

function VelvetBench({ at, ry, m }: { at: V3; ry: number; m: VMats }) {
  return (
    <group position={at} rotation-y={ry}>
      <mesh position-y={0.42} material={m.velvetSeat} castShadow><boxGeometry args={[1.4, 0.16, 0.5]} /></mesh>
      {[-0.6, 0.6].map(x => [-0.2, 0.2].map(z => (
        <mesh key={`${x}${z}`} position={[x, 0.17, z]} material={m.gilt}><cylinderGeometry args={[0.03, 0.02, 0.34, 8]} /></mesh>
      )))}
    </group>
  )
}

function MiniFountain({ m }: { m: VMats }) {
  const basin = useMemo(() => new LatheGeometry([new Vector2(0, 0), new Vector2(1.05, 0), new Vector2(1.1, 0.42), new Vector2(0.98, 0.45), new Vector2(0.95, 0.15), new Vector2(0, 0.15)], 40), [])
  const stem = useMemo(() => new LatheGeometry([new Vector2(0.18, 0), new Vector2(0.12, 0.6), new Vector2(0.5, 0.85), new Vector2(0.55, 0.95), new Vector2(0.45, 0.95), new Vector2(0.1, 0.9)], 32), [])
  return (
    <group>
      <mesh geometry={basin} material={m.marbleWhite} castShadow receiveShadow />
      <mesh position-y={0.38} rotation-x={-Math.PI / 2} material={m.water}><circleGeometry args={[0.97, 32]} /></mesh>
      <mesh geometry={stem} material={m.marbleWhite} castShadow position-y={0.15} />
      <Roses at={[0, 1.18, 0]} r={0.42} m={m} />
    </group>
  )
}

/** Everything inside the VIP pavilion. `y` is the terrace height, `z` the centre of the domed hall. */
export function VipInterior({ y, z, domeR }: { y: number; z: number; domeR: number }) {
  const m = useVipMaterials()
  const floor = useMemo(radialMarble, [])
  const photos = useMemo(() => Array.from({ length: 8 }, (_, i) => portraitTexture(i)), [])
  const plaques = useMemo(() => NAMES.map(plaqueTexture), [])
  let n = 0
  const niche = () => ({ photo: photos[n % photos.length], plaque: plaques[n++ % plaques.length] })

  // the dome's eight walls: the door looks to the front (+z), the walls joining the wings (±x) stay open
  const domeSides = [1, 3, 5, 6, 7]
  const apothem = domeR * Math.cos(Math.PI / 8)

  return (
    <group position={[0, y, z]}>
      {/* domed hall */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.035} receiveShadow>
        <circleGeometry args={[domeR - 0.05, 48]} />
        <meshStandardMaterial map={floor} roughness={0.2} envMapIntensity={0.35} />
      </mesh>
      <MiniFountain m={m} />
      {[0, 1, 2, 3].map(i => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        const [x, , zz] = polar(a, 2.1)
        return <VelvetBench key={i} at={[x, 0, zz]} ry={-a + Math.PI / 2} m={m} />
      })}
      <Chandelier at={[0, 3.6, 0]} r={0.9} drop={domeR + 4.2 - 3.6} m={m} />
      {domeSides.map(i => {
        const a = (i * Math.PI) / 4
        const [x, , zz] = polar(a, apothem - 0.32)
        return (
          <group key={i} position={[x, 0, zz]} rotation-y={Math.atan2(-Math.cos(a), -Math.sin(a))}>
            <VipNiche m={m} {...niche()} />
          </group>
        )
      })}

      {/* the wings */}
      {[-1, 1].map(s => (
        <group key={s} position={[s * 7.2, 0, 0]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.035} receiveShadow>
            <planeGeometry args={[WING.w - 0.1, WING.d - 0.1]} />
            <meshStandardMaterial map={floor} roughness={0.2} envMapIntensity={0.35} />
          </mesh>
          {/* three niches on the back wall, one on the far side wall */}
          {[-1.6, 0, 1.6].map(x => (
            <group key={x} position={[x, 0, -WING.d / 2 + 0.32]}>
              <VipNiche m={m} {...niche()} />
            </group>
          ))}
          <group position={[s * (WING.w / 2 - 0.32), 0, 0.3]} rotation-y={-s * Math.PI / 2}>
            <VipNiche m={m} {...niche()} />
          </group>
          <VelvetBench at={[0, 0, 0.7]} ry={0} m={m} />
          <Chandelier at={[0, 2.9, 0]} r={0.55} drop={0.45} m={m} />
        </group>
      ))}
    </group>
  )
}
