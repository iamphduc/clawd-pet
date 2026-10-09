import { describe, expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { MoodKind } from '../types'
import { checkPassed, commitMessage, detailForTool, formatReset, fullestLimit, isCheckCommand, isCommitCommand, moodForTool } from '../hooks/register'
import { COLUMNS, ROWS, drawFrame, encode } from '../hooks/sprites'

const KINDS: MoodKind[] = ['idle', 'sleeping', 'thinking', 'reading', 'editing', 'searching', 'running', 'web', 'subagent', 'waiting', 'passed', 'failed', 'happy', 'error', 'committed', 'resting']

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
  expect(detailForTool({ command: 'cd /repo/app && npm test', description: 'Run the unit tests' })).toBe('Run the unit tests')
  expect(detailForTool({ description: 'Run the full plugin test suite now' })).toBe('Run the full plugin test suit…')
  expect(detailForTool({ command: 'cd /repo/app && cd web && npm test' })).toBe('npm test')
  expect(detailForTool({ command: 'x'.repeat(200) }).length).toBe(30)
})

const BAND = {
  plugin: 'pet',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

// The plugin's type set has no DOM or Node types; the test runtime has this.
declare const setTimeout: (callback: (...args: never[]) => void, ms: number) => unknown

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

test('one subagent ending keeps the pet with the other helper', async ($, on) => {
  mock.clock(on)
  const gates = new Map<string, () => void>()
  on('tool.call', async (_$, e) => {
    const key = String((e as Record<string, unknown>).description)
    await new Promise<void>(resolve => gates.set(key, resolve))
    return { result: 'ok' }
  })
  const band = await $.ui.mount(BAND)
  const first = $.tool.call({ tool: 'Agent', description: 'one', prompt: 'x' } as never)
  const second = $.tool.call({ tool: 'Agent', description: 'two', prompt: 'x' } as never)
  // Give both calls time to reach the core handler before resolving.
  await new Promise(resolve => setTimeout(resolve, 0))

  gates.get('one')?.()
  await first
  expect(await band.find({ text: 'with a helper' })).toBeDefined()
  expect(await band.find({ text: 'thinking' })).toBeUndefined()

  gates.get('two')?.()
  await second
  expect(await band.find({ text: 'thinking' })).toBeDefined()
})

test('a check that ends beside a running helper returns to the helper', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', async () => ({ cwd: '/repo' }))
  on('command.register', async () => ({ value: {} }) as never)
  on('ui.blit', async () => ({ value: {} }) as never)
  const gates = new Map<string, () => void>()
  on('tool.call', async (_$, e) => {
    const key = String((e as Record<string, unknown>).description)
    await new Promise<void>(resolve => gates.set(key, resolve))
    return key === 'tests' ? { result: 'ok', text: '3 pass\n0 fail' } : { result: 'ok' }
  })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount(BAND)
  const helper = $.tool.call({ tool: 'Agent', description: 'helper', prompt: 'x' } as never)
  const tests = $.tool.call({ tool: 'Bash', command: 'npm test', description: 'tests' } as never)
  await new Promise(resolve => setTimeout(resolve, 0))

  gates.get('tests')?.()
  await tests
  expect(await band.find({ text: 'checks passed!' })).toBeDefined()
  await clock.advance(3_500)
  expect(await band.find({ text: 'with a helper' })).toBeDefined()

  gates.get('helper')?.()
  await helper
})

