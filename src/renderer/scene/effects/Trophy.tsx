import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

interface TrophyProps {
  position: [number, number, number]
  onComplete: () => void
}

const DURATION = 3

export function Trophy({ position, onComplete }: TrophyProps) {
  const groupRef = useRef<Group>(null)
  const startTime = useRef<number | null>(null)
  const completedRef = useRef(false)
  const [done, setDone] = useState(false)

  useFrame((state) => {
    if (!groupRef.current || completedRef.current) return

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

    // Rise from y+1.5 to y+2.5
    const rise = 1.5 + progress * 1.0
    groupRef.current.position.set(position[0], position[1] + rise, position[2])

    // Slow spin on Y axis
    groupRef.current.rotation.y = elapsed * 1.5

    // Scale down in last 30%
    const scale = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1
    groupRef.current.scale.setScalar(scale)
  })

  if (done) return null

  return (
    <group ref={groupRef} position={[position[0], position[1] + 1.5, position[2]]}>
      {/* Cup body */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.08, 0.25, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Rim */}
      <mesh position={[0, 0.28, 0]}>
        <torusGeometry args={[0.12, 0.015, 8, 16]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Left handle */}
      <mesh position={[-0.16, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.012, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Right handle */}
      <mesh position={[0.16, 0.15, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.012, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Stem */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.08, 6]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Base */}
      <mesh position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.03, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Glow */}
      <pointLight position={[0, 0.2, 0]} color="#fbbf24" intensity={0.8} distance={2} />
    </group>
  )
}
