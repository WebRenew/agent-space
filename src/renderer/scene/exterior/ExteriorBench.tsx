export function ExteriorBench({
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[1.8, 0.08, 0.38]} />
        <meshStandardMaterial color="#7A5A3A" />
      </mesh>
      <mesh position={[0, 0.75, -0.14]} castShadow>
        <boxGeometry args={[1.8, 0.4, 0.08]} />
        <meshStandardMaterial color="#7A5A3A" />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} castShadow>
          <boxGeometry args={[0.1, 0.5, 0.1]} />
          <meshStandardMaterial color="#4B5563" />
        </mesh>
      ))}
    </group>
  )
}
