import { expect, test } from 'claude-code/testing'

import { columnsFor } from '../hooks/dash'
import { elapsed, gauge } from '../hooks/format'
import { parseStatus } from '../hooks/git'
import { rasterize } from '../hooks/raster'
import { sceneSvg } from '../hooks/scene'

const HINT = { isDraft: false, isWorking: false, hint: '? for shortcuts' }

test('the dashboard draws stats, the hint and the scene under the prompt', async $ => {
  const ui = await $.ui.mount({
    plugin: 'clawd-dash',
    surface: 'terminal',
    component: 'PromptHint',
    props: HINT,
    viewport: { columns: 140, rows: 40 },
  })
  expect(await ui.find({ type: 'Text', text: 'context' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '? for shortcuts' })).toBeDefined()
  expect(await ui.find({ key: 'scene' })).toBeDefined()
  await ui.unmount()
})

test('a wide terminal spreads the stats over three columns', async $ => {
  const ui = await $.ui.mount({
    plugin: 'clawd-dash',
    surface: 'terminal',
    component: 'PromptHint',
    props: HINT,
    viewport: { columns: 220, rows: 40 },
  })
  expect(await ui.find({ key: 'limits' })).toBeDefined()
  expect(await ui.find({ key: 'session' })).toBeDefined()
  expect(await ui.find({ key: 'repo' })).toBeDefined()
  expect(await ui.find({ key: 'scene' })).toBeDefined()
  await ui.unmount()
})

test('columns drop from the right as the room shrinks', () => {
  expect(columnsFor(200)).toBe(3)
  expect(columnsFor(80)).toBe(2)
  expect(columnsFor(50)).toBe(1)
})

test('the gauge fills in eighth-cell steps and always spans its width', () => {
  for (const p of [0, 3, 42, 50, 99.9, 100, 140]) {
    const g = gauge(p, 14)
    expect(g.full.length + g.part.length + g.rest.length).toBe(14)
  }
  expect(gauge(50, 14).full).toBe('█'.repeat(7))
  expect(gauge(0, 14).full).toBe('')
})

test('elapsed reads like a clock', () => {
  expect(elapsed(38_000)).toBe('38s')
  expect(elapsed(125_000)).toBe('2m 5s')
  expect(elapsed(72 * 60_000)).toBe('1h 12m')
})

test('git status parses branch, ahead/behind and dirty files', () => {
  expect(parseStatus('## main...origin/main [ahead 2, behind 1]\n M a.ts\n?? b.ts\n')).toEqual({
    branch: 'main', ahead: 2, behind: 1, dirty: 2,
  })
  expect(parseStatus('## No commits yet on dev\n')).toEqual({ branch: 'dev', ahead: 0, behind: 0, dirty: 0 })
  expect(parseStatus('## HEAD (no branch)\n').branch).toBe('detached')
})

test('a narrow terminal drops the scene but keeps the stats', async $ => {
  const ui = await $.ui.mount({
    plugin: 'clawd-dash',
    surface: 'terminal',
    component: 'PromptHint',
    props: HINT,
    viewport: { columns: 70, rows: 40 },
  })
  expect(await ui.find({ type: 'Text', text: 'context' })).toBeDefined()
  expect(await ui.find({ key: 'scene' })).toBeUndefined()
  await ui.unmount()
})

test('every mood rasterizes to the cropped, scaled size with the mascot in it', () => {
  for (const mood of ['idle', 'working', 'done', 'relax'] as const) {
    const px = rasterize(sceneSvg(mood, 1.3), 100, 18, 24, 4)
    expect(px.width).toBe(76 * 4)
    expect(px.height).toBe(18 * 4)
    // Claude orange (#d97757) appears somewhere: the mascot was drawn.
    let orange = false
    for (let i = 0; i < px.rgba.length; i += 4) {
      if (px.rgba[i] === 0xd9 && px.rgba[i + 1] === 0x77 && px.rgba[i + 2] === 0x57) { orange = true; break }
    }
    expect(orange).toBe(true)
  }
})
