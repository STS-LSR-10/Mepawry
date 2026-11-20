'use client'
// components/3d/sanctuary/EntranceHall.tsx — The reception hall inside the front dome.
// A curved reception desk ("Welcome to Mepawry") with marble panels faces the front door. Openings left and right
// lead into the outer gallery; the doorway behind the desk leads on to the inner gallery, the garden and the VIP
// pavilion — each has a sign above it. Behind the desk to the right, a slatted oak wall with the MEPAWRY SANCTUARY
// lettering and a screen showing the site; to the left, a mirror and a plant shelf. A directory map stands near the
// door. Lounge corners with armchairs, a sofa and coffee tables, hanging ferns, potted palms, a wooden chandelier.

import { useMemo } from 'react'
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace, type Texture } from 'three'
import {
  Armchair, FernPot, Ferns, herringboneTexture, Roses, Rug, rugTexture, SideTable, useDecorLamps, useDecorMaterials, type DMats,
} from './decor'
import { polar, useLamp, type V3 } from './shared'

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

const welcomeTexture = () => tex(512, 160, g => {
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#C79566'); gr.addColorStop(1, '#A87448')
  g.fillStyle = gr; g.beginPath(); g.roundRect(4, 4, 504, 152, 18); g.fill()
  g.strokeStyle = '#7A4F2C'; g.lineWidth = 5; g.stroke()
  g.fillStyle = '#4A2A14'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = 'italic 600 40px Georgia, serif'; g.fillText('Welcome to', 256, 52)
  g.font = 'italic 700 58px Georgia, serif'; g.fillText('Mepawry 🐾', 256, 112)
})

const lettersTexture = () => tex(512, 160, g => {
  g.clearRect(0, 0, 512, 160)
  g.fillStyle = '#F5ECDC'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6; g.shadowOffsetY = 3
  g.font = '700 64px Georgia, serif'; g.fillText('MEPAWRY', 256, 52)
  g.font = '600 50px Georgia, serif'; g.fillText('SANCTUARY', 256, 116)
})

/** A little plan of the site: two rings of galleries, the garden, the VIP pavilion and the entrance. */
function sitePlan(g: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  g.fillStyle = '#7FA86A'; g.beginPath(); g.arc(cx, cy, s, 0, Math.PI * 2); g.fill()
  for (const [r, w] of [[0.82, 0.16], [0.52, 0.16]]) { g.strokeStyle = '#D9B98C'; g.lineWidth = s * w; g.beginPath(); g.arc(cx, cy, s * r, 0, Math.PI * 2); g.stroke() }
  g.fillStyle = '#F1E7D6'; g.fillRect(cx - s * 0.3, cy - s * 0.38, s * 0.6, s * 0.2)
  g.fillStyle = '#C9A15A'; g.beginPath(); g.arc(cx, cy - s * 0.3, s * 0.11, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#9CCBDA'; g.beginPath(); g.arc(cx, cy + s * 0.05, s * 0.07, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#C9A15A'; g.beginPath(); g.arc(cx, cy + s * 0.82, s * 0.12, 0, Math.PI * 2); g.fill()
}

const screenTexture = () => tex(512, 288, g => {
  g.fillStyle = '#DCE6D4'; g.fillRect(0, 0, 512, 288)
  sitePlan(g, 170, 144, 118)
  g.fillStyle = '#2E4A2A'; g.font = '700 26px Georgia, serif'; g.fillText('Mepawry Sanctuary', 310, 60)
  g.font = '18px sans-serif'
  ;['🕯️ Light a candle', '🎁 Leave a gift', '✿ VIP Garden', '📖 Guestbook'].forEach((t, i) => g.fillText(t, 320, 110 + i * 34))
})

const directoryTexture = () => tex(384, 512, g => {
  g.fillStyle = '#F4EDE0'; g.fillRect(0, 0, 384, 512)
  g.fillStyle = '#3E5A36'; g.fillRect(0, 0, 384, 70)
  g.fillStyle = '#FFFFFF'; g.font = '700 36px Georgia, serif'; g.textAlign = 'center'; g.fillText('Directories', 192, 48)
  sitePlan(g, 192, 220, 130)
  g.fillStyle = '#3A2A1A'; g.textAlign = 'left'; g.font = '19px sans-serif'
  ;['● You are here — Reception', '← → Outer gallery · Zones A–H', '↑ Inner gallery · Garden', '↑ VIP pavilion (terrace)'].forEach((t, i) => g.fillText(t, 26, 392 + i * 30))
})

const passageSign = (label: string) => tex(512, 96, g => {
  g.fillStyle = '#3B2A1C'; g.beginPath(); g.roundRect(2, 2, 508, 92, 14); g.fill()
  g.strokeStyle = '#C9A15A'; g.lineWidth = 4; g.stroke()
  g.fillStyle = '#F6EAD2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 34px Georgia, serif'
  g.fillText(label, 256, 50)
})

/** Slatted oak feature wall. */
function SlatWall({ w, h, m }: { w: number; h: number; m: DMats }) {
  const n = Math.round(w / 0.12)
  return (
    <group>
      <mesh position={[0, h / 2, -0.03]} material={m.panelDark}><boxGeometry args={[w, h, 0.04]} /></mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / n), h / 2, 0.01]} material={m.panel}><boxGeometry args={[w / n - 0.035, h, 0.05]} /></mesh>
      ))}
    </group>
  )
}

