import { Canvas } from '@react-three/fiber'
import { Office } from '../../../scene/Office'
import { HUD } from '../../../hud/HUD'
import { useAgentStore } from '../../../store/agents'
import { CollapsibleSection } from '../CollapsibleSection'

/**
 * Wraps the existing R3F Canvas + Office scene + HUD overlay.
 * Uses `fill` mode so the canvas stretches when the row is resized.
 */
export function ScenePanel() {
  const selectAgent = useAgentStore((s) => s.selectAgent)

  return (
    <CollapsibleSection title="OFFICE" fill>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Canvas
          shadows
          camera={{
            position: [8, 7, 8],
            fov: 45,
            near: 0.1,
            far: 100,
          }}
          onPointerMissed={() => selectAgent(null)}
        >
          <Office />
        </Canvas>
        <HUD />
      </div>
    </CollapsibleSection>
  )
}
