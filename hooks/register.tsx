import { atom, read, update } from 'claude-code'
import type { Register, SessionMeasureInput } from 'claude-code'

import type { Limit, Mood, Stats } from '../types'
import { columnsFor, statsGrid } from './dash'
import { readGit } from './git'
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
// Room left of the dash for Claude Code's own mode label ("auto mode on ·").
const MODE_LABEL_COLS = 20
// Keeps the uptime and reset countdowns current between stat changes.
const CLOCK_MS = 15_000
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
// Tools after which the working tree may have changed.
const GIT_TOOLS = new Set([...EDIT_TOOLS, 'Bash'])

const stats = atom({ plugin: 'clawd-dash', key: 'stats' } as const, { added: 0, removed: 0, files: [], tools: 0 } as Stats)

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
    const [usage, model, prompts, version, git] = await Promise.all([
      $.session.usage(),
      $.session.model(),
      $.session.turns(),
      $.session.version(),
      readGit(argv => $.process.run(argv)),
    ])
    await update($, stats, s => ({
      ...s,
      ...fromUsage(usage),
      model,
      prompts,
      version: version.base ?? version.version,
      startedAt: usage.startedAt,
      git,
    }))

    $.clock.every(CLOCK_MS, () => $.ui.invalidate('ui.render'))

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

  on('turn.start', async ($, e, next) => {
    setMood('working')
    const prompts = await $.session.turns()
    await update($, stats, s => ({ ...s, prompts }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      setMood('done')
      const git = await readGit(argv => $.process.run(argv))
      await update($, stats, s => ({ ...s, lastTurnMs: e.durationMs, git }))
    }
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
    const tool = String(e.tool)
    await update($, stats, s => ({ ...s, tools: s.tools + 1 }))
    if (GIT_TOOLS.has(tool)) {
      const git = await readGit(argv => $.process.run(argv))
      await update($, stats, s => ({ ...s, git }))
    }
    if (!EDIT_TOOLS.has(tool) || res.result === undefined || res.isError) return res

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
    const el = $.ui.resolve(e)
    const { Box, Text, Image } = el
    const s = await read($, stats)
    const cols = e.viewport?.columns ?? 120
    const showScene = cols >= MIN_COLS_FOR_SCENE
    site = showScene ? e.requestId : undefined
    const room = cols - MODE_LABEL_COLS - (showScene ? SCENE_COLS + 2 : 0)

    return (
      <Box flexDirection="row" gap={2}>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {statsGrid(el, s, columnsFor(room), Date.now())}
          <Text dimColor wrap="truncate">{e.props.hint}</Text>
        </Box>
        {showScene ? (
          <Image key="scene" source={frame()} columns={SCENE_COLS} rows={SCENE_ROWS} alt={`clawd ${mood}`} />
        ) : null}
      </Box>
    )
  })
}
