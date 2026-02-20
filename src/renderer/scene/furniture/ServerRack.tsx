export function ServerRack({
  position,
}: {
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.8, 2, 0.6]} />
        <meshStandardMaterial color="#1A1A2E" />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          position={[-0.2 + (i % 4) * 0.13, 0.7 - Math.floor(i / 4) * 0.3, 0.31]}
        >
          <boxGeometry args={[0.05, 0.05, 0.01]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#EF4444' : '#22C55E'}
            emissive={i % 3 === 0 ? '#EF4444' : '#22C55E'}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
    </group>
  )
}
