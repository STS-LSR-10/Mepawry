'use client'
// app/preview/vase/page.tsx — The shrine's flower vase up close: the current one (left) beside the redesign (right).
// ?n=<1–12> sets how many flowers.

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { BabysBreath, useMaterials } from '@/components/3d/ShrineCabinet'
import { FlowerVase } from '@/components/3d/FlowerVase'

function Old({ n }: { n: number }) {
  const m = useMaterials(false)
  return <BabysBreath at={[-0.16, 0, 0]} stems={n} m={m} />
}

export default function VasePreview() {
  const [n, setN] = useState(8)
  useEffect(() => { const v = Number(new URLSearchParams(window.location.search).get('n')); if (v) setN(v) }, [])
  return (
    <main style={{ height: '100vh', background: 'radial-gradient(ellipse at top,#4A2A1A,#1E120C)' }}>
      <Canvas shadows camera={{ position: [0, 0.32, 1.05], fov: 34 }} onCreated={({ camera }) => camera.lookAt(0, 0.22, 0)}>
        <ambientLight intensity={0.35} color="#FFD9B5" />
        <directionalLight position={[0.6, 1.2, 0.9]} intensity={2.2} color="#FFE6C8" castShadow />
        <pointLight position={[-0.5, 0.5, 0.6]} intensity={0.8} color="#FFB878" />
        <Environment resolution={128}>
          <Lightformer intensity={2} position={[0, 2, 2]} scale={[4, 2, 1]} />
          <Lightformer intensity={0.8} color="#FFC890" position={[-2, 1, 1]} scale={[2, 2, 1]} />
        </Environment>
        <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[2, 2]} /><meshStandardMaterial color="#F3EADB" roughness={0.8} /></mesh>
        <Old n={n} />
        <FlowerVase at={[0.16, 0, 0]} stems={n} />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.4} scale={1.2} blur={2} far={0.5} />
        <OrbitControls target={[0, 0.22, 0]} />
      </Canvas>
    </main>
  )
}
