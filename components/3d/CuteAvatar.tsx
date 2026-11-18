'use client'
// components/3d/CuteAvatar.tsx — Chibi visitor: big head, arms and legs; idles, blinks, and walks when told to

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { signTexture } from './textures'
import type * as THREE from 'three'

const SKIN = '#F6D2B0'
const SHOES = '#3A2A22'
const HAIR = '#5A3825'
// Male: orange shirt and trousers. Female: pink top, skirt, long hair and a bow.
const LOOK = {
  male: { shirt: '#D9823B', legs: '#5B4A7A' },
  female: { shirt: '#E8789A', legs: '#F2E4D8' },
}

export function CuteAvatar({ name, walking, gender = 'male' }: { name: string; walking?: React.RefObject<boolean>; gender?: 'male' | 'female' }) {
  const SHIRT = LOOK[gender].shirt
  const PANTS = LOOK[gender].legs
  const girl = gender === 'female'
  const body = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const eyes = useRef<THREE.Group>(null!)
  const armL = useRef<THREE.Group>(null!)
  const armR = useRef<THREE.Group>(null!)
  const legL = useRef<THREE.Group>(null!)
  const legR = useRef<THREE.Group>(null!)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // Name tag drawn onto a sprite (always faces the camera); avoids drei <Html>, which errors on unmount under React 19
  const tag = useMemo(() => signTexture(`✦ ${name}`, { w: 448, h: 96, bg: 'rgba(217,130,59,.92)', fg: '#FFFFFF', font: '600 46px system-ui, sans-serif' }), [name])
  useEffect(() => () => tag.dispose(), [tag])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    eyes.current.scale.y = t % 4 < 0.12 ? 0.1 : 1 // blink every 4s
    if (still) return
    const walk = walking?.current
    const swing = walk ? Math.sin(t * 10) : Math.sin(t * 2)
    body.current.position.y = Math.abs(swing) * (walk ? 0.06 : 0.03)
    armL.current.rotation.x = swing * (walk ? 0.7 : 0.25)
    armR.current.rotation.x = -swing * (walk ? 0.7 : 0.25)
    legL.current.rotation.x = walk ? -swing * 0.6 : 0
    legR.current.rotation.x = walk ? swing * 0.6 : 0
    head.current.rotation.y = walk ? 0 : Math.sin(t * 0.6) * 0.3
    head.current.rotation.z = Math.sin(t * 0.9) * 0.05
  })

  return (
    <group>
      {/* Soft ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.3, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>

      <group ref={body}>
        {/* Legs + shoes, pivoting at the hip */}
        {([[-0.11, legL], [0.11, legR]] as const).map(([x, ref]) => (
          <group key={x} ref={ref} position={[x, 0.4, 0]}>
            <mesh position={[0, -0.18, 0]} castShadow>
              <capsuleGeometry args={[0.075, 0.22, 4, 10]} />
              <meshToonMaterial color={PANTS} />
            </mesh>
            <mesh position={[0, -0.35, 0.04]} scale={[1, 0.7, 1.4]} castShadow>
              <sphereGeometry args={[0.09, 14, 12]} />
              <meshToonMaterial color={SHOES} />
            </mesh>
          </group>
        ))}

        {/* Skirt */}
        {girl && (
          <mesh position={[0, 0.47, 0]} castShadow>
            <cylinderGeometry args={[0.17, 0.3, 0.24, 20, 1, true]} />
            <meshToonMaterial color="#B85C8A" side={2} />
          </mesh>
        )}

        {/* Torso */}
        <mesh position={[0, 0.62, 0]} scale={[1, 1, 0.85]} castShadow>
          <capsuleGeometry args={[0.2, 0.2, 6, 16]} />
          <meshToonMaterial color={SHIRT} />
        </mesh>

        {/* Arms pivot at the shoulders */}
        {([[-0.25, -0.2, armL], [0.25, 0.2, armR]] as const).map(([x, z, ref]) => (
          <group key={x} ref={ref} position={[x, 0.82, 0]} rotation={[0, 0, z]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.22, 4, 10]} />
              <meshToonMaterial color={SHIRT} />
            </mesh>
            <mesh position={[0, -0.35, 0]}>
              <sphereGeometry args={[0.07, 14, 12]} />
              <meshToonMaterial color={SKIN} />
            </mesh>
          </group>
        ))}

        {/* Head */}
        <group ref={head} position={[0, 1.2, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.3, 32, 24]} />
            <meshToonMaterial color={SKIN} />
          </mesh>
          {/* Hair cap + tuft */}
          <mesh position={[0, 0.02, -0.02]}>
            <sphereGeometry args={[0.315, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshToonMaterial color={HAIR} />
          </mesh>
          {!girl && (
            <mesh position={[0.06, 0.32, 0.05]} rotation={[0.3, 0, -0.4]}>
              <coneGeometry args={[0.06, 0.14, 8]} />
              <meshToonMaterial color={HAIR} />
            </mesh>
          )}
          {girl && (
            <>
              {/* Long hair down the back, side locks and a bow */}
              <mesh position={[0, -0.1, -0.1]} scale={[1.05, 1.25, 0.85]}>
                <sphereGeometry args={[0.31, 24, 16]} />
                <meshToonMaterial color={HAIR} />
              </mesh>
              {[-0.26, 0.26].map(x => (
                <mesh key={x} position={[x, -0.16, 0.06]}>
                  <capsuleGeometry args={[0.065, 0.22, 4, 10]} />
                  <meshToonMaterial color={HAIR} />
                </mesh>
              ))}
              <group position={[0.18, 0.26, 0.08]} rotation={[0, 0, -0.4]}>
                {[-1, 1].map(s => (
                  <mesh key={s} position={[s * 0.06, 0, 0]} rotation={[0, 0, s * Math.PI / 2]}>
                    <coneGeometry args={[0.05, 0.1, 8]} />
                    <meshToonMaterial color="#FF6F9C" />
                  </mesh>
                ))}
                <mesh><sphereGeometry args={[0.03, 10, 10]} /><meshToonMaterial color="#FF6F9C" /></mesh>
              </group>
            </>
          )}
          {/* Ears */}
          {[-0.3, 0.3].map(x => (
            <mesh key={x} position={[x, -0.02, 0]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshToonMaterial color={SKIN} />
            </mesh>
          ))}
          {/* Eyes with highlights */}
          <group ref={eyes} position={[0, -0.01, 0]}>
            {[-0.1, 0.1].map(x => (
              <group key={x} position={[x, 0, 0.265]}>
                <mesh scale={[1, 1.25, 0.6]}>
                  <sphereGeometry args={[0.045, 16, 12]} />
                  <meshBasicMaterial color="#1E1614" />
                </mesh>
                <mesh position={[0.015, 0.022, 0.025]}>
                  <sphereGeometry args={[0.014, 8, 8]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
              </group>
            ))}
          </group>
          {/* Blush */}
          {[-0.17, 0.17].map(x => (
            <mesh key={x} position={[x, -0.08, 0.245]} scale={[1, 0.6, 0.3]}>
              <sphereGeometry args={[0.045, 12, 8]} />
              <meshBasicMaterial color="#F49AA0" transparent opacity={0.7} />
            </mesh>
          ))}
          {/* Smile */}
          <mesh position={[0, -0.085, 0.285]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.04, 0.01, 8, 16, Math.PI]} />
            <meshBasicMaterial color="#7A3B2E" />
          </mesh>
        </group>
      </group>

      {/* Name tag */}
      <sprite position={[0, 1.75, 0]} scale={[0.95, 0.2, 1]}>
        <spriteMaterial map={tag} transparent alphaTest={0.3} depthWrite={false} />
      </sprite>
    </group>
  )
}
