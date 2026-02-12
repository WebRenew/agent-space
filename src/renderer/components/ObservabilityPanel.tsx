import { useState } from 'react'
import { useAgentsByTokenUsage } from '../store/selectors'
import { AgentTokenList } from './observability/AgentTokenList'
import { AgentTokenDetail } from './observability/AgentTokenDetail'
import { SessionTotals } from './observability/SessionTotals'

export function ObservabilityPanel() {
  const agents = useAgentsByTokenUsage()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0] ?? null

  return (
    <div className="flex flex-col h-full bg-[#16162a] text-white">
      {/* Two-column body */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Agent list */}
        <AgentTokenList
          agents={agents}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />

        {/* Right: Selected agent detail */}
        {selected ? (
          <AgentTokenDetail agent={selected} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            No active agents
          </div>
        )}
      </div>

      {/* Bottom: Session totals */}
      <SessionTotals agents={agents} />
    </div>
  )
}