/** Rustic chandelier: two wooden rings on iron chains, candle bulbs glowing. */
function WoodChandelier({ at, drop, m }: { at: V3; drop: number; m: DMats }) {
  const lamp = useLamp()
  const iron = useMemo(() => new MeshStandardMaterial({ color: '#3A2E24', roughness: 0.5, metalness: 0.6 }), [])
  return (
    <group position={at}>
      <mesh position-y={drop / 2} material={iron}><cylinderGeometry args={[0.02, 0.02, drop, 6]} /></mesh>
      {[[0.95, 0, 10], [0.55, -0.45, 6]].map(([r, y, n], k) => (
        <group key={k} position-y={y}>
          <mesh rotation-x={Math.PI / 2} material={m.panelDark} castShadow><torusGeometry args={[r, 0.05, 8, 40]} /></mesh>
          {Array.from({ length: n }, (_, i) => {
            const [x, , z] = polar((i / n) * Math.PI * 2, r)
            return (
              <group key={i} position={[x, 0.06, z]}>
                <mesh position-y={0.08} material={m.wax}><cylinderGeometry args={[0.025, 0.025, 0.14, 8]} /></mesh>
                <mesh position-y={0.19} material={m.flame}><sphereGeometry args={[0.03, 8, 6]} /></mesh>
              </group>
            )
          })}
          {[0, 1, 2, 3].map(i => { const [x, , z] = polar((i / 4) * Math.PI * 2 + 0.4, r); return <mesh key={i} position={[x / 2, 0.45, z / 2]} rotation={[z * 0.5, 0, -x * 0.5]} material={iron}><cylinderGeometry args={[0.008, 0.008, 1.0, 4]} /></mesh> })}
        </group>
      ))}
      <pointLight position-y={-0.3} intensity={30 * lamp} distance={12} decay={2} color="#FFD3A0" />
    </group>
  )
}

/** The curved reception desk, its front facing +z. */
function ReceptionDesk({ m, welcome }: { m: DMats; welcome: Texture }) {
  const lamp = useLamp()
  const marble = useMemo(() => new MeshStandardMaterial({ color: '#DCD3C5', roughness: 0.25 }), [])
  // plain satin oak: the grain texture stretches into thick stripes around the curve
  const oak = useMemo(() => new MeshStandardMaterial({ color: '#94623A', roughness: 0.42 }), [])
  const span = 2.3 // radians of arc, centred on the front
  return (
    <group>
      {/* body and counter as segments of a cylinder, the open side towards the back */}
      <mesh position-y={0.5} material={oak} castShadow receiveShadow><cylinderGeometry args={[1.6, 1.6, 1.0, 40, 1, false, -span / 2, span]} /></mesh>
      <mesh position-y={1.03} material={marble} castShadow><cylinderGeometry args={[1.72, 1.72, 0.06, 40, 1, false, -span / 2 - 0.04, span + 0.08]} /></mesh>
      <mesh position-y={0.04} material={m.panelDark}><cylinderGeometry args={[1.55, 1.55, 0.08, 40, 1, false, -span / 2, span]} /></mesh>
      {/* marble panels either side of the sign */}
      {[-1, 1].map(s => {
        const a = s * 0.68
        return <mesh key={s} position={[Math.sin(a) * 1.615, 0.52, Math.cos(a) * 1.615]} rotation-y={a} material={marble}><planeGeometry args={[0.72, 0.78]} /></mesh>
      })}
      <mesh position={[0, 0.55, 1.62]}><planeGeometry args={[1.2, 0.38]} /><meshStandardMaterial map={welcome} roughness={0.5} /></mesh>
      {/* on the counter: a lamp, a screen, flowers, a little stand of cards */}
      <group position={[-0.95, 1.06, 0.95]}>
        <mesh position-y={0.18} material={m.gilt}><cylinderGeometry args={[0.02, 0.06, 0.36, 10]} /></mesh>
        <mesh position-y={0.42} material={m.glow}><cylinderGeometry args={[0.1, 0.16, 0.2, 16, 1, true]} /></mesh>
        <pointLight position-y={0.38} intensity={2.5 * lamp} distance={3} decay={2} color="#FFD3A0" />
      </group>
      <group position={[-0.25, 1.06, 1.05]} rotation-y={0.15}>
        <mesh position={[0, 0.03, 0]} material={m.marbleWhite}><boxGeometry args={[0.18, 0.02, 0.14]} /></mesh>
        <mesh position={[0, 0.24, -0.02]} material={m.marbleWhite}><boxGeometry args={[0.5, 0.32, 0.02]} /></mesh>
        <mesh position={[0, 0.24, -0.008]}><planeGeometry args={[0.46, 0.28]} /><meshStandardMaterial color="#BFD8E8" emissive="#9CC4E0" emissiveIntensity={0.6} /></mesh>
      </group>
      <mesh position={[0.75, 1.13, 1.0]} material={m.ceramic}><cylinderGeometry args={[0.06, 0.08, 0.16, 12]} /></mesh>
      <Roses at={[0.75, 1.24, 1.0]} r={0.14} m={m} />
      <mesh position={[0.35, 1.13, 1.18]} rotation-x={-0.4} material={m.panelDark}><boxGeometry args={[0.24, 0.14, 0.02]} /></mesh>
    </group>
  )
}

