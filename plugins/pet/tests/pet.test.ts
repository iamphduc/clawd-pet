import { expect, mock, test } from 'claude-code/testing'

import type { MoodKind } from '../types'
import { checkPassed, detailForTool, isCheckCommand, moodForTool } from '../hooks/register'
import { COLUMNS, ROWS, drawFrame, encode } from '../hooks/sprites'

const KINDS: MoodKind[] = ['idle', 'sleeping', 'thinking', 'reading', 'editing', 'searching', 'running', 'web', 'subagent', 'waiting', 'passed', 'failed', 'happy', 'error']

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

test('check commands are told apart from commands that only mention them', async () => {
  for (const command of ['npm test', 'pnpm run build', 'npx vitest run', 'pytest -q', 'cargo test --all', 'tsc -p .', 'cd app && go test ./...', 'claude plugin test ./plugins/pet', 'make']) {
    expect(isCheckCommand(command)).toBe(true)
  }
  for (const command of ['git status', 'git commit -m "add test"', 'echo build', 'ls tests', 'npm install']) {
    expect(isCheckCommand(command)).toBe(false)
  }
})

test('a check passes only with no error and no failures in its output', async () => {
  expect(checkPassed(false, 'Tests: 12 passed, 12 total')).toBe(true)
  expect(checkPassed(false, '9 pass\n0 fail')).toBe(true)
  expect(checkPassed(false, '8 pass\n1 fail')).toBe(false)
  expect(checkPassed(false, 'Tests: 2 failed, 10 passed')).toBe(false)
  expect(checkPassed(false, 'FAIL src/app.test.ts')).toBe(false)
  expect(checkPassed(true, '')).toBe(false)
})

test('a passing test run makes the pet cheer', async ($, on) => {
  mock.clock(on)
  on('tool.call', async () => ({ result: 'ok', text: '4 pass\n0 fail' }))
  const band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Bash', command: 'npm test' })

  expect(await band.find({ text: 'checks passed!' })).toBeDefined()
})

test('a failing test run makes the pet droop', async ($, on) => {
  mock.clock(on)
  on('tool.call', async () => ({ result: 'ok', text: 'Tests: 1 failed, 3 passed' }))
  const band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Bash', command: 'npx vitest run' })

  expect(await band.find({ text: 'checks failed' })).toBeDefined()
})

test('a check result that ends the turn stays instead of the cheer', async ($, on) => {
  mock.clock(on)
  on('tool.call', async () => ({ result: 'ok', text: 'Tests: 1 failed, 3 passed' }))
  on('turn.complete', async () => ({ text: '' }))
  const band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1, isAborted: false, turnId: 't1' })

  expect(await band.find({ text: 'checks failed' })).toBeDefined()
  expect(await band.find({ text: 'done!' })).toBeUndefined()
})

test('night adds a cap and morning adds coffee, in every mood', async () => {
  for (const kind of KINDS) {
    for (const hour of [2, 8, 15]) {
      expect(encode(drawFrame(kind, 5, 0, hour)).length).toBe(Math.ceil((COLUMNS * ROWS * 12) / 3) * 4)
    }
  }
  expect(encode(drawFrame('idle', 1, 0, 2))).not.toBe(encode(drawFrame('idle', 1, 0, 15)))
  expect(encode(drawFrame('idle', 1, 0, 8))).not.toBe(encode(drawFrame('idle', 1, 0, 15)))
})

test('after a prompt is approved, Clawd stops waving once the tool runs', async ($, on) => {
  const clock = mock.clock(on)
  on('classic.PermissionRequest', async () => ({}))
  on('ui.render', { component: 'ToolProgress' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, { dimColor: true }, '(ctrl+b to run in background)') as never
  })
  on('session.start', async () => ({ cwd: '/repo' }))
  on('command.register', async () => ({ value: {} }) as never)
  on('ui.blit', async () => ({}) as never)
  const band = await $.ui.mount(BAND)
  // Starts the frame timer, which makes the switch.
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'npm run build' } })
  expect(await band.find({ type: 'Text', text: 'needs you' })).toBeDefined()

  await $.ui.mount({
    plugin: 'pet',
    surface: 'terminal',
    component: 'ToolProgress',
    props: { tool_use_id: 'toolu_1', kind: 'background_hint', hint: '(ctrl+b to run in background)' },
  })
  await clock.advance(600)

  expect(await band.find({ type: 'Text', text: 'needs you' })).toBeUndefined()
})
