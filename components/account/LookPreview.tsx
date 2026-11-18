'use client'
// components/account/LookPreview.tsx — A small turning 3D preview of a look (used outside the hall).

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { CuteAvatar } from '@/components/3d/CuteAvatar'
import type { AvatarLook } from '@/lib/look'

function Turn({ children }: { children: React.ReactNode }) {
  const g = useRef<Group>(null!)
  useFrame(({ clock }) => { g.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.6 })
  return <group ref={g}>{children}</group>
}

export default function LookPreview({ look }: { look: AvatarLook }) {
  return (
    <div className="h-56 overflow-hidden rounded-2xl bg-gradient-to-b from-[#FDF0E5] to-[#F4E6D4]">
      <Canvas camera={{ position: [0, 1.0, 3.1], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)} dpr={[1, 2]}>
        <hemisphereLight args={['#FFF1E0', '#B89A80', 1.2]} />
        <directionalLight position={[2, 3, 3]} intensity={1.5} color="#FFE8C2" />
        <Turn><CuteAvatar name=" " look={look} /></Turn>
      </Canvas>
    </div>
  )
}
