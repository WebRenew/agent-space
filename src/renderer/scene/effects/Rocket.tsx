import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { Object3D, Color } from 'three'

interface RocketProps {
  position: [number, number, number]
  onComplete: () => void
}

const PARTICLE_COUNT = 30
const DURATION = 3
const dummy = new Object3D()

const COLORS = ['#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#ffffff']

interface Particle {
  offsetX: number
  offsetZ: number
  speed: number
  accel: number
  rotSpeed: number
  color: Color
  scale: number
}

export function Rocket({ position, onComplete }: RocketProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const startTime = useRef<number | null>(null)
  const completedRef = useRef(false)
  const [done, setDone] = useState(false)

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2
      const spread = Math.random() * 0.3
      return {
        offsetX: Math.cos(angle) * spread,
        offsetZ: Math.sin(angle) * spread,
        speed: 1.5 + Math.random() * 2,
        accel: 1 + Math.random() * 1.5,
        rotSpeed: (Math.random() - 0.5) * 8,
        color: new Color(COLORS[Math.floor(Math.random() * COLORS.length)]),
        scale: 0.02 + Math.random() * 0.03
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
    const opacity = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      const t = elapsed
      const y = p.speed * t + 0.5 * p.accel * t * t

      dummy.position.set(
        position[0] + p.offsetX * (1 + t * 0.5),
        position[1] + y,
        position[2] + p.offsetZ * (1 + t * 0.5)
      )

      dummy.rotation.set(
        t * p.rotSpeed,
        t * p.rotSpeed * 0.5,
        0
      )

      const s = p.scale * opacity
      dummy.scale.set(s, s * 2, s)
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
