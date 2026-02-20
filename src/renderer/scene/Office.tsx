import { useMemo, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { Room } from './Room'
import { Lighting } from './Lighting'
import { Desk } from './Desk'
import { AgentCharacter } from './AgentCharacter'
import { CelebrationEffect } from './CelebrationEffect'
import { CloudField } from './exterior/CloudField'
import { MonitorWall } from './furniture/MonitorWall'
import { Bookshelf } from './furniture/Bookshelf'
import { CoffeeStation } from './furniture/CoffeeStation'
import { ServerRack } from './furniture/ServerRack'
import { TaskBoard } from './furniture/TaskBoard'
import { Whiteboard } from './furniture/Whiteboard'
import { InstancedPlantPots } from './plants/InstancedPlantPots'
import { PlantLeaves } from './plants/PlantLeaves'
import { ExteriorTree } from './exterior/ExteriorTree'
import { ExteriorBench } from './exterior/ExteriorBench'
import { ExteriorLamp } from './exterior/ExteriorLamp'
import { ExteriorFlowerBed } from './exterior/ExteriorFlowerBed'
import { useAgentStore } from '../store/agents'
import { resolveOfficeDeskLayout } from '../lib/office-layout'
import type { AgentStatus } from '../types'

const SCREEN_COLORS: Record<AgentStatus, { color: string; emissive: string; intensity: number }> = {
  idle: { color: '#1a1a2e', emissive: '#334155', intensity: 0.1 },
  thinking: { color: '#facc15', emissive: '#facc15', intensity: 0.4 },
  streaming: { color: '#22C55E', emissive: '#22C55E', intensity: 0.5 },
  tool_calling: { color: '#a78bfa', emissive: '#a78bfa', intensity: 0.4 },
  waiting: { color: '#fb923c', emissive: '#fb923c', intensity: 0.3 },
  error: { color: '#ef4444', emissive: '#ef4444', intensity: 0.6 },
  done: { color: '#22d3ee', emissive: '#22d3ee', intensity: 0.3 },
}

const PIZZA_CENTER: [number, number, number] = [0, 0, -6.35]
const PIZZA_RADIUS = 1.75
const DANCE_CENTER: [number, number, number] = [0, 0, -5]
const DANCE_RADIUS = 2.2
const SNACK_BAR_POSITION: [number, number, number] = [10.05, 0, 0.95]

type ExteriorPropType = 'tree' | 'bench' | 'lamp' | 'flower'

interface PlantLayout {
  position: [number, number, number]
  scale: number
}

interface ExteriorPropLayout {
  type: ExteriorPropType
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}

const OFFICE_PLANT_LAYOUT: PlantLayout[] = [
  { position: [-10, 0, -13], scale: 1.15 },
  { position: [10, 0, -13], scale: 1.15 },
  { position: [-10, 0, 3], scale: 1.1 },
  { position: [10, 0, 3], scale: 1.1 },
  { position: [-3.4, 0, -13.1], scale: 0.9 },
  { position: [3.4, 0, -13.1], scale: 0.9 },
  { position: [-10.05, 0, -5.2], scale: 0.85 },
  { position: [10.05, 0, -5.2], scale: 0.85 },
  { position: [0, 0, 2.8], scale: 0.95 },
  { position: [6.8, 0, -11.3], scale: 0.75 },
  { position: [-6.9, 0, -11.2], scale: 0.78 },
  { position: [-1.8, 0, -11.7], scale: 0.82 },
  { position: [1.8, 0, -11.7], scale: 0.82 },
  { position: [0, 0, -12.5], scale: 0.88 },
  { position: [-6.9, 0, 2.4], scale: 0.84 },
  { position: [6.9, 0, 2.4], scale: 0.84 },
]

const EXTERIOR_PROP_LAYOUT: ExteriorPropLayout[] = [
  // Near trees (close to office)
  { type: 'tree', position: [-15.5, 0, -15.8], scale: 1.5 },
  { type: 'tree', position: [15.5, 0, -15.8], scale: 1.5 },
  { type: 'tree', position: [-15.5, 0, 5.8], scale: 1.35 },
  { type: 'tree', position: [15.5, 0, 5.8], scale: 1.35 },
  { type: 'tree', position: [-1.6, 0, 7.2], scale: 1.2 },
  { type: 'tree', position: [1.6, 0, 7.2], scale: 1.2 },
  // Near amenities
  { type: 'bench', position: [-13.4, 0, -6.2], rotation: [0, Math.PI / 2, 0], scale: 1.15 },
  { type: 'bench', position: [13.4, 0, -6.2], rotation: [0, -Math.PI / 2, 0], scale: 1.15 },
  { type: 'bench', position: [0, 0, 7.8], rotation: [0, Math.PI, 0], scale: 1 },
  { type: 'lamp', position: [-13.8, 0, -12], scale: 1 },
  { type: 'lamp', position: [13.8, 0, -12], scale: 1 },
  { type: 'lamp', position: [0, 0, 8.9], scale: 0.92 },
  { type: 'flower', position: [-11.8, 0, 4.8], scale: 1.15 },
  { type: 'flower', position: [11.8, 0, 4.8], scale: 1.15 },
  { type: 'flower', position: [-4.8, 0, 6.6], scale: 0.95 },
  { type: 'flower', position: [4.8, 0, 6.6], scale: 0.95 },
  // Park trees (mid-distance ring)
  { type: 'tree', position: [-22, 0, -20], scale: 1.8 },
  { type: 'tree', position: [22, 0, -20], scale: 1.6 },
  { type: 'tree', position: [-20, 0, 10], scale: 1.7 },
  { type: 'tree', position: [20, 0, 10], scale: 1.5 },
  { type: 'tree', position: [-8, 0, 14], scale: 1.4 },
  { type: 'tree', position: [8, 0, 14], scale: 1.3 },
  { type: 'tree', position: [0, 0, -24], scale: 1.6 },
  { type: 'tree', position: [-14, 0, -24], scale: 1.45 },
  { type: 'tree', position: [14, 0, -24], scale: 1.55 },
  // Park benches along paths
  { type: 'bench', position: [2.2, 0, 14], rotation: [0, 0, 0], scale: 1 },
  { type: 'bench', position: [-18, 0, -5], rotation: [0, Math.PI / 2, 0], scale: 1 },
  { type: 'bench', position: [18, 0, -5], rotation: [0, -Math.PI / 2, 0], scale: 1 },
  // Park lamps along paths
  { type: 'lamp', position: [-16, 0, -5], scale: 1.05 },
  { type: 'lamp', position: [16, 0, -5], scale: 1.05 },
  { type: 'lamp', position: [0, 0, 16], scale: 0.95 },
  { type: 'lamp', position: [0, 0, -20], scale: 1 },
  // Flower beds near pond
  { type: 'flower', position: [15.5, 0, -21], scale: 1.2 },
  { type: 'flower', position: [20.5, 0, -20], scale: 1.1 },
  // Far trees (background depth)
  { type: 'tree', position: [-30, 0, -28], scale: 2.0 },
  { type: 'tree', position: [30, 0, -28], scale: 1.9 },
  { type: 'tree', position: [-28, 0, 15], scale: 1.8 },
  { type: 'tree', position: [28, 0, 15], scale: 1.7 },
  { type: 'tree', position: [-35, 0, -10], scale: 2.1 },
  { type: 'tree', position: [35, 0, -10], scale: 1.95 },
  { type: 'tree', position: [-18, 0, -32], scale: 1.7 },
  { type: 'tree', position: [18, 0, -32], scale: 1.85 },
  { type: 'tree', position: [0, 0, 20], scale: 1.6 },
  { type: 'tree', position: [-10, 0, 20], scale: 1.5 },
  { type: 'tree', position: [10, 0, 20], scale: 1.45 },
]

function computePizzaSeat(index: number, total: number): [number, number, number] {
  const count = Math.max(3, total)
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2
  return [
    PIZZA_CENTER[0] + Math.cos(angle) * PIZZA_RADIUS,
    0,
    PIZZA_CENTER[2] + Math.sin(angle) * PIZZA_RADIUS,
  ]
}

function computeDanceSeat(index: number, total: number): [number, number, number] {
  const count = Math.max(3, total)
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2
  return [
    DANCE_CENTER[0] + Math.cos(angle) * DANCE_RADIUS,
    0,
    DANCE_CENTER[2] + Math.sin(angle) * DANCE_RADIUS,
  ]
}

function OfficeSnackBar({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  const snackColors = ['#F59E0B', '#EF4444', '#22C55E', '#3B82F6', '#EC4899', '#8B5CF6', '#06B6D4', '#F97316']

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 1, 0.95]} />
        <meshStandardMaterial color="#7C5841" />
      </mesh>
      <mesh position={[0, 1.02, -0.02]} castShadow>
        <boxGeometry args={[2.95, 0.08, 1.02]} />
        <meshStandardMaterial color="#D9C2A0" />
      </mesh>
      <mesh position={[0, 1.72, -0.43]} castShadow>
        <boxGeometry args={[2.95, 1.7, 0.12]} />
        <meshStandardMaterial color="#F2ECE3" />
      </mesh>
      {[1.1, 1.62].map((y) => (
        <mesh key={`snack-shelf-${y}`} position={[0, y, -0.36]} castShadow>
          <boxGeometry args={[2.5, 0.05, 0.18]} />
          <meshStandardMaterial color="#8B6B52" />
        </mesh>
      ))}
      {snackColors.map((color, index) => {
        const row = Math.floor(index / 4)
        const col = index % 4
        return (
          <mesh
            key={`snack-jar-${index}`}
            position={[-0.98 + col * 0.65, 1.2 + row * 0.54, -0.28]}
          >
            <cylinderGeometry args={[0.11, 0.11, 0.2, 14]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      })}
      {[-0.55, -0.05, 0.45].map((x, index) => (
        <group key={`snack-tap-${index}`} position={[x, 1.2, 0.08]}>
          <mesh>
            <boxGeometry args={[0.12, 0.22, 0.12]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0, -0.12, 0.06]}>
            <boxGeometry args={[0.04, 0.06, 0.08]} />
            <meshStandardMaterial color="#94A3B8" />
          </mesh>
        </group>
      ))}
      <mesh position={[1.18, 0.72, 0.07]} castShadow>
        <boxGeometry args={[0.48, 1.44, 0.6]} />
        <meshStandardMaterial color="#D1D5DB" />
      </mesh>
      <mesh position={[1.18, 1.2, 0.39]}>
        <boxGeometry args={[0.42, 0.9, 0.04]} />
        <meshStandardMaterial color="#F8FAFC" />
      </mesh>
      <mesh position={[1.03, 1.2, 0.43]}>
        <boxGeometry args={[0.02, 0.24, 0.02]} />
        <meshStandardMaterial color="#64748B" />
      </mesh>
      {[-0.82, 0, 0.82].map((x) => (
        <group key={`snack-stool-${x}`} position={[x, 0, 1]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
            <meshStandardMaterial color="#2F3E4F" />
          </mesh>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.6, 10]} />
            <meshStandardMaterial color="#4B5563" />
          </mesh>
        </group>
      ))}
      <mesh position={[-1.14, 1.12, 0.16]}>
        <cylinderGeometry args={[0.18, 0.12, 0.1, 14]} />
        <meshStandardMaterial color="#A16207" />
      </mesh>
      {[[-1.2, 1.19, 0.13], [-1.1, 1.2, 0.2], [-1.08, 1.2, 0.11]].map((pos, index) => (
        <mesh key={`snack-fruit-${index}`} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color={index === 0 ? '#EF4444' : index === 1 ? '#F97316' : '#FACC15'} />
        </mesh>
      ))}
      <mesh position={[0.1, 2.2, -0.36]}>
        <boxGeometry args={[1.4, 0.32, 0.04]} />
        <meshStandardMaterial
          color="#FDE68A"
          emissive="#FBBF24"
          emissiveIntensity={0.45}
        />
      </mesh>
    </group>
  )
}

