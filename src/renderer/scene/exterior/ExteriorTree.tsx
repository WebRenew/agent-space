export function ExteriorTree({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.27, 1.8, 10]} />
        <meshStandardMaterial color="#6B4F3A" />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <sphereGeometry args={[0.95, 16, 12]} />
        <meshStandardMaterial color="#2F855A" />
      </mesh>
      <mesh position={[-0.45, 2.05, 0.25]} castShadow>
        <sphereGeometry args={[0.55, 14, 10]} />
        <meshStandardMaterial color="#3FA16E" />
      </mesh>
      <mesh position={[0.5, 1.95, -0.25]} castShadow>
        <sphereGeometry args={[0.5, 14, 10]} />
        <meshStandardMaterial color="#3FA16E" />
      </mesh>
    </group>
  )
}
