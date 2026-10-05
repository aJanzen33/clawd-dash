import { atom, read, update } from 'claude-code'
import type { Register, SessionMeasureInput } from 'claude-code'

import type { Limit, Mood, Stats } from '../types'
import { COLOR, bar, level, modelName, ring, tokens, until, usd } from './format'
import { rasterize } from './raster'
import { DONE_SECONDS, sceneSvg } from './scene'

// The runtime has the ES2026 Uint8Array base64 methods; es2023's lib doesn't declare them.
declare global {
  interface Uint8Array {
    toBase64(): string
  }
}

const SITE = 'PromptHint'
const FRAME_MS = 125
const RELAX_AFTER_S = 180
// The scene is 100x18 art pixels; the left 24 columns are mostly empty dots.
const ART_W = 100
const ART_H = 18
const CROP_X = 24
const SCALE = 4
const SCENE_COLS = 36
const SCENE_ROWS = 4
const MIN_COLS_FOR_SCENE = 90
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

const stats = atom({ plugin: 'clawd-dash', key: 'stats' } as const, { added: 0, removed: 0, files: [] } as Stats)

let mood: Mood = 'idle'
let moodAt = Date.now()
let site: string | undefined

function setMood(next: Mood) {
  if (next === mood) return
  mood = next
  moodAt = Date.now()
}

function frame() {
  const t = (Date.now() - moodAt) / 1000
  if (mood === 'done' && t > DONE_SECONDS) setMood('idle')
  else if (mood === 'idle' && t > RELAX_AFTER_S) setMood('relax')
  const px = rasterize(sceneSvg(mood, (Date.now() - moodAt) / 1000), ART_W, ART_H, CROP_X, SCALE)
  return { rgba: px.rgba.toBase64(), width: px.width, height: px.height }
}

function fromUsage(u: Omit<SessionMeasureInput, 'changed'>): Partial<Stats> {
  const pick = (kind: string): Limit | undefined => {
    const r = u.rateLimits.find(l => l.kind === kind)
    return r && { percent: r.percentUsed, resetsAt: r.resetsAt }
  }
  return {
    fiveHour: pick('five_hour'),
    sevenDay: pick('seven_day'),
    contextPercent: u.context.percent,
    contextTokens: u.context.tokens,
    contextWindow: u.context.window,
    costUsd: u.cost?.usd,
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    moodAt = Date.now()
    const [usage, model] = await Promise.all([$.session.usage(), $.session.model()])
    await update($, stats, s => ({ ...s, ...fromUsage(usage), model }))

    let busy = false
    $.clock.every(FRAME_MS, () => {
      if (!site || busy) return
      busy = true
      void $.ui
        .blit({ requestId: site, key: 'scene', source: frame() })
        // Not mounted, or the terminal can't show pixels: wait for the next render.
        .then(r => { if (r.deny) site = undefined })
        .finally(() => { busy = false })
    })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, stats, s => ({ ...s, ...fromUsage(e) }))
    return next(e)
  })

  on('turn.start', ($, e, next) => {
    setMood('working')
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (!e.agentId) setMood('done')
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) {
      const effort = e.effort === undefined ? undefined : String(e.effort)
      await update($, stats, s => ({ ...s, model: e.model, effort }))
    }
    return yield* next(e)
  })

  on('tool.call', async ($, e, next) => {
    const res = await next(e)
    if (!EDIT_TOOLS.has(String(e.tool)) || res.result === undefined || res.isError) return res

    const r = res.result as { filePath?: string; type?: string; content?: string; structuredPatch?: { lines: string[] }[] }
    let added = 0
    let removed = 0
    for (const hunk of r.structuredPatch ?? []) {
      for (const line of hunk.lines) {
        if (line.startsWith('+')) added++
        else if (line.startsWith('-')) removed++
      }
    }
    if (r.type === 'create' && r.content) added += r.content.split('\n').length
    const path = r.filePath
    await update($, stats, s => ({
      ...s,
      added: s.added + added,
      removed: s.removed + removed,
      files: path && !s.files.includes(path) ? [...s.files, path] : s.files,
    }))
    return res
  })

  on('ui.render', { component: SITE }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)
    const { Box, Text, Image } = $.ui.resolve(e)
    const s = await read($, stats)
    const now = Date.now()
    const showScene = (e.viewport?.columns ?? 120) >= MIN_COLS_FOR_SCENE
    site = showScene ? e.requestId : undefined

    const limit = (label: string, l: Limit | undefined) =>
      l ? (
        <Box gap={1}>
          <Text color={level(l.percent)}>{ring(l.percent)}</Text>
          <Text bold color={COLOR.text}>{`${Math.round(l.percent)}%`}</Text>
          <Text color={COLOR.dim}>{`${label} · resets ${until(l.resetsAt, now)}`}</Text>
        </Box>
      ) : null

    const ctx = s.contextPercent ?? 0
    const ctxBar = bar(ctx)
    const fileCount = s.files.length

    return (
      <Box flexDirection="row" gap={2}>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          <Box gap={3}>
            {limit('5h', s.fiveHour)}
            {limit('7d', s.sevenDay)}
            {!s.fiveHour && !s.sevenDay ? <Text color={COLOR.dim}>no plan limits reported yet</Text> : null}
          </Box>
          <Box gap={1}>
            <Text color={COLOR.dim}>context</Text>
            <Text color={level(ctx)}>{ctxBar.on}</Text>
            <Text color={COLOR.faint}>{ctxBar.off}</Text>
            <Text bold color={COLOR.text}>{`${Math.round(ctx)}%`}</Text>
            <Text color={COLOR.dim}>
              {s.contextTokens !== undefined && s.contextWindow ? `${tokens(s.contextTokens)}/${tokens(s.contextWindow)}` : ''}
            </Text>
            <Text color={COLOR.dim}>·</Text>
            <Text color={COLOR.text}>{usd(s.costUsd ?? 0)}</Text>
          </Box>
          <Box gap={1}>
            <Text bold color={COLOR.accent}>{s.model ? modelName(s.model) : '…'}</Text>
            <Text color={COLOR.dim}>{s.effort ? `· ${s.effort}` : ''}</Text>
            <Text color={COLOR.dim}>·</Text>
            <Text color={COLOR.ok}>{`+${s.added}`}</Text>
            <Text color={COLOR.bad}>{`−${s.removed}`}</Text>
            <Text color={COLOR.dim}>{`${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}</Text>
          </Box>
          <Text dimColor wrap="truncate">{e.props.hint}</Text>
        </Box>
        {showScene ? (
          <Image key="scene" source={frame()} columns={SCENE_COLS} rows={SCENE_ROWS} alt={`clawd ${mood}`} />
        ) : null}
      </Box>
    )
  })
}
