// The stats grid drawn under the prompt: limits, session, and repo columns.
import type { Elements } from 'claude-code'

import type { Limit, Stats } from '../types'
import { COLOR, effortColor, elapsed, gauge, level, modelName, tokens, until, usd } from './format'
import { familyColor, modelRows } from './models'

type El = Elements['terminal']

// Narrowest each column may get; the columns share any extra width evenly.
const LIMITS_W = 40
const SESSION_W = 32
const MODELS_W = 24
const REPO_W = 30
const SEP_W = 3
const BAR_CELLS = 14
const BRANCH_MAX = 22

// How many stat columns fit in `cols` terminal columns.
export function columnsFor(cols: number) {
  if (cols >= LIMITS_W + SESSION_W + MODELS_W + REPO_W + SEP_W * 3) return 4
  if (cols >= LIMITS_W + SESSION_W + MODELS_W + SEP_W * 2) return 3
  if (cols >= LIMITS_W + SESSION_W + SEP_W) return 2
  return 1
}

export function statsGrid({ Box, Text }: El, s: Stats, columns: number, now: number) {
  const row = (key: string, ...parts: (JSX.Element | null)[]) => (
    <Box key={key} gap={1} flexWrap="nowrap" overflow="hidden">{parts}</Box>
  )
  const sep = (key: string) => (
    <Box key={key} flexDirection="column" width={SEP_W} alignItems="center">
      <Text color={COLOR.faint}>│</Text>
      <Text color={COLOR.faint}>│</Text>
      <Text color={COLOR.faint}>│</Text>
    </Box>
  )
  const dot = <Text color={COLOR.faint}>·</Text>

  const meter = (label: string, labelColor: string, p: number, extra: JSX.Element | null) => {
    const g = gauge(p, BAR_CELLS)
    const c = level(p)
    return row(
      label,
      <Text bold color={labelColor}>{label.padEnd(7)}</Text>,
      <Box>
        {g.full ? <Text color={c}>{g.full}</Text> : null}
        {g.part ? <Text color={c} backgroundColor={COLOR.track}>{g.part}</Text> : null}
        {g.rest ? <Text backgroundColor={COLOR.track}>{g.rest}</Text> : null}
      </Box>,
      <Text bold color={COLOR.text}>{`${Math.round(p)}%`.padStart(4)}</Text>,
      extra,
    )
  }

  const limit = (label: string, labelColor: string, l: Limit | undefined) =>
    l
      ? meter(label, labelColor, l.percent, l.resetsAt ? (
          <Box gap={1}>
            <Text color={COLOR.gold}>↻</Text>
            <Text color={COLOR.soft}>{until(l.resetsAt, now)}</Text>
          </Box>
        ) : null)
      : row(label, <Text bold color={labelColor}>{label.padEnd(7)}</Text>, <Text color={COLOR.dim}>waiting for first reading</Text>)

  const ctx = s.contextPercent ?? 0
  const limits = (
    <Box key="limits" flexDirection="column" minWidth={LIMITS_W} flexGrow={1} flexShrink={0}>
      {limit('5h', COLOR.sky, s.fiveHour)}
      {limit('7d', COLOR.violet, s.sevenDay)}
      {meter('context', COLOR.teal, ctx, s.contextTokens !== undefined && s.contextWindow ? (
        <Box>
          <Text color={COLOR.teal}>{tokens(s.contextTokens)}</Text>
          <Text color={COLOR.dim}>{`/${tokens(s.contextWindow)}`}</Text>
        </Box>
      ) : null)}
    </Box>
  )

  const session = (
    <Box key="session" flexDirection="column" minWidth={SESSION_W} flexGrow={1} flexShrink={0}>
      {row(
        'model',
        <Text bold color={COLOR.accent}>{s.model ? modelName(s.model) : '…'}</Text>,
        s.effort ? dot : null,
        s.effort ? <Text bold color={effortColor(s.effort)}>{s.effort}</Text> : null,
      )}
      {row(
        'time',
        <Text bold color={COLOR.gold}>{usd(s.costUsd ?? 0)}</Text>,
        dot,
        <Text color={COLOR.dim}>up</Text>,
        <Text color={COLOR.sky}>{s.startedAt ? elapsed(now - s.startedAt) : '…'}</Text>,
        s.lastTurnMs !== undefined ? dot : null,
        s.lastTurnMs !== undefined ? <Text color={COLOR.dim}>last</Text> : null,
        s.lastTurnMs !== undefined ? <Text color={COLOR.rose}>{elapsed(s.lastTurnMs)}</Text> : null,
      )}
      {row(
        'counts',
        <Text bold color={COLOR.violet}>{String(s.prompts ?? 0)}</Text>,
        <Text color={COLOR.dim}>{s.prompts === 1 ? 'prompt' : 'prompts'}</Text>,
        dot,
        <Text bold color={COLOR.teal}>{String(s.tools)}</Text>,
        <Text color={COLOR.dim}>{s.tools === 1 ? 'tool' : 'tools'}</Text>,
      )}
    </Box>
  )

  const rows = modelRows(s.byModel ?? {}, 3)
  const models = (
    <Box key="models" flexDirection="column" minWidth={MODELS_W} flexGrow={1} flexShrink={0}>
      {rows.length
        ? rows.map(r => row(
            `model:${r.name}`,
            <Text bold color={familyColor(r.name)}>{r.name.padEnd(10)}</Text>,
            <Text color={COLOR.text}>{tokens(r.tokens).padStart(5)}</Text>,
            <Text color={COLOR.dim}>{`${Math.round(r.share)}%`.padStart(4)}</Text>,
          ))
        : row('model:none', <Text color={COLOR.dim}>no tokens yet</Text>)}
    </Box>
  )

  const git = s.git
  const branch = git && git.branch.length > BRANCH_MAX ? `${git.branch.slice(0, BRANCH_MAX - 1)}…` : git?.branch
  const fileCount = s.files.length
  const repo = (
    <Box key="repo" flexDirection="column" minWidth={REPO_W} flexGrow={1} flexShrink={0}>
      {git
        ? row(
            'git',
            <Text color={COLOR.violet}>⎇</Text>,
            <Text bold color={COLOR.violet}>{branch}</Text>,
            git.ahead ? <Text color={COLOR.ok}>{`↑${git.ahead}`}</Text> : null,
            git.behind ? <Text color={COLOR.warn}>{`↓${git.behind}`}</Text> : null,
            git.dirty
              ? <Text color={COLOR.warn}>{`●${git.dirty}`}</Text>
              : <Text color={COLOR.ok}>✓</Text>,
          )
        : row('git', <Text color={COLOR.dim}>not a git repo</Text>)}
      {row(
        'edits',
        <Text bold color={COLOR.ok}>{`+${s.added}`}</Text>,
        <Text bold color={COLOR.bad}>{`−${s.removed}`}</Text>,
        dot,
        <Text color={COLOR.soft}>{`${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}</Text>,
      )}
      {row('version', <Text color={COLOR.dim}>{s.version ? `claude code v${s.version}` : ''}</Text>)}
    </Box>
  )

  return (
    <Box flexDirection="row" flexGrow={1} flexShrink={1}>
      {limits}
      {columns >= 2 ? sep('sep1') : null}
      {columns >= 2 ? session : null}
      {columns >= 3 ? sep('sep2') : null}
      {columns >= 3 ? models : null}
      {columns >= 4 ? sep('sep3') : null}
      {columns >= 4 ? repo : null}
    </Box>
  )
}