test('a new turn forgets calls that never ended', async ($, on) => {
  mock.clock(on)
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  // Held open past the new turn, then let go so no call outlives the test.
  let release = () => {}
  on('tool.call', async (_$, e) => {
    if (String((e as Record<string, unknown>).tool) === 'Agent') await new Promise<void>(resolve => (release = resolve))
    return { result: 'ok' }
  })
  const band = await $.ui.mount(BAND)
  const stuck = $.tool.call({ tool: 'Agent', description: 'stuck', prompt: 'x' } as never)
  await new Promise(resolve => setTimeout(resolve, 0))

  await $.turn.start({ text: 'next', turnId: 't2' })
  await $.tool.call({ tool: 'Read', file_path: '/repo/a.ts' })

  expect(await band.find({ text: 'thinking' })).toBeDefined()
  expect(await band.find({ text: 'with a helper' })).toBeUndefined()

  release()
  await stuck
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
  for (const command of ['npm test', 'pnpm run build', 'npx vitest run', 'pytest -q', 'cargo test --all', 'tsc -p .', 'cd app && go test ./...', 'claude plugin test ./plugins/pet', 'make',
    'npx -p typescript tsc -p ./plugins/pet', 'npx -y -p typescript tsc --noEmit', 'npx --package=typescript tsc',
    'pnpm dlx vitest', 'CI=1 npm test', 'NODE_ENV=test FOO=bar npx jest',
    'uv run pytest', 'poetry run pytest -x', 'python3 -m pytest', 'py -m pytest']) {
    expect(isCheckCommand(command)).toBe(true)
  }
  for (const command of ['git status', 'git commit -m "add test"', 'echo build', 'ls tests', 'npm install',
    'npx create-react-app tsc-demo', 'npx prettier --write .', 'npx -p typescript tsc-watch',
    'FOO=1 echo test', 'uv run python app.py']) {
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

test('commit commands are told apart from ones that only mention git commit', async () => {
  expect(isCommitCommand('git commit -m "feat: add x"')).toBe(true)
  expect(isCommitCommand('cd /repo && git add . && git commit -q -m "fix: y"')).toBe(true)
  expect(isCommitCommand('git -C ../app commit --amend --no-edit')).toBe(true)
  expect(isCommitCommand('git log --grep "git commit"')).toBe(false)
  expect(isCommitCommand('git commit-tree abc')).toBe(false)
})

test('the commit message is the first line of -m, short', async () => {
  expect(commitMessage('git commit -m "feat: add x"')).toBe('feat: add x')
  expect(commitMessage("git commit -m 'fix: y'")).toBe('fix: y')
  expect(commitMessage('git commit --amend --no-edit')).toBe('')
  expect(commitMessage(`git commit -m "$(cat <<'EOF'\nfeat: show clearer details\n\nBody text.\nEOF\n)"`)).toBe('feat: show clearer details')
  expect(commitMessage('git commit -m "docs: a very long message that goes on and on"').length).toBe(30)
  expect(commitMessage('git commit -am "fix: y"')).toBe('fix: y')
  expect(commitMessage('git commit -qam "fix: y"')).toBe('fix: y')
  expect(commitMessage('git commit -m"fix: y"')).toBe('fix: y')
  expect(commitMessage("git commit -am'fix: y'")).toBe('fix: y')
  expect(commitMessage('git commit -mfix')).toBe('fix')
  expect(commitMessage('git commit --message="fix: y"')).toBe('fix: y')
  expect(commitMessage('git commit --amend -m "fix: z"')).toBe('fix: z')
  expect(commitMessage('git commit --amend')).toBe('')
  expect(commitMessage('git commit -v')).toBe('')
})

test('a commit makes the pet cheer with its message', async ($, on) => {
  mock.clock(on)
  on('tool.call', async () => ({ result: 'ok', text: '[main abc123] feat: add x' }))
  const band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Bash', command: 'git add . && git commit -m "feat: add x"' })

  expect(await band.find({ text: 'committed!' })).toBeDefined()
  expect(await band.find({ text: 'feat: add x' })).toBeDefined()
})

test('a failed commit is an error, not a cheer', async ($, on) => {
  mock.clock(on)
  on('tool.call', async () => ({ result: 'error', isError: true, text: 'nothing to commit' }))
  const band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Bash', command: 'git commit -m "feat: add x"' })

  expect(await band.find({ text: 'committed!' })).toBeUndefined()
  expect(await band.find({ text: 'oops' })).toBeDefined()
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

test('a turn that ends on a denied tool does not cheer', async ($, on) => {
  mock.clock(on)
  on('tool.call', async () => ({ deny: 'The user said no' }))
  on('turn.complete', async () => ({ text: '' }))
  const band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1, isAborted: false, turnId: 't1' })

  expect(await band.find({ text: 'done!' })).toBeUndefined()
  expect(await band.find({ text: 'chilling' })).toBeDefined()
})

test('a turn that answers after its tools still cheers', async ($, on) => {
  mock.clock(on)
  on('tool.call', async () => ({ result: 'ok' }))
  on('turn.step', async function* () {
    return { turnId: 't1', index: 1, answer: '', toolUses: [] } as never
  })
  on('turn.complete', async () => ({ text: '' }))
  const band = await $.ui.mount(BAND)

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  // The step streams: read it to the end, like the engine does.
  for await (const _ of $.turn.step({ turnId: 't1', index: 1, model: 'm', messageCount: 3 } as never)) void _
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1, isAborted: false, turnId: 't1' })

  expect(await band.find({ text: 'done!' })).toBeDefined()
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

describe('the frame timer', () => {
  const start = async (...[$, on]: Parameters<TestBody>) => {
    const clock = mock.clock(on)
    const blits: string[] = []
    on('session.start', async () => ({ cwd: '/repo' }))
    on('command.register', async () => ({ value: {} }) as never)
    on('ui.blit', async ($, e) => (blits.push('cells' in e ? e.cells : ''), { value: {} }) as never)
    on('tool.call', async () => ({ result: 'ok', text: 'Tests: 1 failed' }))
    await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
    return { clock, blits }
  }

  test('paints nothing before the band has drawn', async ($, on) => {
    const { clock, blits } = await start($, on)
    await clock.advance(2_000)
    expect(blits.length).toBe(0)
  })

  test('skips frames that change nothing', async ($, on) => {
    const { clock, blits } = await start($, on)
    await $.ui.mount(BAND)
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    blits.length = 0
    // 'failed' holds still: 8 ticks in 2 s, at most one real change.
    await clock.advance(2_000)
    expect(blits.length).toBeLessThanOrEqual(1)
  })

  test('paints a sleeping Clawd once a second', async ($, on) => {
    const { clock, blits } = await start($, on)
    await $.ui.mount(BAND)
    await clock.advance(61_000)
    blits.length = 0
    await clock.advance(8_000)
    expect(blits.length).toBeLessThanOrEqual(8)
    expect(blits.length).toBeGreaterThan(0)
  })
})

test('the context toast shows once per climb past 80%', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  on('session.measure', async () => ({ changed: ['context'] }) as never)
  on('ui.toast', async ($, e) => (toasts.push(String(e.text)), { value: undefined }) as never)
  const measure = (percent: number) =>
    $.session.measure({ context: { tokens: percent * 2000, window: 200_000, percent }, rateLimits: [], changed: ['context'] } as never)

  await measure(82)
  await measure(85)
  expect(toasts.length).toBe(1)
  await measure(30)
  await measure(81)
  expect(toasts.length).toBe(2)
})

test('/pet off hides Clawd and remembers it; /pet on brings it back', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('session.start', async () => ({ cwd: '/repo' }))
  on('command.register', async () => ({ value: {} }) as never)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, 'engine band') as never
  })
  const band = await $.ui.mount(BAND)
  const pet = (args: string) =>
    $.command.run({ command: 'pet', args, origin: { kind: 'user' }, presentation: {} } as never)

  expect(await band.find({ type: 'Text', text: 'chilling' })).toBeDefined()
  await pet('off')
  expect(await band.find({ type: 'Text', text: 'chilling' })).toBeUndefined()
  // A new session start reads the stored choice: still off.
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  expect(await band.find({ type: 'Text', text: 'chilling' })).toBeUndefined()
  await pet('on')
  expect(await band.find({ type: 'Text', text: 'chilling' })).toBeDefined()
})

