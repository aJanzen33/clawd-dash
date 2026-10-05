// Small formatters and color tokens for the dashboard text.

export const COLOR = {
  text: '#ededed',
  dim: '#8a8a8a',
  faint: '#4a4a4a',
  accent: '#d97757',
  ok: '#5fbf6a',
  warn: '#e8a33d',
  bad: '#e5534b',
}

const RING = ['○', '◔', '◑', '◕', '●']

export const ring = (p: number) => RING[Math.min(4, Math.max(0, Math.round(p / 25)))]!

export const level = (p: number) => (p >= 80 ? COLOR.bad : p >= 50 ? COLOR.warn : COLOR.ok)

export function bar(p: number, cells = 10) {
  const on = Math.min(cells, Math.max(0, Math.round((p / 100) * cells)))
  return { on: '▰'.repeat(on), off: '▱'.repeat(cells - on) }
}

export function tokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export function until(iso: string | undefined, now: number) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

export const usd = (n: number) => `$${n < 10 ? n.toFixed(2) : n.toFixed(1)}`

// "claude-opus-5-5[1m]" -> "Opus 5.5"; anything else passes through.
export function modelName(id: string) {
  const m = id.replace(/\[.*\]$/, '').match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/)
  if (!m) return id
  const family = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1)
  return m[3] && m[3].length <= 2 ? `${family} ${m[2]}.${m[3]}` : `${family} ${m[2]}`
}
