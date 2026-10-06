import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mood, MoodKind } from '../types'
import { COLUMNS, ROWS, drawFrame, encode } from './sprites'

const FRAME_MS = 250
const SLEEP_AFTER_MS = 60_000
const SHORT_MOOD_MS = 3_000
// Context use, in percent, at which Clawd shows its battery and then warns.
const CONTEXT_SHOW = 50
const CONTEXT_WARN = 80

const mood = atom({ plugin: 'pet', key: 'mood' } as const, {
  kind: 'idle',
  detail: '',
  since: 0,
  until: 0,
  then: 'idle',
} as Mood)
const context = atom({ plugin: 'pet', key: 'context' } as const, null as number | null)

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

export function detailForTool(input: Record<string, unknown>): string {
  const pick = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '')
  const path = pick('file_path') || pick('notebook_path')
  if (path) return path.split(/[\\/]/).pop() ?? ''
  const text = pick('pattern') || pick('command') || pick('query') || pick('url') || pick('description')
  return text.length > 40 ? text.slice(0, 39) + '…' : text
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

async function setMood($: EngineInterface, kind: MoodKind, detail = '', forMs = 0, then: MoodKind = 'idle') {
  const now = await $.clock.now()
  await update($, mood, () => ({ kind, detail, since: now, until: forMs ? now + forMs : 0, then }))
}

export const register: Register = on => {
  // The band's id, learned when it first draws; the timer repaints it in place.
  let bandId: string | undefined
  let tick = 0
  let hasWarned = false

  on('session.start', async ($, e, next) => {
    await setMood($, 'idle')
    await $.command.register({
      name: 'pet',
      description: 'Preview a pet mood: /pet <mood> [seconds], or /pet context <percent>. No mood lists them.',
    })
    $.clock.every(FRAME_MS, () => {
      void (async () => {
        tick += 1
        let current = await read($, mood)
        const now = await $.clock.now()
        if (current.until && now > current.until) {
          await setMood($, current.then)
          current = await read($, mood)
        } else if (current.kind === 'idle' && now - current.since > SLEEP_AFTER_MS) {
          await setMood($, 'sleeping')
          current = await read($, mood)
        }
        if (bandId !== undefined) {
          const cells = encode(drawFrame(current.kind, tick, (await read($, context)) ?? 0))
          await $.ui.blit({ requestId: bandId, key: 'pet', cells })
        }
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const [typed = '', value = ''] = e.args.trim().split(/\s+/)
    if (typed === 'context') {
      const percent = Math.min(100, Math.max(0, Number(value) || 0))
      await update($, context, () => percent)
      return { text: `Context set to ${percent}% until the next measure.` }
    }
    const name = typed === 'helper' ? 'subagent' : typed
    const kinds = Object.keys(LABELS) as MoodKind[]
    if (!kinds.includes(name as MoodKind)) {
      const list = kinds.map(k => (k === 'subagent' ? 'subagent (or helper)' : k)).join(', ')
      return { text: `Moods: ${list}. Usage: /pet <mood> [seconds], or /pet context <percent>` }
    }
    const seconds = Math.max(1, Number(value) || 10)
    await setMood($, name as MoodKind, 'preview', seconds * 1000)
    return { text: `Showing ${name} for ${seconds}s.` }
  })

  // Context fill: Clawd's battery drains, and one toast when it passes CONTEXT_WARN.
  on('session.measure', async ($, e, next) => {
    const percent = e.context.percent ?? null
    await update($, context, () => percent)
    if (percent !== null && percent >= CONTEXT_WARN && !hasWarned) {
      hasWarned = true
      $.ui.toast(`Clawd is getting tired: context is ${percent}% full. Run /compact soon.`)
    } else if (percent !== null && percent < CONTEXT_WARN) {
      hasWarned = false
    }
    return next(e)
  })

  // A permission prompt is about to show: Clawd waves until the tool call ends.
  on('classic.PermissionRequest', async ($, e, next) => {
    if (e.agent_id === undefined) await setMood($, 'waiting', e.tool_name)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await setMood($, 'thinking')
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    // A subagent's own tools: the pet keeps showing its helper.
    if (e.agentId !== undefined) return next(e)

    const tool = String(e.tool)
    const input = e as Record<string, unknown>
    await setMood($, moodForTool(tool), detailForTool(input))
    const result = await next(e)
    const command = typeof input.command === 'string' ? input.command : ''
    if (moodForTool(tool) === 'running' && result.deny === undefined && isCheckCommand(command)) {
      const passed = checkPassed(result.isError === true, typeof result.text === 'string' ? result.text : '')
      await setMood($, passed ? 'passed' : 'failed', detailForTool(input), SHORT_MOOD_MS, 'thinking')
    } else if (result.isError || result.deny !== undefined) {
      await setMood($, 'error', tool, SHORT_MOOD_MS, 'thinking')
    } else {
      await setMood($, 'thinking')
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      if (e.reason === 'answer') await setMood($, 'happy', '', SHORT_MOOD_MS)
      else if (e.reason === 'aborted') await setMood($, 'idle')
      else await setMood($, 'error', e.reason, SHORT_MOOD_MS)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Raster is terminal only; elsewhere leave the band to the engine.
    if (e.props.hasSurvey || e.surface !== 'terminal') return next(e)

    bandId = e.requestId
    const current = await read($, mood)
    const percent = (await read($, context)) ?? 0
    const { Box, Raster, Text } = $.ui.resolve(e)
    const contextColor = percent >= CONTEXT_WARN ? 'red' : percent >= 65 ? 'yellow' : 'green'

    return (
      <Box flexDirection="row" alignItems="center" marginTop={1}>
        <Raster key="pet" columns={COLUMNS} rows={ROWS} cells={encode(drawFrame(current.kind, tick, percent))} />
        <Box flexDirection="column" marginLeft={1}>
          <Text bold>{LABELS[current.kind]}</Text>
          {current.detail ? <Text dimColor>{current.detail}</Text> : null}
          {percent >= CONTEXT_SHOW ? <Text color={contextColor}>context {percent}%</Text> : null}
        </Box>
      </Box>
    )
  })
}
