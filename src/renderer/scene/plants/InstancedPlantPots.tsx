import { useRef, useMemo, useLayoutEffect } from 'react'
import type { InstancedMesh } from 'three'
import { Object3D } from 'three'

interface PlantLayout {
  position: [number, number, number]
  scale: number
}

export function InstancedPlantPots({
  plants,
}: {
  plants: PlantLayout[]
}) {
  const potsRef = useRef<InstancedMesh>(null)
  const matrixHelper = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    const mesh = potsRef.current
    if (!mesh) return

    for (let index = 0; index < plants.length; index += 1) {
      const plant = plants[index]
      matrixHelper.position.set(
        plant.position[0],
        plant.position[1] + 0.2 * plant.scale,
        plant.position[2]
      )
      matrixHelper.rotation.set(0, 0, 0)
      matrixHelper.scale.setScalar(plant.scale)
      matrixHelper.updateMatrix()
      mesh.setMatrixAt(index, matrixHelper.matrix)
    }

    mesh.count = plants.length
    mesh.instanceMatrix.needsUpdate = true
  }, [matrixHelper, plants])

  if (plants.length === 0) return null

  return (
    <instancedMesh ref={potsRef} args={[undefined, undefined, plants.length]} castShadow>
      <cylinderGeometry args={[0.2, 0.15, 0.4, 8]} />
      <meshStandardMaterial color="#8B4513" />
    </instancedMesh>
  )
}
