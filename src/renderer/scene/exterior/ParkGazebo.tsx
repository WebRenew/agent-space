export function ParkGazebo({ position }: { position: [number, number, number] }) {
  const postCount = 6
  const radius = 2.2
  const roofRadius = 2.8
  const postHeight = 2.8
  const roofPeakY = 4.2

  return (
    <group position={position}>
      {/* Floor platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[radius + 0.3, 6]} />
        <meshStandardMaterial color="#B8976A" />
      </mesh>
      {/* Posts */}
      {Array.from({ length: postCount }, (_, i) => {
        const angle = (i / postCount) * Math.PI * 2
        return (
          <mesh
            key={`gazebo-post-${i}`}
            position={[Math.cos(angle) * radius, postHeight / 2 + 0.05, Math.sin(angle) * radius]}
            castShadow
          >
            <cylinderGeometry args={[0.08, 0.1, postHeight, 8]} />
            <meshStandardMaterial color="#F5F0E8" />
          </mesh>
        )
      })}
      {/* Railing between posts */}
      {Array.from({ length: postCount }, (_, i) => {
        const a1 = (i / postCount) * Math.PI * 2
        const a2 = ((i + 1) / postCount) * Math.PI * 2
        const x1 = Math.cos(a1) * radius
        const z1 = Math.sin(a1) * radius
        const x2 = Math.cos(a2) * radius
        const z2 = Math.sin(a2) * radius
        const cx = (x1 + x2) / 2
        const cz = (z1 + z2) / 2
        const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2)
        const yaw = Math.atan2(x2 - x1, z2 - z1)
        return (
          <mesh
            key={`gazebo-rail-${i}`}
            position={[cx, 0.7, cz]}
            rotation={[0, yaw, 0]}
          >
            <boxGeometry args={[0.06, 0.06, len]} />
            <meshStandardMaterial color="#E8E0D8" />
          </mesh>
        )
      })}
      {/* Roof — hexagonal cone */}
      <mesh position={[0, postHeight + 0.05, 0]} castShadow>
        <coneGeometry args={[roofRadius, roofPeakY - postHeight, 6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Roof trim ring */}
      <mesh position={[0, postHeight + 0.02, 0]}>
        <cylinderGeometry args={[roofRadius + 0.05, roofRadius + 0.05, 0.08, 6]} />
        <meshStandardMaterial color="#6B3E26" />
      </mesh>
      {/* Finial on top */}
      <mesh position={[0, roofPeakY + 0.15, 0]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#D4A040" />
      </mesh>
    </group>
  )
}
