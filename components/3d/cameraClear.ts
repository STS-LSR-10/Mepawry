// components/3d/cameraClear.ts — Keeps the avatar in view in tight rooms. Each frame a ray runs from the avatar back
// to the camera: small things in the way (a post, a pole, a plant) fade to see-through; anything wide (a wall, a
// cabinet) brings the camera in to just in front of it. Faded things come back as soon as they're clear.
// Cheap enough for phones: only meshes (and instances) whose bounds touch the ray are hit-tested properly.

import * as THREE from 'three'

const WALL = 1.2 // m: a thing this wide in two directions is a wall (pull the camera in); posts, poles, beams and small things fade
const ray = new THREE.Raycaster()
const sphere = new THREE.Sphere(), box = new THREE.Box3(), size = new THREE.Vector3(), m4 = new THREE.Matrix4()
const probe = new THREE.Mesh()
const fadedOf = new Map<THREE.Material, THREE.Material>() // one see-through copy per original material
const faded = new Map<THREE.Mesh, THREE.Material>()       // meshes faded now → their own material
let meshes: THREE.Mesh[] = [], listedAt = -1e9

function seeThrough(m: THREE.Material) {
  let f = fadedOf.get(m)
  if (!f) {
    f = m.clone()
    f.transparent = true; f.opacity = 0.22; f.depthWrite = false
    fadedOf.set(m, f)
  }
  return f
}

const under = (o: THREE.Object3D, root: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === root) return true; return false }
const testable = (o: THREE.Mesh) => o.raycast === THREE.Mesh.prototype.raycast || o.raycast === THREE.InstancedMesh.prototype.raycast

/** Does a sphere touch the ray between `near` and `far`? */
function nearSegment(c: THREE.Vector3, r: number) {
  const o = ray.ray.origin, d = ray.ray.direction
  const t = Math.max(0, Math.min(ray.far, (c.x - o.x) * d.x + (c.y - o.y) * d.y + (c.z - o.z) * d.z))
  const x = o.x + d.x * t - c.x, y = o.y + d.y * t - c.y, z = o.z + d.z * t - c.z
  return x * x + y * y + z * z <= r * r
}

// Instanced pieces (cubby boards, posts…) don't move: they go once into a grid of 3 m cells on the ground, so a frame
// only looks at the pieces in the few cells the ray passes over
const CELL = 3
let grid = new Map<number, { o: THREE.InstancedMesh; i: number; c: THREE.Vector3; r: number }[]>(), gridKey = ''
const cellOf = (x: number, z: number) => (Math.floor(x / CELL) + 1000) * 4096 + Math.floor(z / CELL) + 1000

function buildGrid(list: THREE.InstancedMesh[]) {
  const key = list.map(o => `${o.id}:${o.count}`).join(',')
  if (key === gridKey) return
  gridKey = key; grid = new Map()
  for (const o of list) {
    const g = o.geometry
    if (!g.boundingSphere) g.computeBoundingSphere()
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld)
      sphere.copy(g.boundingSphere!).applyMatrix4(m4)
      const k = cellOf(sphere.center.x, sphere.center.z)
      let cell = grid.get(k)
      if (!cell) grid.set(k, cell = [])
      cell.push({ o, i, c: sphere.center.clone(), r: sphere.radius })
    }
  }
}

/** How far the camera may sit from `from` along `dir` (≤ far); fades small blockers on the way. `skip`: the avatar. */
export function clearView(scene: THREE.Scene, camera: THREE.Camera, from: THREE.Vector3, dir: THREE.Vector3, far: number, skip: THREE.Object3D, min = 1.2) {
  const now = performance.now()
  if (now - listedAt > 2000) { // what's in the scene changes rarely (pets load, the floor changes)
    listedAt = now; meshes = []
    const rows: THREE.InstancedMesh[] = []
    scene.traverseVisible(o => {
      if (!(o as THREE.Mesh).isMesh || !testable(o as THREE.Mesh) || under(o, skip)) return
      if ((o as THREE.InstancedMesh).isInstancedMesh) rows.push(o as THREE.InstancedMesh)
      else meshes.push(o as THREE.Mesh)
    })
    buildGrid(rows)
  }
  ray.set(from, dir); ray.near = 0.35; ray.far = far; ray.camera = camera
  const hits: THREE.Intersection[] = []
  for (const o of meshes) {
    if (!o.visible || !o.parent) continue
    const g = o.geometry
    if (!g.boundingSphere) g.computeBoundingSphere()
    sphere.copy(g.boundingSphere!).applyMatrix4(o.matrixWorld)
    if (nearSegment(sphere.center, sphere.radius)) o.raycast(ray, hits)
  }
  // instanced pieces in the cells along the ray (and their neighbours, for pieces that reach across a border)
  const seen = new Set<number>()
  for (let t = 0; t <= far + CELL; t += CELL / 2) {
    const s = Math.min(t, far), x = from.x + dir.x * s, z = from.z + dir.z * s
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const k = cellOf(x + dx * CELL, z + dz * CELL)
      if (seen.has(k)) continue
      seen.add(k)
      for (const p of grid.get(k) ?? []) {
        if (!p.o.visible || !p.o.parent || !nearSegment(p.c, p.r)) continue
        p.o.getMatrixAt(p.i, m4); probe.geometry = p.o.geometry; probe.material = p.o.material; probe.matrixWorld.multiplyMatrices(p.o.matrixWorld, m4)
        const got: THREE.Intersection[] = []
        probe.raycast(ray, got)
        for (const h of got) hits.push({ ...h, object: p.o, instanceId: p.i })
      }
    }
  }
  hits.sort((a, b) => a.distance - b.distance)

  let limit = far
  const fade = new Set<THREE.Mesh>()
  for (const h of hits) {
    const o = h.object as THREE.Mesh
    const mat = faded.get(o) ?? o.material
    if ((mat as THREE.Material).transparent && !faded.has(o)) continue // glass, water: you can see through it already
    const g = o.geometry
    if (!g.boundingBox) g.computeBoundingBox()
    const many = h.instanceId != null
    // an instanced piece (one post of a row) is sized by its own matrix
    if (many) (o as THREE.InstancedMesh).getMatrixAt(h.instanceId!, m4)
    box.copy(g.boundingBox!).applyMatrix4(many ? m4.premultiply(o.matrixWorld) : o.matrixWorld).getSize(size)
    const mid = size.x + size.y + size.z - Math.max(size.x, size.y, size.z) - Math.min(size.x, size.y, size.z)
    if (mid >= WALL) { limit = Math.max(min, h.distance - 0.3); break } // the nearest wall: stop in front of it
    if (!many && !Array.isArray(mat)) fade.add(o) // one piece of an instanced row can't fade alone, and a thin one isn't worth pulling in for
  }
  // fade what's in the way now, bring back the rest
  for (const o of fade) if (!faded.has(o)) { faded.set(o, o.material as THREE.Material); o.material = seeThrough(o.material as THREE.Material) }
  for (const [o, m] of faded) if (!fade.has(o)) { o.material = m; faded.delete(o) }
  return limit
}


