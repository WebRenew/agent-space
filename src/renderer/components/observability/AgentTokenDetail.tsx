import type { Agent, AgentStatus } from '../../types'
import { Sparkline } from './Sparkline'
import { CostBreakdown } from './CostBreakdown'

interface Props {
  agent: Agent
}

function statusColor(status: AgentStatus): string {
  switch (status) {
    case 'streaming': return '#d4a040'
    case 'thinking': return '#c87830'
    case 'tool_calling': return '#d4a040'
    case 'error': return '#c45050'
    case 'done': return '#548C5A'
    case 'waiting': return '#74747C'
    default: return '#595653'
  }
}

function formatUptime(seconds: number): string {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${seconds}s`
}

function MetricCard({ label, value, sparkline, color }: {
  label: string; value: string; sparkline: number[]; color: string
}) {
  return (
    <div className="glass-panel" style={{ borderRadius: 6, padding: 14 }}>
      <div style={{ fontSize: 10, color: '#74747C', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontFamily: 'inherit', fontWeight: 600, color }}>
        {value}
      </div>
      {sparkline.length > 1 && (
        <div style={{ marginTop: 8, height: 28 }}>
          <Sparkline data={sparkline} color={color} />
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel" style={{ borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 10, color: '#74747C', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontFamily: 'inherit', fontWeight: 600, color: '#9A9692' }}>
        {value}
      </div>
    </div>
  )
}

export function AgentTokenDetail({ agent }: Props) {
  const uptime = Math.floor((Date.now() - agent.started_at) / 1000)
  const inputSeries = agent.sessionStats.tokenHistory.map((s) => s.tokens_input)
  const outputSeries = agent.sessionStats.tokenHistory.map((s) => s.tokens_output)

  return (
    <div style={{ flex: 1, padding: 18, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: statusColor(agent.status) }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#9A9692' }}>{agent.name}</div>
          <span style={{ fontSize: 11, color: '#595653' }}>{agent.model || 'detecting...'}</span>
        </div>
      </div>

      {/* Token metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <MetricCard label="TOKENS IN" value={agent.tokens_input.toLocaleString()} sparkline={inputSeries} color="#d4a040" />
        <MetricCard label="TOKENS OUT" value={agent.tokens_output.toLocaleString()} sparkline={outputSeries} color="#548C5A" />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
        <StatBox label="FILES" value={String(agent.files_modified)} />
        <StatBox label="COMMITS" value={String(agent.commitCount)} />
        <StatBox label="UPTIME" value={formatUptime(uptime)} />
      </div>

      {/* Cost breakdown */}
      <CostBreakdown tokensByModel={agent.sessionStats.tokensByModel} />
    </div>
  )
}
