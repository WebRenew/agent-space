import { useMemo } from 'react'
import { useAgentStore } from './agents'
import type { Agent } from '../types'

/** Total tokens across all agents, broken down by model */
export function useAggregateTokensByModel(): Record<string, { input: number; output: number }> {
  const agents = useAgentStore((s) => s.agents)

  return useMemo(() => {
    const result: Record<string, { input: number; output: number }> = {}
    for (const agent of agents) {
      for (const [model, tokens] of Object.entries(agent.sessionStats.tokensByModel)) {
        const prev = result[model] ?? { input: 0, output: 0 }
        result[model] = {
          input: prev.input + tokens.input,
          output: prev.output + tokens.output,
        }
      }
    }
    return result
  }, [agents])
}

/** Sorted agents by total token usage (descending) */
export function useAgentsByTokenUsage(): Agent[] {
  const agents = useAgentStore((s) => s.agents)

  return useMemo(
    () =>
      [...agents].sort(
        (a, b) =>
          b.tokens_input + b.tokens_output - (a.tokens_input + a.tokens_output)
      ),
    [agents]
  )
}
