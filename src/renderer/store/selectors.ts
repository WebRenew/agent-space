import { useAgentStore } from './agents'

/** Total tokens across all agents, broken down by model */
export function useAggregateTokensByModel() {
  return useAgentStore((s) => {
    const result: Record<string, { input: number; output: number }> = {}
    for (const agent of s.agents) {
      for (const [model, tokens] of Object.entries(agent.sessionStats.tokensByModel)) {
        const prev = result[model] ?? { input: 0, output: 0 }
        result[model] = {
          input: prev.input + tokens.input,
          output: prev.output + tokens.output,
        }
      }
    }
    return result
  })
}

/** Sorted agents by total token usage (descending) */
export function useAgentsByTokenUsage() {
  return useAgentStore((s) =>
    [...s.agents].sort(
      (a, b) =>
        b.tokens_input + b.tokens_output - (a.tokens_input + a.tokens_output)
    )
  )
}
