export interface ModelPricing {
  inputPerMillion: number
  outputPerMillion: number
}

/**
 * API pricing as of 2025. Model names are matched by prefix.
 * Users on Claude Max don't pay per-token, but we calculate
 * the "would-have-cost" for the savings indicator.
 */
const MODEL_PRICING: Array<{ pattern: RegExp; pricing: ModelPricing }> = [
  { pattern: /claude-opus-4/i, pricing: { inputPerMillion: 15, outputPerMillion: 75 } },
  { pattern: /claude-sonnet-4/i, pricing: { inputPerMillion: 3, outputPerMillion: 15 } },
  { pattern: /claude-haiku/i, pricing: { inputPerMillion: 0.80, outputPerMillion: 4 } },
  { pattern: /claude-3-5-sonnet/i, pricing: { inputPerMillion: 3, outputPerMillion: 15 } },
  { pattern: /claude-3-opus/i, pricing: { inputPerMillion: 15, outputPerMillion: 75 } },
  // Default fallback (Sonnet pricing)
  { pattern: /claude/i, pricing: { inputPerMillion: 3, outputPerMillion: 15 } },
]

/** Get pricing for a model string. Falls back to Sonnet pricing. */
export function getModelPricing(model: string): ModelPricing {
  for (const { pattern, pricing } of MODEL_PRICING) {
    if (pattern.test(model)) return pricing
  }
  return { inputPerMillion: 3, outputPerMillion: 15 }
}

/** Calculate cost for a single model's token usage */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricing(model)
  return (inputTokens * pricing.inputPerMillion + outputTokens * pricing.outputPerMillion) / 1_000_000
}

/** Calculate total cost across all models */
export function calculateTotalCost(
  tokensByModel: Record<string, { input: number; output: number }>
): number {
  let total = 0
  for (const [model, tokens] of Object.entries(tokensByModel)) {
    total += calculateCost(model, tokens.input, tokens.output)
  }
  return total
}

/** Short display name for a model ID */
export function shortModelName(model: string): string {
  const match = model.match(/claude-(opus|sonnet|haiku)-(\d+)(?:-(\d+))?/i)
  if (match) {
    const [, family, major, minor] = match
    return minor ? `${family}-${major}.${minor}` : `${family}-${major}`
  }
  return model
}
