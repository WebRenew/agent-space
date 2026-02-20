export function ExteriorLamp({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 3, 12]} />
        <meshStandardMaterial color="#4B5563" />
      </mesh>
      <mesh position={[0, 3.15, 0]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#FDE68A" emissive="#FCD34D" emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}
