import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

interface AttentionBubbleProps {
  position: [number, number, number]
}

export function AttentionBubble({ position }: AttentionBubbleProps) {
  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    // Gentle bob
    groupRef.current.position.y = position[1] + Math.sin(t * 2.5) * 0.06
    // Pulse scale
    const pulse = 1 + Math.sin(t * 3) * 0.1
    groupRef.current.scale.setScalar(pulse)
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Amber circle background */}
      <mesh>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#ffb400" transparent opacity={0.85} emissive="#ffb400" emissiveIntensity={0.3} />
      </mesh>

      {/* Exclamation mark - vertical bar */}
      <mesh position={[0, 0.02, 0.14]}>
        <boxGeometry args={[0.03, 0.1, 0.02]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Exclamation mark - dot */}
      <mesh position={[0, -0.06, 0.14]}>
        <boxGeometry args={[0.03, 0.03, 0.02]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Amber glow */}
      <pointLight color="#ffb400" intensity={0.6} distance={2} />
    </group>
  )
}
