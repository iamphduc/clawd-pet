import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mood, MoodKind, RateLimit } from '../types'
import { COLUMNS, ROWS, drawFrame, encode } from './sprites'

const FRAME_MS = 250
const SLEEP_AFTER_MS = 60_000
const SHORT_MOOD_MS = 3_000
// Context use, in percent, at which Clawd shows its battery and then warns.
const CONTEXT_SHOW = 50
const CONTEXT_WARN = 80
// Plan usage, in percent of a rate-limit window, at which Clawd warns once.
const LIMIT_WARN = 90

const mood = atom({ plugin: 'pet', key: 'mood' } as const, {
  kind: 'idle',
  detail: '',
  since: 0,
  until: 0,
  then: 'idle',
} as Mood)
const context = atom({ plugin: 'pet', key: 'context' } as const, null as number | null)
// Kept in $.state, not the module, so a reload doesn't show the toast again.
const hasWarned = atom({ plugin: 'pet', key: 'hasWarned' } as const, false)
const isOff = atom({ plugin: 'pet', key: 'isOff' } as const, false)
const limits = atom({ plugin: 'pet', key: 'limits' } as const, [] as RateLimit[])
const limitsWarned = atom({ plugin: 'pet', key: 'limitsWarned' } as const, [] as string[])

const LABELS: Record<MoodKind, string> = {
  idle: 'chilling',
  sleeping: 'sleeping',
  thinking: 'thinking',
  reading: 'reading',
  editing: 'editing',
  searching: 'searching',
  running: 'running',
  web: 'browsing',
  subagent: 'with a helper',
  waiting: 'needs you',
  passed: 'checks passed!',
  failed: 'checks failed',
  committed: 'committed!',
  resting: 'resting',
  happy: 'done!',
  error: 'oops',
}

export function moodForTool(tool: string): MoodKind {
  if (tool === 'Read') return 'reading'
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) return 'editing'
  if (['Grep', 'Glob', 'LSP', 'ToolSearch'].includes(tool)) return 'searching'
  if (['Bash', 'PowerShell'].includes(tool)) return 'running'
  if (['WebFetch', 'WebSearch'].includes(tool)) return 'web'
  if (['Agent', 'Task'].includes(tool)) return 'subagent'
  if (tool === 'AskUserQuestion') return 'waiting'
  return 'thinking'
}

// Long enough for a file name or a short description, short enough to keep the band calm.
const DETAIL_MAX = 30

export function detailForTool(input: Record<string, unknown>): string {
  const pick = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '')
  const path = pick('file_path') || pick('notebook_path')
  if (path) return path.split(/[\\/]/).pop() ?? ''
  // A command's own description ("Run the tests") says more than its first characters.
  const command = pick('command').replace(/^(cd\s+\S+\s*&&\s*)+/, '')
  return clip(pick('pattern') || pick('description') || command || pick('query') || pick('url'))
}

function clip(text: string): string {
  return text.length > DETAIL_MAX ? text.slice(0, DETAIL_MAX - 1) + '…' : text
}

/** Whether a shell command makes a git commit, in any of its steps. */
export function isCommitCommand(command: string): boolean {
  return command.split(/&&|\|\||;|\|/).some(step => /^git( -C \S+)? commit(\s|$)/.test(step.trim()))
}

/**
 * The first line of a commit's message from its `-m`, short; '' without one.
 * A heredoc message (`-m "$(cat <<'EOF' ... EOF)"`) gives its first line of text.
 */
export function commitMessage(command: string): string {
  const match = command.match(/(?:-m|--message)[ =](?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+))/)
  let message = match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
  if (message.includes('<<')) message = message.split('\n').slice(1).find(line => line.trim()) ?? ''
  return clip((message.split('\n')[0] ?? '').trim())
}

// A shell step that runs tests, a build, a type check, or a linter: the tool
// is the command itself, not a word inside an argument.
const CHECK_STEPS = [
  /^(npm|pnpm|yarn|bun)( run)? (test|build|lint|typecheck|check)\b/,
  /^(npx|pnpm exec|bunx) (jest|vitest|tsc|eslint|playwright|mocha)\b/,
  /^(jest|vitest|tsc|eslint|mocha|rspec|phpunit|ctest)\b/,
  /^(python -m )?pytest\b/,
  /^go (test|build|vet)\b/,
  /^cargo (test|build|check|clippy)\b/,
  /^dotnet (test|build)\b/,
  /^(mvn|gradle|\.\/gradlew) .*\b(test|build|check)\b/,
  /^make( (test|check|build))?$/,
  /^claude plugin (test|validate)\b/,
]
const FAILED_OUTPUT = /\b[1-9]\d* (fail|failed|failing|failures?|errors?)\b|\bFAIL(ED)?\b|\bBuild failed\b/

