import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { Object3D, Color, MathUtils } from 'three'

const CLOUD_COUNT = 12
const CLOUD_ORBIT_RADIUS = 50
const CLOUD_Y_MIN = 12
const CLOUD_Y_MAX = 20
const _cloudDummy = new Object3D()
const _cloudColor = new Color()

interface CloudData {
  angle: number
  y: number
  speed: number
  scaleX: number
  scaleY: number
  scaleZ: number
  puffCount: number
  puffOffsets: [number, number, number][]
}

export function CloudField({ daylightRef }: { daylightRef: React.RefObject<number> }) {
  const groupRef = useRef<InstancedMesh>(null)

  const clouds = useMemo<CloudData[]>(() => {
    return Array.from({ length: CLOUD_COUNT }, (_, i) => {
      const puffCount = 3 + Math.floor(Math.random() * 3)
      return {
        angle: (i / CLOUD_COUNT) * Math.PI * 2 + Math.random() * 0.4,
        y: CLOUD_Y_MIN + Math.random() * (CLOUD_Y_MAX - CLOUD_Y_MIN),
        speed: 0.008 + Math.random() * 0.012,
        scaleX: 2.5 + Math.random() * 2.5,
        scaleY: 0.6 + Math.random() * 0.4,
        scaleZ: 1.5 + Math.random() * 1.5,
        puffCount,
        puffOffsets: Array.from({ length: puffCount }, () => [
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.8,
        ]) as [number, number, number][],
      }
    })
  }, [])

  const totalPuffs = useMemo(() => clouds.reduce((sum, c) => sum + c.puffCount, 0), [clouds])

  useFrame(({ clock }) => {
    const mesh = groupRef.current
    if (!mesh) return

    const dl = daylightRef.current ?? 1
    const visibility = MathUtils.clamp(dl * 1.5, 0, 1)
    if (visibility <= 0.01) {
      mesh.visible = false
      return
    }
    mesh.visible = true

    const t = clock.getElapsedTime()
    let idx = 0

    _cloudColor.setRGB(
      MathUtils.lerp(0.15, 1, dl),
      MathUtils.lerp(0.17, 1, dl),
      MathUtils.lerp(0.25, 1, dl)
    )

    for (const cloud of clouds) {
      const a = cloud.angle + t * cloud.speed
      const cx = Math.cos(a) * CLOUD_ORBIT_RADIUS
      const cz = Math.sin(a) * CLOUD_ORBIT_RADIUS * 0.5 - 10

      for (let p = 0; p < cloud.puffCount; p++) {
        const off = cloud.puffOffsets[p]
        _cloudDummy.position.set(
          cx + off[0] * cloud.scaleX * 0.5,
          cloud.y + off[1],
          cz + off[2] * cloud.scaleZ * 0.5
        )
        _cloudDummy.scale.set(
          cloud.scaleX * (0.7 + p * 0.15),
          cloud.scaleY * (0.8 + p * 0.1),
          cloud.scaleZ * (0.6 + p * 0.12)
        )
        _cloudDummy.updateMatrix()
        mesh.setMatrixAt(idx, _cloudDummy.matrix)
        mesh.setColorAt(idx, _cloudColor)
        idx++
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={groupRef} args={[undefined, undefined, totalPuffs]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
