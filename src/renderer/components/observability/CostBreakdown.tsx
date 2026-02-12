import { calculateCost, shortModelName } from '../../lib/costEngine'

interface Props {
  tokensByModel: Record<string, { input: number; output: number }>
}

export function CostBreakdown({ tokensByModel }: Props) {
  const entries = Object.entries(tokensByModel)
  if (entries.length === 0) {
    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-white/30 text-sm">
        No token data yet
      </div>
    )
  }

  let totalCost = 0
  const rows = entries.map(([model, tokens]) => {
    const cost = calculateCost(model, tokens.input, tokens.output)
    totalCost += cost
    return { model, ...tokens, cost }
  })

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Cost Breakdown</div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.model} className="flex justify-between text-sm">
            <span className="text-white/60 font-mono text-xs">{shortModelName(row.model)}</span>
            <span className="text-[#fbbf24] font-mono">${row.cost.toFixed(4)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
        <span className="text-white/50 text-sm">Total</span>
        <span className="text-[#fbbf24] font-mono font-semibold">${totalCost.toFixed(4)}</span>
      </div>
    </div>
  )
}