test('/pet demo plays every mood in turn, and a real mood ends it', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', async () => ({ cwd: '/repo' }))
  on('command.register', async () => ({ value: {} }) as never)
  on('ui.blit', async () => ({ value: {} }) as never)
  on('tool.call', async () => ({ result: 'ok' }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount(BAND)
  const pet = (args: string) =>
    $.command.run({ command: 'pet', args, origin: { kind: 'user' }, presentation: {} } as never)

  await pet('demo')
  expect(await band.find({ type: 'Text', text: 'chilling' })).toBeDefined()
  expect(await band.find({ type: 'Text', text: 'demo 1/15' })).toBeDefined()
  await clock.advance(2_250)
  expect(await band.find({ type: 'Text', text: 'thinking' })).toBeDefined()
  expect(await band.find({ type: 'Text', text: 'demo 2/15' })).toBeDefined()

  // Claude starts working: the demo stops for good.
  await $.tool.call({ tool: 'Read', file_path: '/repo/a.ts' })
  await clock.advance(10_000)
  expect(await band.find({ type: 'Text', text: /^demo / })).toBeUndefined()
})

test('reset times read short and local', async () => {
  const now = new Date(2026, 9, 7, 9, 0)
  expect(formatReset(new Date(2026, 9, 7, 15, 40), now)).toBe('3:40 PM')
  expect(formatReset(new Date(2026, 9, 7, 0, 5), now)).toBe('12:05 AM')
  expect(formatReset(new Date(2026, 9, 12, 8, 0), now)).toBe('Mon 8:00 AM')
  expect(fullestLimit([{ kind: 'five_hour', percentUsed: 40 }, { kind: 'seven_day', percentUsed: 100 }])?.kind).toBe('seven_day')
  expect(fullestLimit([])).toBeUndefined()
})

const measureLimits = ($: Parameters<TestBody>[0], percentUsed: number, resetsAt?: string) =>
  $.session.measure({
    context: { tokens: 0, window: 200_000, percent: 0 },
    rateLimits: [{ kind: 'five_hour', percentUsed, resetsAt }],
    changed: ['rateLimits'],
  } as never)

test('the plan-limit toast shows once per climb past 90%', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  on('session.measure', async () => ({ changed: ['rateLimits'] }) as never)
  on('ui.toast', async ($, e) => (toasts.push(String(e.text)), { value: undefined }) as never)

  await measureLimits($, 85)
  await measureLimits($, 91)
  await measureLimits($, 95)
  expect(toasts.length).toBe(1)
  expect(toasts[0]).toContain('91% of your 5-hour limit used')
  // The window resets, then climbs again.
  await measureLimits($, 3)
  await measureLimits($, 92)
  expect(toasts.length).toBe(2)
})

test('a turn stopped by the plan limit makes Clawd rest until the reset', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', async () => ({ cwd: '/repo' }))
  on('command.register', async () => ({ value: {} }) as never)
  on('ui.blit', async () => ({ value: {} }) as never)
  on('session.measure', async () => ({ changed: ['rateLimits'] }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('classic.StopFailure', async () => ({}))
  on('turn.complete', async () => ({ text: '' }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount(BAND)

  const now = clock.now()
  const resetsAt = new Date(now + 20 * 60_000)
  await measureLimits($, 100, resetsAt.toISOString())
  await $.classic.StopFailure({ error: 'rate_limit' } as never)
  await $.turn.complete({ reason: 'error', answer: '', durationMs: 1, isAborted: false, turnId: 't1' })

  expect(await band.find({ type: 'Text', text: 'resting' })).toBeDefined()
  expect(await band.find({ type: 'Text', text: `until ${formatReset(resetsAt, new Date(now))}` })).toBeDefined()
  // Once the window resets, Clawd is back.
  await clock.advance(20 * 60_000 + 1_000)
  expect(await band.find({ type: 'Text', text: 'resting' })).toBeUndefined()
})
