export type Mood = 'idle' | 'working' | 'done' | 'relax'

export type Limit = { percent: number; resetsAt?: string }

export type Git = { branch: string; ahead: number; behind: number; dirty: number }

export type Stats = {
  fiveHour?: Limit
  sevenDay?: Limit
  contextPercent?: number
  contextTokens?: number
  contextWindow?: number
  costUsd?: number
  model?: string
  effort?: string
  added: number
  removed: number
  files: string[]
  startedAt?: number
  prompts?: number
  tools: number
  lastTurnMs?: number
  version?: string
  git?: Git | null
}

declare module 'claude-code' {
  interface PluginState {
    'clawd-dash': { stats: Stats }
  }
}
