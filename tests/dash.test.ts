import { expect, test } from 'claude-code/testing'

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
  expect(await ui.find({ type: 'Text', text: 'ctx' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '? for shortcuts' })).toBeDefined()
  expect(await ui.find({ key: 'scene' })).toBeDefined()
  await ui.unmount()
})

test('a narrow terminal drops the scene but keeps the stats', async $ => {
  const ui = await $.ui.mount({
    plugin: 'clawd-dash',
    surface: 'terminal',
    component: 'PromptHint',
    props: HINT,
    viewport: { columns: 70, rows: 40 },
  })
  expect(await ui.find({ type: 'Text', text: 'ctx' })).toBeDefined()
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
