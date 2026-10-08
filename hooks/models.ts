// Tokens per answering model, summed over every step of the session, subagents included.
import type { TurnUsage } from 'claude-code'

import { COLOR, modelName } from './format'

export type ModelRow = { name: string; tokens: number; share: number }

// Every token the request was billed over: uncached input, output and both cache counts.
export function addUsage(byModel: Record<string, number>, u: TurnUsage): Record<string, number> {
  const n = u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
  const name = modelName(u.model)
  return { ...byModel, [name]: (byModel[name] ?? 0) + n }
}

// Largest first; past `max` rows the smallest models share the last one.
export function modelRows(byModel: Record<string, number>, max: number): ModelRow[] {
  const total = Object.values(byModel).reduce((a, b) => a + b, 0)
  if (!total) return []
  const rows = Object.entries(byModel)
    .map(([name, tokens]) => ({ name, tokens, share: (tokens / total) * 100 }))
    .sort((a, b) => b.tokens - a.tokens)
  if (rows.length <= max) return rows
  const rest = rows.slice(max - 1)
  return [
    ...rows.slice(0, max - 1),
    {
      name: `+${rest.length} more`,
      tokens: rest.reduce((a, r) => a + r.tokens, 0),
      share: rest.reduce((a, r) => a + r.share, 0),
    },
  ]
}

const FAMILY: Record<string, string> = { Fable: COLOR.accent, Opus: COLOR.violet, Sonnet: COLOR.sky, Haiku: COLOR.teal }

export const familyColor = (name: string) => FAMILY[name.split(' ')[0]!] ?? COLOR.soft