export function Office() {
  const agents = useAgentStore((s) => s.agents)
  const daylightRef = useRef(1)

  const deskAgents = useMemo(() => agents.filter((a) => !a.isSubagent), [agents])
  const deskLayout = useMemo(
    () => resolveOfficeDeskLayout(Math.max(14, deskAgents.length)),
    [deskAgents.length]
  )

  const visibleAgents = useMemo(
    () => deskAgents.slice(0, deskLayout.length),
    [deskAgents, deskLayout.length]
  )

  const partyAgents = useMemo(
    () => visibleAgents
      .filter((agent) => agent.activeCelebration === 'pizza_party')
      .sort((a, b) => a.deskIndex - b.deskIndex),
    [visibleAgents]
  )
  const partySeatByAgentId = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    for (let index = 0; index < partyAgents.length; index += 1) {
      map.set(partyAgents[index].id, computePizzaSeat(index, partyAgents.length))
    }
    return map
  }, [partyAgents])
  const partyStartedAt = partyAgents.reduce(
    (latest, agent) => Math.max(latest, agent.celebrationStartedAt ?? 0),
    0
  )

  const danceAgents = useMemo(
    () => visibleAgents
      .filter((agent) => agent.activeCelebration === 'dance_party')
      .sort((a, b) => a.deskIndex - b.deskIndex),
    [visibleAgents]
  )
  const danceSeatByAgentId = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    for (let index = 0; index < danceAgents.length; index += 1) {
      map.set(danceAgents[index].id, computeDanceSeat(index, danceAgents.length))
    }
    return map
  }, [danceAgents])
  const danceStartedAt = danceAgents.reduce(
    (latest, agent) => Math.max(latest, agent.celebrationStartedAt ?? 0),
    0
  )

  return (
    <group>
      <Lighting daylightRef={daylightRef} />
      <CloudField daylightRef={daylightRef} />
      <Room />

      {/* Agent desks + characters + celebrations */}
      {visibleAgents.map((agent) => {
        const layout = deskLayout[agent.deskIndex]
        if (!layout) return null
        const partyTarget = partySeatByAgentId.get(agent.id)
          ?? danceSeatByAgentId.get(agent.id)
          ?? null
        const lookAt = partySeatByAgentId.has(agent.id)
          ? PIZZA_CENTER
          : danceSeatByAgentId.has(agent.id)
            ? DANCE_CENTER
            : null
        return (
          <group key={agent.id}>
            <Desk
              position={layout.position}
              rotation={layout.rotation}
              screen={SCREEN_COLORS[agent.status]}
            />
            <AgentCharacter
              agent={agent}
              position={layout.facing}
              rotation={[0, 0, 0]}
              partyTargetPosition={partyTarget}
              partyLookAtPosition={lookAt}
            />
            {agent.activeCelebration && agent.celebrationStartedAt
              && agent.activeCelebration !== 'pizza_party'
              && agent.activeCelebration !== 'dance_party' && (
              <CelebrationEffect
                type={agent.activeCelebration}
                startedAt={agent.celebrationStartedAt}
                position={layout.position}
              />
            )}
          </group>
        )
      })}

      {/* Pizza party gathering */}
      {partyAgents.length > 0 && (
        <group>
          <mesh position={[PIZZA_CENTER[0], 0.72, PIZZA_CENTER[2]]} castShadow receiveShadow>
            <cylinderGeometry args={[1.1, 1.1, 0.08, 26]} />
            <meshStandardMaterial color="#6B4226" />
          </mesh>
          <mesh position={[PIZZA_CENTER[0], 0.38, PIZZA_CENTER[2]]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.72, 10]} />
            <meshStandardMaterial color="#4A2F1D" />
          </mesh>
          <mesh position={[PIZZA_CENTER[0], 0.03, PIZZA_CENTER[2]]}>
            <cylinderGeometry args={[0.55, 0.55, 0.05, 14]} />
            <meshStandardMaterial color="#4A2F1D" />
          </mesh>

          {/* Pizza boxes + slices */}
          <mesh position={[PIZZA_CENTER[0] - 0.22, 0.79, PIZZA_CENTER[2] - 0.08]}>
            <boxGeometry args={[0.48, 0.04, 0.48]} />
            <meshStandardMaterial color="#C87830" />
          </mesh>
          <mesh position={[PIZZA_CENTER[0] + 0.18, 0.81, PIZZA_CENTER[2] + 0.05]}>
            <cylinderGeometry args={[0.19, 0.19, 0.02, 24]} />
            <meshStandardMaterial color="#F4D03F" />
          </mesh>
          {Array.from({ length: 6 }, (_, index) => {
            const angle = (index / 6) * Math.PI * 2
            return (
              <mesh
                key={`slice-${index}`}
                position={[
                  PIZZA_CENTER[0] + 0.18 + Math.cos(angle) * 0.09,
                  0.825,
                  PIZZA_CENTER[2] + 0.05 + Math.sin(angle) * 0.09,
                ]}
                rotation={[0, -angle, 0]}
              >
                <boxGeometry args={[0.075, 0.008, 0.03]} />
                <meshStandardMaterial color="#C45050" />
              </mesh>
            )
          })}

          {partyStartedAt > 0 && (
            <CelebrationEffect
              key={`pizza-party-${partyStartedAt}`}
              type="pizza_party"
              startedAt={partyStartedAt}
              position={PIZZA_CENTER}
            />
          )}
        </group>
      )}

      {/* Dance party floor */}
      {danceAgents.length > 0 && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[DANCE_CENTER[0], 0.005, DANCE_CENTER[2]]}>
            <circleGeometry args={[DANCE_RADIUS + 0.6, 32]} />
            <meshStandardMaterial color="#2A1B3D" />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const tileAngle = (i / 8) * Math.PI * 2
            const tileColors = ['#c084fc', '#818cf8', '#f472b6', '#22d3ee', '#facc15', '#fb923c', '#4ade80', '#f87171']
            return (
              <mesh
                key={`dance-tile-${i}`}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[
                  DANCE_CENTER[0] + Math.cos(tileAngle) * 1.3,
                  0.008,
                  DANCE_CENTER[2] + Math.sin(tileAngle) * 1.3,
                ]}
              >
                <boxGeometry args={[0.6, 0.6, 0.003]} />
                <meshStandardMaterial
                  color={tileColors[i]}
                  emissive={tileColors[i]}
                  emissiveIntensity={0.5}
                />
              </mesh>
            )
          })}
          {danceStartedAt > 0 && (
            <CelebrationEffect
              key={`dance-party-${danceStartedAt}`}
              type="dance_party"
              startedAt={danceStartedAt}
              position={DANCE_CENTER}
            />
          )}
        </group>
      )}

      {/* Office furniture detail props */}
      <TaskBoard position={[0, 1.8, -13.85]} />
      <MonitorWall position={[10.88, 0, -5]} rotation={[0, -Math.PI / 2, 0]} />
      <Bookshelf position={[-6, 1.1, -13.7]} />
      <CoffeeStation position={[6, 0, -12]} />
      <ServerRack position={[9.5, 1, -12]} />
      <Whiteboard position={[2, 1.5, -13.85]} />

      {/* Office snack bar */}
      <OfficeSnackBar position={SNACK_BAR_POSITION} rotation={[0, -Math.PI / 2, 0]} />

      {/* Plants throughout the office */}
      <InstancedPlantPots plants={OFFICE_PLANT_LAYOUT} />
      {OFFICE_PLANT_LAYOUT.map((plant, index) => (
        <PlantLeaves key={`office-plant-${index}`} position={plant.position} scale={plant.scale} />
      ))}

      {/* Exterior props */}
      {EXTERIOR_PROP_LAYOUT.map((prop, index) => {
        if (prop.type === 'tree') {
          return (
            <ExteriorTree
              key={`exterior-tree-${index}`}
              position={prop.position}
              scale={prop.scale}
            />
          )
        }
        if (prop.type === 'bench') {
          return (
            <ExteriorBench
              key={`exterior-bench-${index}`}
              position={prop.position}
              rotation={prop.rotation}
              scale={prop.scale}
            />
          )
        }
        if (prop.type === 'lamp') {
          return (
            <ExteriorLamp
              key={`exterior-lamp-${index}`}
              position={prop.position}
              scale={prop.scale}
            />
          )
        }
        return (
          <ExteriorFlowerBed
            key={`exterior-flower-${index}`}
            position={prop.position}
            scale={prop.scale}
          />
        )
      })}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        target={[0, 1, -6]}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={8}
        maxDistance={18}
        enablePan={false}
      />
    </group>
  )
}