/** Whether a shell command runs tests, a build, a type check, or a linter. */
export function isCheckCommand(command: string): boolean {
  return command.split(/&&|\|\||;|\|/).some(step => CHECK_STEPS.some(re => re.test(step.trim())))
}

/** Whether a check command's run passed, from its error flag and its output. */
export function checkPassed(isError: boolean, output: string): boolean {
  return !isError && !FAILED_OUTPUT.test(output)
}

// The mood last set, kept outside $.state so the frame timer can decide to
// skip a frame without a call.
let lastKind: MoodKind = 'idle'
// Mirrors the isOff state for the frame timer, which skips all work while Clawd is off.
let isOffNow = false

/** Whether a mood is a sleeping Clawd, which moves at a quarter speed. */
function isAsleep(kind: MoodKind): boolean {
  return kind === 'sleeping' || kind === 'resting'
}

/** The animation step for a frame: a sleeping Clawd moves at a quarter speed. */
function frameTick(kind: MoodKind, tick: number): number {
  return isAsleep(kind) ? Math.floor(tick / 4) : tick
}

const LIMIT_NAMES: Record<string, string> = { five_hour: '5-hour', seven_day: 'weekly' }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** A reset time, short and local: "3:40 PM" today, "Mon 3:40 PM" on another day. */
export function formatReset(at: Date, now: Date): string {
  const hours = at.getHours() % 12 || 12
  const time = `${hours}:${String(at.getMinutes()).padStart(2, '0')} ${at.getHours() < 12 ? 'AM' : 'PM'}`
  return at.toDateString() === now.toDateString() ? time : `${DAYS[at.getDay()]} ${time}`
}

/** The window that stopped Claude: the fullest one, or none before the first reading. */
export function fullestLimit(windows: RateLimit[]): RateLimit | undefined {
  return [...windows].sort((a, b) => b.percentUsed - a.percentUsed)[0]
}

// `/pet demo`: every mood in turn, like a short day of work.
const DEMO_MS = 2_000
const DEMO_ORDER: MoodKind[] = ['idle', 'thinking', 'reading', 'editing', 'searching', 'running', 'web', 'subagent', 'waiting', 'passed', 'failed', 'committed', 'happy', 'error', 'sleeping']
// The demo's moods still to show; any other mood change ends the demo.
let demoQueue: MoodKind[] = []

async function setMood($: EngineInterface, kind: MoodKind, detail = '', forMs = 0, then: MoodKind = 'idle') {
  demoQueue = []
  lastKind = kind
  const now = await $.clock.now()
  await update($, mood, () => ({ kind, detail, since: now, until: forMs ? now + forMs : 0, then }))
}

async function nextDemoMood($: EngineInterface) {
  const [kind = 'idle', ...rest] = demoQueue
  const step = DEMO_ORDER.length - rest.length
  await setMood($, kind, `demo ${step}/${DEMO_ORDER.length}`, DEMO_MS)
  demoQueue = rest
}

