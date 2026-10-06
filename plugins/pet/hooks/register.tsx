import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mood, MoodKind } from '../types'
import { COLUMNS, ROWS, drawFrame, encode } from './sprites'

const FRAME_MS = 250
const SLEEP_AFTER_MS = 60_000
const SHORT_MOOD_MS = 3_000

const mood = atom({ plugin: 'pet', key: 'mood' } as const, {
  kind: 'idle',
  detail: '',
  since: 0,
  until: 0,
  then: 'idle',
} as Mood)

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
  return 'thinking'
}

export function detailForTool(input: Record<string, unknown>): string {
  const pick = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '')
  const path = pick('file_path') || pick('notebook_path')
  if (path) return path.split(/[\\/]/).pop() ?? ''
  const text = pick('pattern') || pick('command') || pick('query') || pick('url') || pick('description')
  return text.length > 40 ? text.slice(0, 39) + '…' : text
}

async function setMood($: EngineInterface, kind: MoodKind, detail = '', forMs = 0, then: MoodKind = 'idle') {
  const now = await $.clock.now()
  await update($, mood, () => ({ kind, detail, since: now, until: forMs ? now + forMs : 0, then }))
}

export const register: Register = on => {
  // The band's id, learned when it first draws; the timer repaints it in place.
  let bandId: string | undefined
  let tick = 0

  on('session.start', async ($, e, next) => {
    await setMood($, 'idle')
    await $.command.register({
      name: 'pet',
      description: 'Preview a pet mood: /pet <mood> [seconds]. No mood lists them.',
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
          await $.ui.blit({ requestId: bandId, key: 'pet', cells: encode(drawFrame(current.kind, tick)) })
        }
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const [typed = '', secs = '10'] = e.args.trim().split(/\s+/)
    const name = typed === 'helper' ? 'subagent' : typed
    const kinds = Object.keys(LABELS) as MoodKind[]
    if (!kinds.includes(name as MoodKind)) {
      const list = kinds.map(k => (k === 'subagent' ? 'subagent (or helper)' : k)).join(', ')
      return { text: `Moods: ${list}. Usage: /pet <mood> [seconds]` }
    }
    const seconds = Math.max(1, Number(secs) || 10)
    await setMood($, name as MoodKind, 'preview', seconds * 1000)
    return { text: `Showing ${name} for ${seconds}s.` }
  })

  on('turn.start', async ($, e, next) => {
    await setMood($, 'thinking')
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    // A subagent's own tools: the pet keeps showing its helper.
    if (e.agentId !== undefined) return next(e)

    const tool = String(e.tool)
    await setMood($, moodForTool(tool), detailForTool(e as Record<string, unknown>))
    const result = await next(e)
    if (result.isError || result.deny !== undefined) {
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
    const { Box, Raster, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" alignItems="center" marginTop={1}>
        <Raster key="pet" columns={COLUMNS} rows={ROWS} cells={encode(drawFrame(current.kind, tick))} />
        <Box flexDirection="column" marginLeft={1}>
          <Text bold>{LABELS[current.kind]}</Text>
          {current.detail ? <Text dimColor>{current.detail}</Text> : null}
        </Box>
      </Box>
    )
  })
}
