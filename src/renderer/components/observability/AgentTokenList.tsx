import type { Agent, AgentStatus } from '../../types'

interface Props {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function statusColor(status: AgentStatus): string {
  switch (status) {
    case 'streaming': return '#60a5fa'
    case 'thinking': return '#c084fc'
    case 'tool_calling': return '#fbbf24'
    case 'error': return '#ef4444'
    case 'done': return '#4ade80'
    case 'waiting': return '#9ca3af'
    default: return '#6b7280'
  }
}

export function AgentTokenList({ agents, selectedId, onSelect }: Props) {
  const maxTokens = Math.max(...agents.map((a) => a.tokens_input + a.tokens_output), 1)

  return (
    <div className="w-56 border-r border-white/10 overflow-y-auto">
      <div className="p-3 text-xs text-white/40 uppercase tracking-wider">
        Agents ({agents.length})
      </div>
      {agents.map((agent) => {
        const total = agent.tokens_input + agent.tokens_output
        const pct = (total / maxTokens) * 100
        const isSelected = agent.id === selectedId

        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors ${
              isSelected ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate">{agent.name}</span>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: statusColor(agent.status) }}
              />
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400/60 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-xs text-white/40 mt-1 font-mono">
              {formatTokens(total)} tokens
            </div>
          </button>
        )
      })}
    </div>
  )
}
