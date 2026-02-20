export function ParkFountain({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base pool */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.6, 1.8, 0.3, 24]} />
        <meshStandardMaterial color="#9CA3B0" />
      </mesh>
      {/* Water surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.28, 0]}>
        <circleGeometry args={[1.5, 24]} />
        <meshStandardMaterial color="#6BAADC" transparent opacity={0.7} />
      </mesh>
      {/* Inner pedestal */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.5, 0.9, 16]} />
        <meshStandardMaterial color="#B0B8C4" />
      </mesh>
      {/* Upper bowl */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.3, 0.25, 18]} />
        <meshStandardMaterial color="#A0A8B4" />
      </mesh>
      {/* Upper water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.26, 0]}>
        <circleGeometry args={[0.65, 18]} />
        <meshStandardMaterial color="#6BAADC" transparent opacity={0.65} />
      </mesh>
      {/* Spout column */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.5, 10]} />
        <meshStandardMaterial color="#B8C0CC" />
      </mesh>
      {/* Water spout tip */}
      <mesh position={[0, 1.85, 0]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial
          color="#8BCAED"
          emissive="#5BA8D0"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Cascading water streams (4 arcs) */}
      {Array.from({ length: 4 }, (_, i) => {
        const angle = (i / 4) * Math.PI * 2
        return (
          <mesh
            key={`fountain-stream-${i}`}
            position={[Math.cos(angle) * 0.35, 1.0, Math.sin(angle) * 0.35]}
            rotation={[0.3 * Math.cos(angle), 0, 0.3 * Math.sin(angle)]}
          >
            <cylinderGeometry args={[0.03, 0.01, 0.6, 6]} />
            <meshStandardMaterial
              color="#8BCAED"
              emissive="#5BA8D0"
              emissiveIntensity={0.2}
              transparent
              opacity={0.6}
            />
          </mesh>
        )
      })}
    </group>
  )
}