/** Everything inside the reception dome; `at` is the dome's centre on the ground, the front door faces +z. */
export function EntranceHall({ at, r }: { at: [number, number]; r: number }) {
  const m = useDecorMaterials()
  useDecorLamps(m)
  const floor = useMemo(() => { const t = herringboneTexture(); t.repeat.set(4, 4); return t }, [])
  const welcome = useMemo(welcomeTexture, [])
  const letters = useMemo(lettersTexture, [])
  const screen = useMemo(screenTexture, [])
  const directory = useMemo(directoryTexture, [])
  const signs = useMemo(() => ({
    left: passageSign('← Outer Gallery · Zones A–D'),
    right: passageSign('Outer Gallery · Zones E–H →'),
    back: passageSign('↑ Garden · Inner Gallery · VIP'),
  }), [])
  const rugA = useMemo(() => rugTexture('#6B7B5A', '#8A9A70'), [])
  const sage = useMemo(() => new MeshStandardMaterial({ color: '#7E9A6E', roughness: 0.95 }), [])
  const apothem = r * Math.cos(Math.PI / 8)

  // a wall of the octagon: 0 = right (+x), 2 = front door (+z), 4 = left, 6 = back
  const wallAt = (i: number, inset: number) => {
    const a = (i * Math.PI) / 4
    const [x, , z] = polar(a, apothem - inset)
    return { pos: [x, 0, z] as V3, ry: Math.atan2(-Math.cos(a), -Math.sin(a)) }
  }
  const signOver = (i: number, t: Texture) => {
    const { pos, ry } = wallAt(i, 0.12)
    return <mesh position={[pos[0], 2.75, pos[2]]} rotation-y={ry}><planeGeometry args={[2.0, 0.38]} /><meshStandardMaterial map={t} roughness={0.6} /></mesh>
  }

  const ferns = useMemo(() => {
    const pots: V3[] = [[-4.1, 0, 1.4], [4.1, 0, 1.4], [-2.2, 0, -3.9], [2.2, 0, -3.9], [-3.3, 0, -2.6]]
    const plants = pots.map(p => ({ at: [p[0], 0.44, p[2]] as V3, size: 0.8 }))
    const hanging = [1, 3, 5, 7].map(i => ({ at: polar((i * Math.PI) / 4, apothem - 0.9, 3.4), size: 0.85 }))
    // a plant shelf under the mirror
    for (let k = -1; k <= 1; k++) plants.push({ at: [...polar((5 * Math.PI) / 4, apothem - 0.35, 1.25)].map((v, j) => (j === 0 ? v + k * 0.45 * Math.cos(Math.PI / 4) : j === 2 ? v - k * 0.45 * Math.sin(Math.PI / 4) : v)) as V3, size: 0.4 })
    return { pots, plants, hanging }
  }, [apothem])

  return (
    <group position={[at[0], 0, at[1]]}>
      {/* floor: oak herringbone with a marble circle under the desk */}
      <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 8} position-y={0.035} receiveShadow>
        <circleGeometry args={[r - 0.05, 8]} />
        <meshStandardMaterial map={floor} roughness={0.35} envMapIntensity={0.4} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, -0.6]} receiveShadow>
        <circleGeometry args={[2.4, 48]} />
        <meshStandardMaterial color="#D5CCBE" roughness={0.25} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.042, -0.6]}>
        <ringGeometry args={[2.32, 2.42, 64]} />
        <meshStandardMaterial color="#B48A4A" metalness={0.5} roughness={0.35} />
      </mesh>

      <group position={[0, 0, -0.6]}><ReceptionDesk m={m} welcome={welcome} /></group>

      {/* back right: slatted oak wall with the lettering and a screen */}
      {(() => {
        const { pos, ry } = wallAt(7, 0.12)
        return (
          <group position={pos} rotation-y={ry}>
            <SlatWall w={3.6} h={3.4} m={m} />
            <mesh position={[0, 2.85, 0.05]}><planeGeometry args={[2.4, 0.75]} /><meshStandardMaterial map={letters} transparent alphaTest={0.3} /></mesh>
            <mesh position={[0, 1.65, 0.06]} material={m.panelDark}><boxGeometry args={[1.55, 0.9, 0.05]} /></mesh>
            <mesh position={[0, 1.65, 0.09]}><planeGeometry args={[1.45, 0.82]} /><meshStandardMaterial map={screen} emissiveMap={screen} emissive="#FFFFFF" emissiveIntensity={0.3} /></mesh>
          </group>
        )
      })()}
      {/* back left: a carved mirror over a plant shelf */}
      {(() => {
        const { pos, ry } = wallAt(5, 0.1)
        return (
          <group position={pos} rotation-y={ry}>
            <mesh position={[0, 1.65, 0]} material={m.gilt} castShadow><boxGeometry args={[1.0, 1.45, 0.06]} /></mesh>
            <mesh position={[0, 1.65, 0.035]}><planeGeometry args={[0.82, 1.27]} /><meshStandardMaterial color="#CFDCE0" metalness={1} roughness={0.05} /></mesh>
            <mesh position={[0, 1.2 - 0.02, 0.16]} material={m.panel} castShadow><boxGeometry args={[1.6, 0.05, 0.32]} /></mesh>
          </group>
        )
      })()}

      {/* signs over the three ways on */}
      {signOver(4, signs.left)}
      {signOver(0, signs.right)}
      {signOver(6, signs.back)}

      {/* directory board near the front right */}
      <group position={[3.2, 0, 2.2]} rotation-y={-0.75}>
        <mesh position={[0, 1.35, 0]} material={m.panelDark} castShadow><boxGeometry args={[1.0, 1.32, 0.06]} /></mesh>
        <mesh position={[0, 1.35, 0.035]}><planeGeometry args={[0.92, 1.24]} /><meshStandardMaterial map={directory} roughness={0.6} /></mesh>
        {[-0.4, 0.4].map(x => <mesh key={x} position={[x, 0.36, 0]} material={m.panelDark}><boxGeometry args={[0.06, 0.72, 0.06]} /></mesh>)}
      </group>

      {/* lounge, front left: armchairs round a coffee table on a rug */}
      <group position={[-3.0, 0, 1.6]} rotation-y={0.4}>
        <Rug at={[0, 0.045, 0]} size={[2.4, 2.0]} tex={rugA} />
        <Armchair at={[-0.7, 0, -0.35]} ry={1.2} m={m} />
        <Armchair at={[0.0, 0, -0.85]} ry={0.2} m={m} fabric={sage} />
        <Armchair at={[0.75, 0, -0.3]} ry={-1.0} m={m} />
        <SideTable at={[0, 0, 0.1]} m={m} />
      </group>
      {/* lounge, back left by the gallery opening: a sofa and a chair */}
      <group position={[-3.6, 0, -1.6]} rotation-y={1.2}>
        <mesh position={[0, 0.25, 0]} material={sage} castShadow><boxGeometry args={[1.8, 0.4, 0.75]} /></mesh>
        <mesh position={[0, 0.65, -0.3]} material={sage} castShadow><boxGeometry args={[1.8, 0.55, 0.16]} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * 0.85, 0.52, 0]} material={sage}><boxGeometry args={[0.14, 0.3, 0.75]} /></mesh>)}
        {[-0.45, 0.45].map(x => <mesh key={x} position={[x, 0.5, 0.02]} material={m.cushion}><boxGeometry args={[0.75, 0.1, 0.6]} /></mesh>)}
        <SideTable at={[0, 0, 0.9]} m={m} withFlowers={false} />
      </group>

      {/* plants */}
      <Ferns plants={ferns.plants} hanging={ferns.hanging} />
      {ferns.pots.map((p, i) => <FernPot key={i} at={p} m={m} />)}
      {ferns.hanging.map((p, i) => <FernPot key={i} at={p.at} m={m} hanging />)}

      <WoodChandelier at={[0, 3.7, 0]} drop={4.4 + r - 3.7 - 0.3} m={m} />
    </group>
  )
}
