import { useAgentStore } from '../store/agents'
import { useSettingsStore } from '../store/settings'
import { calculateTotalCost } from '../lib/costEngine'

export function StatsBar() {
  const agents = useAgentStore((s) => s.agents)
  const subscription = useSettingsStore((s) => s.settings.subscription)

  const activeCount = agents.filter(
    (a) => a.status !== 'idle' && a.status !== 'done'
  ).length
  const totalTokensIn = agents.reduce((s, a) => s + a.tokens_input, 0)
  const totalTokensOut = agents.reduce((s, a) => s + a.tokens_output, 0)
  const totalFiles = agents.reduce((s, a) => s + a.files_modified, 0)

  // Aggregate per-model tokens for accurate cost
  const allModelTokens = agents.reduce<Record<string, { input: number; output: number }>>(
    (acc, a) => {
      for (const [model, t] of Object.entries(a.sessionStats?.tokensByModel ?? {})) {
        const prev = acc[model] ?? { input: 0, output: 0 }
        acc[model] = { input: prev.input + t.input, output: prev.output + t.output }
      }
      return acc
    },
    {}
  )
  const cost = Object.keys(allModelTokens).length > 0
    ? calculateTotalCost(allModelTokens)
    : (totalTokensIn * 3 + totalTokensOut * 15) / 1_000_000

  const isMax = subscription?.type === 'max_5x' || subscription?.type === 'max_20x'

  return (
    <div className="flex items-center gap-6 px-5 py-2.5 bg-black/60 backdrop-blur-sm rounded-b-xl border border-white/10 border-t-0 text-white text-sm">
      <Stat label="Active" value={activeCount} color="#4ade80" />
      <Stat label="Tokens In" value={formatNum(totalTokensIn)} />
      <Stat label="Tokens Out" value={formatNum(totalTokensOut)} />
      <Stat label="Files" value={totalFiles} />

      {isMax && cost > 0 ? (
        <>
          <Stat label="Saved" value={`$${cost.toFixed(3)}`} color="#4ade80" />
          <span className="px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 text-xs font-medium">
            Max
          </span>
        </>
      ) : (
        <Stat label="Est. Cost" value={`$${cost.toFixed(3)}`} color="#fbbf24" />
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  color
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/50 text-xs uppercase tracking-wider">{label}</span>
      <span className="font-mono font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
