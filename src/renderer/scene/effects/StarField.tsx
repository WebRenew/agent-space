import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { Object3D, Color, MathUtils } from 'three'

const STAR_COUNT = 300
const SKY_RADIUS = 80
const _starDummy = new Object3D()
const _tmpStarColor = new Color()

interface StarData {
  theta: number
  phi: number
  baseScale: number
  twinkleSpeed: number
  twinklePhase: number
}

export function StarField({ daylightRef }: { daylightRef: React.RefObject<number> }) {
  const meshRef = useRef<InstancedMesh>(null)

  const stars = useMemo<StarData[]>(() => {
    return Array.from({ length: STAR_COUNT }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.random() * Math.PI * 0.45,
      baseScale: 0.08 + Math.random() * 0.12,
      twinkleSpeed: 2 + Math.random() * 4,
      twinklePhase: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return

    const visibility = MathUtils.clamp(1 - (daylightRef.current ?? 1) / 0.3, 0, 1)
    if (visibility <= 0.001) {
      mesh.visible = false
      return
    }
    mesh.visible = true

    const t = clock.getElapsedTime()

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = stars[i]
      const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.twinklePhase)
      const scale = star.baseScale * twinkle * visibility

      const sinPhi = Math.sin(star.phi)
      _starDummy.position.set(
        SKY_RADIUS * sinPhi * Math.cos(star.theta),
        SKY_RADIUS * Math.cos(star.phi),
        SKY_RADIUS * sinPhi * Math.sin(star.theta)
      )

      _starDummy.scale.setScalar(scale)
      _starDummy.updateMatrix()
      mesh.setMatrixAt(i, _starDummy.matrix)

      const brightness = 0.7 + 0.3 * twinkle
      _tmpStarColor.setRGB(brightness, brightness, brightness * 0.95)
      mesh.setColorAt(i, _tmpStarColor)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, STAR_COUNT]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
    </instancedMesh>
  )
}
