import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { Object3D, Color } from 'three'

interface ExplosionProps {
  position: [number, number, number]
  onComplete: () => void
}

const PARTICLE_COUNT = 40
const DURATION = 2
const GRAVITY = -4
const dummy = new Object3D()

const COLORS = ['#f87171', '#fb923c', '#ef4444', '#dc2626', '#fbbf24', '#f97316']

interface Particle {
  vx: number
  vy: number
  vz: number
  rotSpeed: number
  color: Color
  scale: number
}

export function Explosion({ position, onComplete }: ExplosionProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const startTime = useRef<number | null>(null)
  const completedRef = useRef(false)
  const [done, setDone] = useState(false)

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2
      const elevation = (Math.random() - 0.2) * Math.PI
      const force = 2 + Math.random() * 3
      return {
        vx: Math.cos(angle) * Math.cos(elevation) * force,
        vy: Math.sin(elevation) * force + 1,
        vz: Math.sin(angle) * Math.cos(elevation) * force,
        rotSpeed: (Math.random() - 0.5) * 12,
        color: new Color(COLORS[Math.floor(Math.random() * COLORS.length)]),
        scale: 0.03 + Math.random() * 0.04
      }
    })
  }, [])

  useFrame((state) => {
    if (!meshRef.current || completedRef.current) return

    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime
    }

    const elapsed = state.clock.elapsedTime - startTime.current
    if (elapsed > DURATION) {
      completedRef.current = true
      setDone(true)
      onComplete()
      return
    }

    const progress = elapsed / DURATION
    const opacity = progress > 0.5 ? 1 - (progress - 0.5) / 0.5 : 1

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      const t = elapsed

      dummy.position.set(
        position[0] + p.vx * t,
        position[1] + p.vy * t + 0.5 * GRAVITY * t * t,
        position[2] + p.vz * t
      )

      dummy.rotation.set(
        t * p.rotSpeed,
        t * p.rotSpeed * 0.6,
        t * p.rotSpeed * 0.3
      )

      const s = p.scale * opacity
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      meshRef.current.setColorAt(i, p.color)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  if (done) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  )
}
