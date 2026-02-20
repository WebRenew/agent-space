export function ParkPond({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <circleGeometry args={[2.2, 32]} />
        <meshStandardMaterial color="#5B9BD5" transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial color="#4A7A5A" />
      </mesh>
    </group>
  )
}
