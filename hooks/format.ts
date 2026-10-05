// Small formatters and color tokens for the dashboard text.

export const COLOR = {
  text: '#ededed',
  soft: '#c4c4c4',
  dim: '#8a8a8a',
  faint: '#4a4a4a',
  track: '#333333',
  accent: '#d97757',
  ok: '#5fbf6a',
  warn: '#e8a33d',
  bad: '#e5534b',
  sky: '#6cb6ff',
  violet: '#b392f0',
  teal: '#4fd1c5',
  gold: '#e3c06a',
  rose: '#f0809a',
}

export const level = (p: number) => (p >= 80 ? COLOR.bad : p >= 50 ? COLOR.warn : COLOR.ok)

const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

// A smooth bar in eighth-cell steps: `full` solid cells, one partial cell, then `rest` empty track cells.
export function gauge(p: number, cells: number) {
  const units = Math.min(cells * 8, Math.max(0, Math.round((p / 100) * cells * 8)))
  const full = Math.floor(units / 8)
  const part = EIGHTHS[units % 8]!
  return { full: '█'.repeat(full), part, rest: ' '.repeat(cells - full - (part ? 1 : 0)) }
}

const EFFORT: Record<string, string> = { low: COLOR.sky, medium: COLOR.teal, high: COLOR.gold }

export const effortColor = (effort: string) => EFFORT[effort] ?? COLOR.accent

export function tokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

function span(mins: number) {
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

export function until(iso: string | undefined, now: number) {
  if (!iso) return ''
  return span(Math.max(0, Math.round((Date.parse(iso) - now) / 60000)))
}

// Elapsed time: seconds under a minute, then the same shape as `until`.
export function elapsed(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return span(Math.floor(s / 60))
}

export const usd = (n: number) => `$${n < 10 ? n.toFixed(2) : n.toFixed(1)}`

// "claude-opus-5-5[1m]" -> "Opus 5.5"; anything else passes through.
export function modelName(id: string) {
  const m = id.replace(/\[.*\]$/, '').match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/)
  if (!m) return id
  const family = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1)
  return m[3] && m[3].length <= 2 ? `${family} ${m[2]}.${m[3]}` : `${family} ${m[2]}`
}
