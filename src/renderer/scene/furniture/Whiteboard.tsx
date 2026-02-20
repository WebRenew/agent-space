export function Whiteboard({
  position,
}: {
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[2.5, 1.5, 0.05]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.3, 0.2, 0.03]}>
        <boxGeometry args={[0.8, 0.02, 0.01]} />
        <meshStandardMaterial color="#4ECDC4" />
      </mesh>
      <mesh position={[0.2, -0.1, 0.03]}>
        <boxGeometry args={[0.6, 0.02, 0.01]} />
        <meshStandardMaterial color="#FF6B35" />
      </mesh>
    </group>
  )
}
