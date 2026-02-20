export function ParkPath({
  from,
  to,
  width = 1.2,
}: {
  from: [number, number]
  to: [number, number]
  width?: number
}) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dx, dz)
  const cx = (from[0] + to[0]) / 2
  const cz = (from[1] + to[1]) / 2

  return (
    <mesh rotation={[-Math.PI / 2, 0, angle]} position={[cx, -0.008, cz]} receiveShadow>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color="#C4A882" />
    </mesh>
  )
}
