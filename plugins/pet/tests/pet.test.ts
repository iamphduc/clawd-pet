import { expect, mock, test } from 'claude-code/testing'

import type { MoodKind } from '../types'
import { detailForTool, moodForTool } from '../hooks/register'
import { COLUMNS, ROWS, drawFrame, encode } from '../hooks/sprites'

const KINDS: MoodKind[] = ['idle', 'sleeping', 'thinking', 'reading', 'editing', 'searching', 'running', 'web', 'subagent', 'waiting', 'happy', 'error']

test('every mood draws a full raster on every tick', async () => {
  for (const kind of KINDS) {
    for (let tick = 0; tick < 40; tick++) {
      const cells = encode(drawFrame(kind, tick))
      // 3 u32 words per cell, base64 is 4 chars per 3 bytes.
      expect(cells.length).toBe(Math.ceil((COLUMNS * ROWS * 12) / 3) * 4)
    }
  }
})

test('tools map to moods and short details', async () => {
  expect(moodForTool('Read')).toBe('reading')
  expect(moodForTool('Edit')).toBe('editing')
  expect(moodForTool('Grep')).toBe('searching')
  expect(moodForTool('Bash')).toBe('running')
  expect(moodForTool('WebSearch')).toBe('web')
  expect(moodForTool('Agent')).toBe('subagent')
  expect(moodForTool('mcp__x__y')).toBe('thinking')
  expect(detailForTool({ file_path: 'C:\\src\\app.ts' })).toBe('app.ts')
})

const BAND = {
  plugin: 'pet',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('the pet reads while Read runs, then goes back to thinking', async ($, on) => {
  mock.clock(on)
  let during: string | undefined
  let band: Awaited<ReturnType<typeof $.ui.mount<'terminal', 'AbovePrompt'>>> | undefined
  on('tool.call', async () => {
    during = (await band?.find({ type: 'Text', text: /reading|thinking|chilling/ }))?.text
    return { result: 'ok' }
  })
  band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Read', file_path: '/repo/notes.md' })

  expect(during).toBe('reading')
  expect(await band.find({ text: 'thinking' })).toBeDefined()
})

test('a failed tool makes the pet upset', async ($, on) => {
  mock.clock(on)
  on('tool.call', () => ({ deny: 'nope' }))
  const band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Bash', command: 'false' })

  expect(await band.find({ text: 'oops' })).toBeDefined()
})

test('idle and sleeping draw a battery at any context fill', async () => {
  for (const kind of ['idle', 'sleeping'] as MoodKind[]) {
    for (const percent of [0, 55, 70, 95]) {
      expect(encode(drawFrame(kind, 3, percent)).length).toBe(Math.ceil((COLUMNS * ROWS * 12) / 3) * 4)
    }
  }
})

test('the pet waits while a question is open', async ($, on) => {
  mock.clock(on)
  let during: string | undefined
  let band: Awaited<ReturnType<typeof $.ui.mount<'terminal', 'AbovePrompt'>>> | undefined
  on('tool.call', async () => {
    during = (await band?.find({ type: 'Text', text: /needs you|thinking/ }))?.text
    return { result: 'ok' }
  })
  band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'AskUserQuestion', questions: [] })

  expect(during).toBe('needs you')
})
