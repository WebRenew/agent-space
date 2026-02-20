export function ExteriorFlowerBed({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.68, 0.68, 0.24, 18]} />
        <meshStandardMaterial color="#6B7280" />
      </mesh>
      {[
        [-0.22, 0.34, 0.16, '#FB7185'],
        [0.24, 0.3, -0.08, '#F97316'],
        [0.12, 0.32, 0.22, '#FACC15'],
        [-0.1, 0.28, -0.18, '#A78BFA'],
      ].map(([x, y, z, color], index) => (
        <mesh key={index} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshStandardMaterial color={color as string} />
        </mesh>
      ))}
    </group>
  )
}
