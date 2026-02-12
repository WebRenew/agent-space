import type { Agent } from '../../types'
import { useSettingsStore } from '../../store/settings'
import { calculateTotalCost } from '../../lib/costEngine'

interface Props {
  agents: Agent[]
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/50 text-xs uppercase tracking-wider">{label}</span>
      <span className="font-mono font-semibold text-sm" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}

export function SessionTotals({ agents }: Props) {
  const subscription = useSettingsStore((s) => s.settings.subscription)

  const totalIn = agents.reduce((s, a) => s + a.tokens_input, 0)
  const totalOut = agents.reduce((s, a) => s + a.tokens_output, 0)

  const allModelTokens: Record<string, { input: number; output: number }> = {}
  for (const agent of agents) {
    for (const [model, t] of Object.entries(agent.sessionStats.tokensByModel)) {
      const prev = allModelTokens[model] ?? { input: 0, output: 0 }
      allModelTokens[model] = { input: prev.input + t.input, output: prev.output + t.output }
    }
  }

  const cost = Object.keys(allModelTokens).length > 0
    ? calculateTotalCost(allModelTokens)
    : (totalIn * 3 + totalOut * 15) / 1_000_000

  const isMax = subscription?.type === 'max_5x' || subscription?.type === 'max_20x'

  return (
    <div className="border-t border-white/10 px-4 py-3 flex items-center gap-6 text-sm bg-black/40 shrink-0">
      <Stat label="Total In" value={formatTokens(totalIn)} />
      <Stat label="Total Out" value={formatTokens(totalOut)} />

      {isMax && cost > 0 ? (
        <>
          <Stat label="Saved" value={`$${cost.toFixed(3)}`} color="#4ade80" />
          <div className="ml-auto flex items-center gap-2 text-emerald-400 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-emerald-400/15 font-medium">
              Claude Max
            </span>
            <span>Saved ~${cost.toFixed(2)} this session</span>
          </div>
        </>
      ) : (
        <Stat label="Est. Cost" value={`$${cost.toFixed(3)}`} color="#fbbf24" />
      )}
    </div>
  )
}
