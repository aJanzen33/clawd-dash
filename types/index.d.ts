export type Mood = 'idle' | 'working' | 'done' | 'relax'

export type Limit = { percent: number; resetsAt?: string }

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
}

declare module 'claude-code' {
  interface PluginState {
    'clawd-dash': { stats: Stats }
  }
}
