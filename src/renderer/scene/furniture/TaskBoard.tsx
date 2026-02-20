export function TaskBoard({
  position,
}: {
  position: [number, number, number]
}) {
  const noteColors = ['#FFE066', '#FF6B6B', '#4ECDC4', '#96CEB4', '#FF6B35', '#DDA0DD']
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.8, 1.2, 0.05]} />
        <meshStandardMaterial color="#F5F0EB" />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const row = Math.floor(i / 4)
        const col = i % 4
        return (
          <mesh
            key={i}
            position={[-0.6 + col * 0.4, 0.35 - row * 0.35, 0.03]}
          >
            <boxGeometry args={[0.3, 0.28, 0.01]} />
            <meshStandardMaterial color={noteColors[i % noteColors.length]} />
          </mesh>
        )
      })}
    </group>
  )
}
