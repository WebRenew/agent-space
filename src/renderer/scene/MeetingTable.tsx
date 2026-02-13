import { useMemo } from 'react'
import { AgentCharacter } from './AgentCharacter'
import type { Agent } from '../types'

interface MeetingTableProps {
  position: [number, number, number]
  subagents: Agent[]
}

/**
 * Meeting/conference table where subagents gather.
 * Positioned to the right side of the office, away from desks.
 * Subagents sit around the table in evenly spaced seats.
 */

const MAX_SEATS = 6
const TABLE_RADIUS = 1.2

function computeSeatPosition(
  seatIndex: number,
  totalSeats: number,
  tableCenter: [number, number, number]
): [number, number, number] {
  const angle = (seatIndex / Math.max(totalSeats, MAX_SEATS)) * Math.PI * 2 - Math.PI / 2
  const seatRadius = TABLE_RADIUS + 0.5
  return [
    tableCenter[0] + Math.cos(angle) * seatRadius,
    tableCenter[1],
    tableCenter[2] + Math.sin(angle) * seatRadius,
  ]
}

export function MeetingTable({ position, subagents }: MeetingTableProps) {
  const seats = useMemo(() => {
    return subagents.slice(0, MAX_SEATS).map((agent, i) => ({
      agent,
      position: computeSeatPosition(i, subagents.length, position),
    }))
  }, [subagents, position])

  return (
    <group>
      {/* Round conference table */}
      <group position={position}>
        {/* Table top */}
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, 0.06, 24]} />
          <meshStandardMaterial color="#5c4033" roughness={0.6} />
        </mesh>
        {/* Table leg (center pedestal) */}
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 0.72, 8]} />
          <meshStandardMaterial color="#4a3728" metalness={0.2} roughness={0.8} />
        </mesh>
        {/* Base */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.04, 12]} />
          <meshStandardMaterial color="#4a3728" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>

      {/* Chairs around the table */}
      {seats.map(({ agent, position: seatPos }, i) => {
        const angle = (i / Math.max(subagents.length, MAX_SEATS)) * Math.PI * 2 - Math.PI / 2
        const chairX = position[0] + Math.cos(angle) * (TABLE_RADIUS + 0.15)
        const chairZ = position[2] + Math.sin(angle) * (TABLE_RADIUS + 0.15)

        return (
          <group key={agent.id}>
            {/* Chair */}
            <group position={[chairX, 0, chairZ]} rotation={[0, -angle + Math.PI, 0]}>
              {/* Seat */}
              <mesh position={[0, 0.42, 0]} castShadow>
                <boxGeometry args={[0.4, 0.05, 0.4]} />
                <meshStandardMaterial color="#374151" />
              </mesh>
              {/* Back */}
              <mesh position={[0, 0.65, -0.18]} castShadow>
                <boxGeometry args={[0.38, 0.4, 0.05]} />
                <meshStandardMaterial color="#374151" />
              </mesh>
              {/* Legs */}
              {[[-0.15, 0.21, 0.15], [0.15, 0.21, 0.15], [-0.15, 0.21, -0.15], [0.15, 0.21, -0.15]].map(([lx, ly, lz], li) => (
                <mesh key={li} position={[lx, ly, lz]}>
                  <boxGeometry args={[0.04, 0.42, 0.04]} />
                  <meshStandardMaterial color="#1f2937" />
                </mesh>
              ))}
            </group>
            {/* Agent character at seat position */}
            <AgentCharacter agent={agent} position={seatPos} />
          </group>
        )
      })}
    </group>
  )
}
