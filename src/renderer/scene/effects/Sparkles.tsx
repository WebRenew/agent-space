import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { Object3D, Color } from 'three'

interface SparklesProps {
  position: [number, number, number]
  onComplete: () => void
}

const PARTICLE_COUNT = 24
const DURATION = 2.5
const dummy = new Object3D()

const COLORS = ['#fbbf24', '#f59e0b', '#fcd34d', '#fde68a', '#fffbeb']

interface Particle {
  vx: number
  vy: number
  vz: number
  twinkleSpeed: number
  twinklePhase: number
  color: Color
  scale: number
}

export function Sparkles({ position, onComplete }: SparklesProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const startTime = useRef<number | null>(null)
  const completedRef = useRef(false)
  const [done, setDone] = useState(false)

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2
      const elevation = (Math.random() - 0.3) * Math.PI
      const force = 0.8 + Math.random() * 1.2
      return {
        vx: Math.cos(angle) * Math.cos(elevation) * force,
        vy: Math.sin(elevation) * force + 0.5,
        vz: Math.sin(angle) * Math.cos(elevation) * force,
        twinkleSpeed: 6 + Math.random() * 8,
        twinklePhase: Math.random() * Math.PI * 2,
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
    const opacity = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      const t = elapsed

      dummy.position.set(
        position[0] + p.vx * t,
        position[1] + p.vy * t - 0.5 * t * t,
        position[2] + p.vz * t
      )

      // Twinkle: oscillate scale
      const twinkle = 0.5 + 0.5 * Math.sin(t * p.twinkleSpeed + p.twinklePhase)
      const s = p.scale * opacity * (0.5 + twinkle * 0.5)
      dummy.scale.set(s, s, s)

      dummy.rotation.set(0, t * 3, t * 2)
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
