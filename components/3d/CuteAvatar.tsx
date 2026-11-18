'use client'
// components/3d/CuteAvatar.tsx — The visitor as a pastel chibi vinyl toy: big head, messy hair with an ahoge,
// shiny eyes, a knitted hoodie with bones and paws, rolled-up trousers and little sneakers.
// Female: pink hoodie, lavender skirt, long hair and a bow. Idles, blinks, and walks when told to.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Vector3, type Group } from 'three'
import { hoodieTexture, nameTagTexture } from './textures'

const SKIN = '#FCE4D4'
const HAIR = '#6B4430'
const CHEEK = '#F6A3B0'
const LOOK = {
  male: { hoodie: '#F8B98F', accent: '#FFE6D2', legs: '#C7B3EA', cuff: '#DCCEF4', shoe: '#B88A68' },
  female: { hoodie: '#F6B4C6', accent: '#FCDDE6', legs: '#C7B3EA', cuff: '#DCCEF4', shoe: '#C9967A' },
}

/** Soft matte "vinyl/clay" finish. */
function Clay({ color, rough = 0.78 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0} />
}

export function CuteAvatar({ name, walking, gender = 'male' }: { name: string; walking?: React.RefObject<boolean>; gender?: 'male' | 'female' }) {
  const L = LOOK[gender]
  const girl = gender === 'female'
  const body = useRef<Group>(null!)
  const head = useRef<Group>(null!)
  const eyes = useRef<Group>(null!)
  const armL = useRef<Group>(null!)
  const armR = useRef<Group>(null!)
  const legL = useRef<Group>(null!)
  const legR = useRef<Group>(null!)
  const ahoge = useRef<Group>(null!)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // Name tag drawn onto a sprite (always faces the camera); avoids drei <Html>, which errors on unmount under React 19
  const tag = useMemo(() => nameTagTexture(`✦ ${name}`), [name])
  const knit = useMemo(() => hoodieTexture(L.hoodie, L.accent), [L.hoodie, L.accent])
  useEffect(() => () => { tag.dispose(); knit.dispose() }, [tag, knit])
  const strand = useMemo(() => new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.02, 0.09, 0.01), new Vector3(0.08, 0.14, 0.03), new Vector3(0.13, 0.12, 0.05)]), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    eyes.current.scale.y = t % 4 < 0.12 ? 0.1 : 1 // blink every 4s
    if (still) return
    const walk = walking?.current
    const swing = walk ? Math.sin(t * 10) : Math.sin(t * 2)
    body.current.position.y = Math.abs(swing) * (walk ? 0.06 : 0.025)
    armL.current.rotation.x = swing * (walk ? 0.7 : 0.18)
    armR.current.rotation.x = -swing * (walk ? 0.7 : 0.18)
    legL.current.rotation.x = walk ? -swing * 0.6 : 0
    legR.current.rotation.x = walk ? swing * 0.6 : 0
    head.current.rotation.y = walk ? 0 : Math.sin(t * 0.6) * 0.3
    head.current.rotation.z = Math.sin(t * 0.9) * 0.05
    ahoge.current.rotation.z = Math.sin(t * (walk ? 9 : 2.4)) * 0.18 // the strand bobs
  })

  // Bangs: soft chunks along the forehead
  // Fringe tips: soft pointed locks along the lower edge of the fringe, swept a little to the side
  const tips = useMemo(() => [-0.22, -0.11, 0, 0.11, 0.21].map((x, i) => {
    const y = 0.13 - Math.abs(x) * 0.25, r = 0.352
    const z = Math.sqrt(Math.max(0, r * r - x * x - y * y))
    return { p: [x, y, z * 0.95] as [number, number, number], rz: -x * 1.6 + (i % 2 ? 0.15 : -0.1), len: 0.11 + (i % 2) * 0.03 }
  }), [])

  return (
    <group>
      {/* Soft ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.32, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} />
      </mesh>

      <group ref={body}>
        {/* Legs: rolled trousers (or tights under a skirt) and sneakers, pivoting at the hip */}
        {([[-0.1, legL], [0.1, legR]] as const).map(([x, ref]) => (
          <group key={x} ref={ref} position={[x, 0.4, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.16, 6, 14]} />
              <Clay color={girl ? '#F7EDE4' : L.legs} />
            </mesh>
            {!girl && (
              <mesh position={[0, -0.26, 0]}>
                <cylinderGeometry args={[0.098, 0.096, 0.07, 18]} />
                <Clay color={L.cuff} />
              </mesh>
            )}
            {/* Sneaker: upper, cream sole, laces */}
            <group position={[0, -0.34, 0.035]}>
              <mesh scale={[1, 0.62, 1.35]} castShadow>
                <sphereGeometry args={[0.095, 18, 14]} />
                <Clay color={L.shoe} rough={0.65} />
              </mesh>
              <mesh position={[0, -0.04, 0]} scale={[1, 1, 1.3]}>
                <cylinderGeometry args={[0.098, 0.098, 0.03, 20]} />
                <Clay color="#F6EBDD" />
              </mesh>
              {[0.02, 0.055].map(z => (
                <mesh key={z} position={[0, 0.05, z]} rotation={[0.35, 0, 0]}>
                  <boxGeometry args={[0.07, 0.012, 0.012]} />
                  <Clay color="#F6EBDD" />
                </mesh>
              ))}
            </group>
          </group>
        ))}

        {/* Skirt */}
        {girl && (
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.3, 0.24, 24, 1, true]} />
            <meshStandardMaterial color={L.legs} roughness={0.8} side={2} />
          </mesh>
        )}

        {/* Hoodie body (turned so the texture seam is at the back), ribbed hem, hood and drawstrings */}
        <mesh position={[0, 0.66, 0]} rotation={[0, Math.PI, 0]} scale={[1, 1, 0.86]} castShadow>
          <capsuleGeometry args={[0.215, 0.12, 8, 24]} />
          <meshStandardMaterial map={knit} roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.86, 1]}>
          <torusGeometry args={[0.19, 0.04, 10, 28]} />
          <Clay color={L.hoodie} rough={0.95} />
        </mesh>
        <mesh position={[0, 0.86, -0.05]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
          <torusGeometry args={[0.15, 0.065, 12, 28]} />
          <Clay color={L.hoodie} rough={0.92} />
        </mesh>
        {[-0.05, 0.05].map(x => (
          <group key={x} position={[x, 0.76, 0.18]}>
            <mesh><cylinderGeometry args={[0.009, 0.009, 0.11, 6]} /><Clay color="#FFF4E8" /></mesh>
            <mesh position={[0, -0.06, 0]}><sphereGeometry args={[0.014, 8, 8]} /><Clay color="#FFF4E8" /></mesh>
          </group>
        ))}

        {/* Arms: sleeves with cuffs and soft round hands, pivoting at the shoulders */}
        {([[-0.24, -0.22, armL], [0.24, 0.22, armR]] as const).map(([x, z, ref]) => (
          <group key={x} ref={ref} position={[x, 0.8, 0]} rotation={[0, 0, z]}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <capsuleGeometry args={[0.078, 0.18, 6, 14]} />
              <meshStandardMaterial map={knit} roughness={0.92} />
            </mesh>
            <mesh position={[0, -0.27, 0]}>
              <cylinderGeometry args={[0.072, 0.072, 0.05, 16]} />
              <Clay color={L.hoodie} rough={0.95} />
            </mesh>
            <mesh position={[0, -0.34, 0]} scale={[1, 0.95, 0.9]}>
              <sphereGeometry args={[0.072, 16, 12]} />
              <Clay color={SKIN} rough={0.6} />
            </mesh>
          </group>
        ))}

        {/* Head */}
        <group ref={head} position={[0, 1.18, 0]}>
          <mesh scale={[1, 0.94, 0.95]} castShadow>
            <sphereGeometry args={[0.34, 36, 28]} />
            <Clay color={SKIN} rough={0.55} />
          </mesh>
          {/* Ears */}
          {[-0.33, 0.33].map(x => (
            <mesh key={x} position={[x, -0.03, 0]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <Clay color={SKIN} rough={0.55} />
            </mesh>
          ))}

          {/* Hair: cap, back, side tufts, bangs and the ahoge */}
          <mesh position={[0, 0.04, -0.03]} rotation={[-0.25, 0, 0]}>
            <sphereGeometry args={[0.36, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            <Clay color={HAIR} rough={0.7} />
          </mesh>
          <mesh position={[0, -0.02, -0.1]} scale={[1.02, 0.95, 0.85]}>
            <sphereGeometry args={[0.34, 24, 16]} />
            <Clay color={HAIR} rough={0.7} />
          </mesh>
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * 0.3, 0.03, 0.08]} rotation={[0, 0, s * 0.35]} scale={[0.45, 1, 0.6]}>
              <sphereGeometry args={[0.12, 14, 12]} />
              <Clay color={HAIR} rough={0.7} />
            </mesh>
          ))}
          {/* Smooth fringe over the forehead */}
          <mesh scale={[1, 0.94, 0.95]}>
            <sphereGeometry args={[0.356, 32, 16, Math.PI / 2 - 1.15, 2.3, 0, 1.12]} />
            <Clay color={HAIR} rough={0.7} />
          </mesh>
          {tips.map((t, i) => (
            <mesh key={i} position={[t.p[0], t.p[1] - 0.015, t.p[2] - 0.02]} rotation={[0.45, 0, t.rz]} scale={[0.85, 1.3 + t.len * 4, 0.4]}>
              <sphereGeometry args={[0.055, 16, 12]} />
              <Clay color={HAIR} rough={0.7} />
            </mesh>
          ))}
          <group ref={ahoge} position={[0.01, 0.34, 0.02]}>
            <mesh><tubeGeometry args={[strand, 16, 0.016, 8, false]} /><Clay color={HAIR} rough={0.7} /></mesh>
            <mesh rotation={[0, Math.PI * 0.8, 0]} scale={0.7}><tubeGeometry args={[strand, 16, 0.016, 8, false]} /><Clay color={HAIR} rough={0.7} /></mesh>
          </group>

          {girl && (
            <>
              {/* Long hair down the back, side locks and a bow */}
              <mesh position={[0, -0.16, -0.13]} scale={[1.05, 1.3, 0.8]}>
                <sphereGeometry args={[0.31, 24, 16]} />
                <Clay color={HAIR} rough={0.7} />
              </mesh>
              {[-0.28, 0.28].map(x => (
                <mesh key={x} position={[x, -0.2, 0.05]}>
                  <capsuleGeometry args={[0.065, 0.24, 4, 10]} />
                  <Clay color={HAIR} rough={0.7} />
                </mesh>
              ))}
              <group position={[0.2, 0.27, 0.1]} rotation={[0, 0, -0.4]}>
                {[-1, 1].map(s => (
                  <mesh key={s} position={[s * 0.06, 0, 0]} rotation={[0, 0, s * Math.PI / 2]}>
                    <coneGeometry args={[0.05, 0.1, 10]} />
                    <Clay color="#FF8FB1" />
                  </mesh>
                ))}
                <mesh><sphereGeometry args={[0.03, 10, 10]} /><Clay color="#FF8FB1" /></mesh>
              </group>
            </>
          )}

          {/* Big shiny eyes */}
          <group ref={eyes} position={[0, -0.04, 0]}>
            {[-0.12, 0.12].map(x => (
              <group key={x} position={[x, 0, 0.29]}>
                <mesh scale={[0.85, 1.1, 0.45]}>
                  <sphereGeometry args={[0.068, 20, 16]} />
                  <meshStandardMaterial color="#17110F" roughness={0.15} metalness={0.1} />
                </mesh>
                <mesh position={[0.022, 0.03, 0.028]}><sphereGeometry args={[0.02, 10, 10]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
                <mesh position={[-0.02, -0.025, 0.028]}><sphereGeometry args={[0.009, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
              </group>
            ))}
          </group>
          {/* Rosy cheeks, tiny nose, gentle smile */}
          {[-0.2, 0.2].map(x => (
            <mesh key={x} position={[x, -0.12, 0.25]} scale={[1.2, 0.75, 0.35]}>
              <sphereGeometry args={[0.045, 14, 10]} />
              <meshStandardMaterial color={CHEEK} roughness={0.9} transparent opacity={0.85} />
            </mesh>
          ))}
          <mesh position={[0, -0.09, 0.315]}><sphereGeometry args={[0.012, 8, 8]} /><Clay color="#F2B7A8" /></mesh>
          <mesh position={[0, -0.135, 0.3]} rotation={[0.25, 0, Math.PI]}>
            <torusGeometry args={[0.035, 0.008, 8, 16, Math.PI]} />
            <meshBasicMaterial color="#7A3B2E" />
          </mesh>
        </group>
      </group>

      {/* Name tag */}
      <sprite position={[0, 1.78, 0]} scale={[1.05, 0.23, 1]}>
        <spriteMaterial map={tag} transparent alphaTest={0.1} depthWrite={false} />
      </sprite>
    </group>
  )
}