export const register: Register = on => {
  // The band's id, learned when it first draws; the timer repaints it in place.
  let bandId: string | undefined
  let tick = 0
  // The cells the band shows now, so a frame that changes nothing is not sent.
  let lastCells = ''
  // The mood a permission prompt interrupted, and whether the approved tool has
  // been seen running since: Clawd goes back to it instead of waving on.
  let beforePrompt: { kind: MoodKind; detail: string } | undefined
  let isApprovedRunning = false
  // Main-thread tool calls still running, by call, with the mood each shows.
  // When one ends, Clawd goes back to a call still running instead of thinking.
  const running = new Map<number, { kind: MoodKind; detail: string }>()
  let nextCallId = 0
  /** The latest tool call still running, or undefined when none is. */
  const latestRunning = () => [...running.values()].at(-1)
  // `/pet hour` fakes the hour until this time, for previews.
  let fakeHour = 0
  let fakeHourUntil = 0
  const hourNow = (now: number) => (now < fakeHourUntil ? fakeHour : new Date(now).getHours())

  on('session.start', async ($, e, next) => {
    await setMood($, 'idle')
    // `/pet off` lasts across sessions until `/pet on`.
    // A store that can't be read leaves Clawd on.
    isOffNow = (await $.store.get('isOff').catch(() => false)) === true
    await update($, isOff, () => isOffNow)
    await $.command.register({
      name: 'pet',
      description: 'Preview a pet mood: /pet <mood> [seconds], /pet demo, /pet context <percent>, /pet hour <0-23>, or /pet off | on. No mood lists them.',
    })
    $.clock.every(FRAME_MS, () => {
      void (async () => {
        tick += 1
        // Nothing to paint until the band has drawn once (never, on the desktop),
        // and a sleeping Clawd paints once a second.
        if (bandId === undefined || isOffNow) return
        if (isAsleep(lastKind) && tick % 4 !== 0) return
        let current = await read($, mood)
        const now = await $.clock.now()
        if (current.until && now > current.until) {
          const back = current.then === 'thinking' ? latestRunning() : undefined
          await (demoQueue.length > 0 ? nextDemoMood($) : back ? setMood($, back.kind, back.detail) : setMood($, current.then))
          current = await read($, mood)
        } else if (current.kind === 'waiting' && isApprovedRunning && beforePrompt !== undefined) {
          await setMood($, beforePrompt.kind, beforePrompt.detail)
          beforePrompt = undefined
          isApprovedRunning = false
          current = await read($, mood)
        } else if (current.kind === 'idle' && now - current.since > SLEEP_AFTER_MS) {
          await setMood($, 'sleeping')
          current = await read($, mood)
        }
        const cells = encode(drawFrame(current.kind, frameTick(current.kind, tick), (await read($, context)) ?? 0, hourNow(now)))
        if (cells === lastCells) return
        lastCells = cells
        await $.ui.blit({ requestId: bandId, key: 'pet', cells })
        // A frame that fails (the band closing mid-repaint) is skipped; the next one tries again.
      })().catch(() => undefined)
    })
    return next(e)
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const [typed = '', value = ''] = e.args.trim().split(/\s+/)
    if (typed === 'off' || typed === 'on') {
      isOffNow = typed === 'off'
      await update($, isOff, () => isOffNow)
      await $.store.set('isOff', isOffNow)
      return { text: isOffNow ? 'Clawd is off. Run /pet on to bring it back.' : 'Clawd is back.' }
    }
    if (isOffNow) return { text: 'Clawd is off. Run /pet on first.' }
    if (typed === 'hour') {
      fakeHour = Math.min(23, Math.max(0, Math.floor(Number(value) || 0)))
      fakeHourUntil = (await $.clock.now()) + 10_000
      return { text: `Pretending it's ${fakeHour}:00 for 10s.` }
    }
    if (typed === 'demo') {
      demoQueue = [...DEMO_ORDER]
      await nextDemoMood($)
      return { text: `Playing all ${DEMO_ORDER.length} moods, ${DEMO_MS / 1000}s each.` }
    }
    if (typed === 'context') {
      const percent = Math.min(100, Math.max(0, Number(value) || 0))
      await update($, context, () => percent)
      return { text: `Context set to ${percent}% until the next measure.` }
    }
    const name = typed === 'helper' ? 'subagent' : typed
    const kinds = Object.keys(LABELS) as MoodKind[]
    if (!kinds.includes(name as MoodKind)) {
      const list = kinds.map(k => (k === 'subagent' ? 'subagent (or helper)' : k)).join(', ')
      return { text: `Moods: ${list}. Usage: /pet <mood> [seconds], /pet demo, /pet context <percent>, /pet hour <0-23>, or /pet off | on` }
    }
    const seconds = Math.max(1, Number(value) || 10)
    await setMood($, name as MoodKind, 'preview', seconds * 1000)
    return { text: `Showing ${name} for ${seconds}s.` }
  })

  // Context fill: Clawd's battery drains, and one toast when it passes CONTEXT_WARN.
  on('session.measure', async ($, e, next) => {
    const percent = e.context.percent ?? null
    await update($, context, () => percent)
    if (percent !== null && percent >= CONTEXT_WARN && !(await read($, hasWarned))) {
      await update($, hasWarned, () => true)
      $.ui.toast(`Clawd is getting tired: context is ${percent}% full. Run /compact soon.`)
    } else if (percent !== null && percent < CONTEXT_WARN) {
      await update($, hasWarned, () => false)
    }
    // Plan usage: one toast per window each time it climbs past LIMIT_WARN.
    const windows = e.rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt }))
    await update($, limits, () => windows)
    const warned = await read($, limitsWarned)
    const now = new Date(await $.clock.now())
    for (const w of windows) {
      if (w.percentUsed < LIMIT_WARN || warned.includes(w.kind)) continue
      const resets = w.resetsAt ? `, resets ${formatReset(new Date(w.resetsAt), now)}` : ''
      $.ui.toast(`Clawd is running low: ${Math.floor(w.percentUsed)}% of your ${LIMIT_NAMES[w.kind] ?? w.kind} limit used${resets}.`)
    }
    await update($, limitsWarned, () => windows.filter(w => w.percentUsed >= LIMIT_WARN).map(w => w.kind))
    return next(e)
  })

  // A turn stopped by the plan's limit: Clawd rests until the window resets.
  on('classic.StopFailure', async ($, e, next) => {
    if (e.agent_id === undefined && e.error === 'rate_limit') {
      const now = await $.clock.now()
      const resetsAt = fullestLimit(await read($, limits))?.resetsAt
      const at = resetsAt ? Date.parse(resetsAt) : NaN
      if (at > now) await setMood($, 'resting', `until ${formatReset(new Date(at), new Date(now))}`, at - now)
      else await setMood($, 'resting')
    }
    return next(e)
  })

  // A permission prompt is about to show: Clawd waves until the tool call ends.
  on('classic.PermissionRequest', async ($, e, next) => {
    if (e.agent_id === undefined) {
      const current = await read($, mood)
      beforePrompt = { kind: current.kind, detail: current.detail }
      isApprovedRunning = false
      const input = typeof e.tool_input === 'object' && e.tool_input !== null ? (e.tool_input as Record<string, unknown>) : {}
      await setMood($, 'waiting', detailForTool(input) || e.tool_name)
    }
    return next(e)
  })

  // A tool's progress row (the ctrl+b hint) only shows once the tool runs, so
  // while Clawd waits it means the prompt was approved. Drawing can't write
  // state, so the frame timer makes the switch.
  on('ui.render', { component: 'ToolProgress' }, ($, e, next) => {
    if (beforePrompt !== undefined) isApprovedRunning = true
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    // A call that never ended must not keep Clawd busy.
    running.clear()
    await setMood($, 'thinking')
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    // A subagent's own tools: the pet keeps showing its helper.
    if (e.agentId !== undefined) return next(e)

    const tool = String(e.tool)
    const input = e as Record<string, unknown>
    const callId = nextCallId++
    const shown = { kind: moodForTool(tool), detail: detailForTool(input) }
    running.set(callId, shown)
    await setMood($, shown.kind, shown.detail)
    let result
    try {
      result = await next(e)
    } finally {
      running.delete(callId)
    }
    beforePrompt = undefined
    const command = typeof input.command === 'string' ? input.command : ''
    const isRan = moodForTool(tool) === 'running' && result.deny === undefined
    if (isRan && result.isError !== true && isCommitCommand(command)) {
      await setMood($, 'committed', commitMessage(command) || 'git commit', SHORT_MOOD_MS, 'thinking')
    } else if (isRan && isCheckCommand(command)) {
      const passed = checkPassed(result.isError === true, typeof result.text === 'string' ? result.text : '')
      await setMood($, passed ? 'passed' : 'failed', detailForTool(input), SHORT_MOOD_MS, 'thinking')
    } else if (result.isError || result.deny !== undefined) {
      await setMood($, 'error', tool, SHORT_MOOD_MS, 'thinking')
    } else {
      const back = latestRunning()
      await (back ? setMood($, back.kind, back.detail) : setMood($, 'thinking'))
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const current = await read($, mood)
      if (current.kind === 'resting') {
        // Stopped by the plan's limit: Clawd keeps resting.
      } else if (current.kind === 'passed' || current.kind === 'failed' || current.kind === 'committed') {
        // A check or commit that ends the turn stays up instead of the cheer, for its full time.
        await setMood($, current.kind, current.detail, SHORT_MOOD_MS)
      } else if (e.reason === 'answer') await setMood($, 'happy', '', SHORT_MOOD_MS)
      else if (e.reason === 'aborted') await setMood($, 'idle')
      else await setMood($, 'error', e.reason, SHORT_MOOD_MS)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Raster is terminal only; elsewhere leave the band to the engine.
    if (e.props.hasSurvey || e.surface !== 'terminal' || (await read($, isOff))) return next(e)

    bandId = e.requestId
    const current = await read($, mood)
    const percent = (await read($, context)) ?? 0
    const hour = hourNow(await $.clock.now())
    const { Box, Raster, Text } = $.ui.resolve(e)
    const contextColor = percent >= CONTEXT_WARN ? 'red' : percent >= 65 ? 'yellow' : 'green'
    const cells = encode(drawFrame(current.kind, frameTick(current.kind, tick), percent, hour))
    lastCells = cells

    return (
      <Box flexDirection="row" alignItems="center" marginTop={1}>
        <Raster key="pet" columns={COLUMNS} rows={ROWS} cells={cells} />
        <Box flexDirection="column" marginLeft={1}>
          <Text bold>{LABELS[current.kind]}</Text>
          {current.detail ? (
            <Text dimColor wrap="truncate-end">
              {current.detail}
            </Text>
          ) : null}
          {percent >= CONTEXT_SHOW ? <Text color={contextColor}>context {percent}%</Text> : null}
        </Box>
      </Box>
    )
  })
}
