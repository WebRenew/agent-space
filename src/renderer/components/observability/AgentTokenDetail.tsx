import type { Agent, AgentStatus } from '../../types'
import { Sparkline } from './Sparkline'
import { CostBreakdown } from './CostBreakdown'

interface Props {
  agent: Agent
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

function formatUptime(seconds: number): string {
  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

function MetricCard({ label, value, sparkline, color }: {
  label: string
  value: string
  sparkline: number[]
  color: string
}) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-mono font-semibold" style={{ color }}>
        {value}
      </div>
      {sparkline.length > 1 && (
        <div className="mt-2 h-8">
          <Sparkline data={sparkline} color={color} />
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-lg font-mono font-semibold text-white/90">{value}</div>
    </div>
  )
}

export function AgentTokenDetail({ agent }: Props) {
  const uptime = Math.floor((Date.now() - agent.started_at) / 1000)

  const inputSeries = agent.sessionStats.tokenHistory.map((s) => s.tokens_input)
  const outputSeries = agent.sessionStats.tokenHistory.map((s) => s.tokens_output)

  return (
    <div className="flex-1 p-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: statusColor(agent.status) }}
        />
        <div>
          <h2 className="text-lg font-semibold">{agent.name}</h2>
          <span className="text-xs text-white/40">{agent.model || 'detecting...'}</span>
        </div>
      </div>

      {/* Token metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricCard
          label="Tokens In"
          value={agent.tokens_input.toLocaleString()}
          sparkline={inputSeries}
          color="#60a5fa"
        />
        <MetricCard
          label="Tokens Out"
          value={agent.tokens_output.toLocaleString()}
          sparkline={outputSeries}
          color="#4ade80"
        />
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatBox label="Files Modified" value={String(agent.files_modified)} />
        <StatBox label="Commits" value={String(agent.commitCount)} />
        <StatBox label="Uptime" value={formatUptime(uptime)} />
      </div>

      {/* Cost breakdown by model */}
      <CostBreakdown tokensByModel={agent.sessionStats.tokensByModel} />
    </div>
  )
}
