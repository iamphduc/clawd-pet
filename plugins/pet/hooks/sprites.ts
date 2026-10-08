// Pixel art for the pet: Clawd, the Claude Code mascot, drawn from the logo at
// twice its size. Pure functions: a mood and a tick in, Raster cells out.
// Each terminal cell holds 2 x 2 pixels (quarter blocks ▘▝▖▗ and friends) in
// two colors, so a 62 x 12 pixel canvas draws as 31 columns x 6 rows.
import type { MoodKind } from '../types'

export const WIDTH = 62
export const HEIGHT = 12
export const COLUMNS = WIDTH / 2
export const ROWS = HEIGHT / 2

const PALETTE: Record<string, number> = {
  o: 0xd77757, // Claude orange
  w: 0xffffff,
  r: 0xe04848,
  y: 0xffd84a,
  c: 0x5ec8ff,
  B: 0x3a7bd5,
  G: 0x5cb85c,
  g: 0x9aa0a6,
  k: 0x2b2b2b,
  p: 0xf4a3b5,
  n: 0x8b5a2b,
  t: 0xf5ecd6,
  d: 0x5f6368, // dim gray, for things fading out
}

// '_' erases: Clawd's eyes are holes in the body, as in the logo.
const ERASE = '_'

// The logo,  ▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝ , one pixel per quarter block.
const HEAD = '...oooooooooooo...'
const FACE = '...oo_oooooo_oo...'
const ARMS = '.oooooooooooooooo.'
const LEGS = ['....o.o....o.o....', '...o.o......o.o...']

type Canvas = (number | null)[]

function stamp(canvas: Canvas, art: string[], x: number, y: number) {
  art.forEach((line, dy) => {
    for (let dx = 0; dx < line.length; dx++) {
      const ch = line[dx] ?? '.'
      const px = x + dx
      const py = y + dy
      if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue
      if (ch === ERASE) canvas[py * WIDTH + px] = null
      const color = PALETTE[ch]
      if (color !== undefined) canvas[py * WIDTH + px] = color
    }
  })
}

/** Doubles art across: one character becomes one square on screen. */
function wide(art: string[]): string[] {
  return art.map(line => [...line].map(ch => ch + ch).join(''))
}

/** Doubles art both ways. */
function scale2(art: string[]): string[] {
  return wide(art).flatMap(line => [line, line])
}

// Eyes are 4 x 2 (cross: 3 x 3) patches over the logo's eye holes.
const EYES = {
  open: ['.__.', '.__.'],
  shut: ['....', '.__.'],
  up: ['.__.', '....'],
  happy: ['.__.', '_.._'],
}

type Eyes = keyof typeof EYES | 'cross'
type Pose = { lift?: number; squash?: boolean; step?: boolean; eyes?: Eyes; look?: number; wave?: boolean; cap?: boolean }

function drawPet(canvas: Canvas, { lift = 0, squash = false, step = false, eyes = 'open', look = 0, wave = false, cap = false }: Pose) {
  const legs = LEGS[step ? 1 : 0] ?? ''
  let art = scale2([HEAD, HEAD, ARMS, HEAD, legs])
  // Squash drops one belly row so Clawd looks like it breathes out.
  if (squash) art = art.filter((_, i) => i !== 6)
  const y = HEIGHT - art.length - lift
  stamp(canvas, art, 0, y)
  if (cap) {
    // A striped nightcap on the head, its tip flopping down the right side to a pom-pom.
    stamp(canvas, [
      '..BBBBBBBBBBBBBBBBBBBB..........',
      'BBccBBccBBccBBccBBccBBccBBcc....',
      'wwwwwwwwwwwwwwwwwwwwwwwwccBBcc..',
      '..........................BBccBB',
      '............................wwww',
      '............................wwww',
    ], 6, y - 1)
  }
  if (wave) {
    // Wave the right arm: it rises to a short diagonal, then rests.
    stamp(canvas, ['____', '____'], 30, y + 4)
    stamp(canvas, ['..oo', '..oo', 'oo..', 'oo..'], 30, y + 2)
  }
  if (eyes === 'cross') {
    stamp(canvas, ['r.r', '.r.', 'r.r'], 10, y + 1)
    stamp(canvas, ['r.r', '.r.', 'r.r'], 24, y + 1)
    return
  }
  stamp(canvas, EYES[eyes], 9 + look, y + 2)
  stamp(canvas, EYES[eyes], 23 + look, y + 2)
}

// Props sit to the right of Clawd, in a 24 x 12 area starting at x = 38,
// drawn square (`wide`) so each character fills one cell's width.
const PX = 38

/** A mug of coffee with rising steam. */
function drawCoffee(canvas: Canvas, tick: number) {
  const steam = tick % 4 < 2 ? ['.g.g', 'g.g.', '.g.g'] : ['g.g.', '.g.g', 'g.g.']
  stamp(canvas, wide(steam), PX + 2, 1)
  stamp(canvas, wide(['wwwww..', 'wnnnwww', 'wwwww.w', 'wwwwwww', '.www...']), PX, 5)
}

/** A battery that drains as the context window fills. */
function drawBattery(canvas: Canvas, percent: number, y: number) {
  const left = Math.max(0, Math.min(7, Math.round((7 * (100 - percent)) / 100)))
  const fill = percent >= 80 ? 'r' : percent >= 65 ? 'y' : 'G'
  const inside = fill.repeat(left) + 'k'.repeat(7 - left)
  stamp(canvas, wide(['ggggggggg.', 'g' + inside + 'gg', 'g' + inside + 'gg', 'ggggggggg.']), PX, y)
}

function drawProp(canvas: Canvas, kind: MoodKind, tick: number) {
  const odd = tick % 2 === 1
  switch (kind) {
    case 'reading': {
      // An open book. Every 8 ticks a page lifts off the right side, stands
      // up over the spine, and lands on the left, showing new lines of text.
      const step = tick % 8
      const page = Math.floor(tick / 8) % 2 === 0
      stamp(canvas, wide(page
        ? ['.tttt.tttt.', 'tgggtntgggt', 'tttttnttttt', 'tggttntgggt', 'tttttnttttt', 'nnnnnnnnnnn']
        : ['.tttt.tttt.', 'tggttntgggt', 'tttttnttttt', 'tgggtntggtt', 'tttttnttttt', 'nnnnnnnnnnn']), PX, 5)
      const turning = [
        ['.........tt', '.......tt..', '......t....'],
        ['.....t.....', '.....t.....', '.....t.....', '.....t.....'],
        ['tt.........', '..tt.......', '....t......'],
      ][step - 5]
      if (turning) stamp(canvas, wide(turning), PX, 5 - turning.length + 1)
      return
    }
    case 'editing': {
      // The pencil writes a zigzag line left to right, its tip on the line,
      // then holds a beat before starting over.
      const at = Math.min(tick % 5, 3)
      const line = [0, 1].map(row => [...Array(at + 1).keys()].map(i => (i % 2 === row ? '.' : 'g')).join(''))
      stamp(canvas, wide(line), PX, 10)
      stamp(canvas, wide([
        '.......pp',
        '......ggp',
        '.....yyg.',
        '....yyy..',
        '...yyy...',
        '..yyy....',
        '.tyy.....',
        '.kt......',
        'd........',
      ]), PX + at * 2, at % 2 === 0 ? 3 : 2)
      return
    }
    case 'searching': {
      // The magnifier circles slowly, as if scanning a page.
      const path: [number, number][] = [[0, 2], [1, 1], [2, 1], [3, 2], [2, 3], [1, 3]]
      const [dx, dy] = path[tick % 6] ?? [0, 2]
      stamp(canvas, wide([
        '..ggg....',
        '.gwccg...',
        'gwccccg..',
        'gcccccg..',
        'gcccccg..',
        '.gcccgn..',
        '..gggnn..',
        '......nn.',
        '.......nn',
      ]), PX + dx * 2, dy - 1)
      return
    }
    case 'running':
      stamp(canvas, wide([
        'gggggggggg',
        'gkkkkkkkkg',
        'gkykkkkkkg',
        'gkkykkkkkg',
        'gkykk' + (odd ? 'kk' : 'ww') + 'kkg',
        'gkkkkkkkkg',
        'gggggggggg',
      ]), PX, 4)
      return
    case 'web': {
      const globe: string[] = []
      for (let y = 0; y < 8; y++) {
        let line = ''
        for (let x = 0; x < 8; x++) {
          const inside = (x - 3.5) ** 2 + (y - 3.5) ** 2 <= 15
          const land = (x + tick) % 8 < 3 && y > 1 && y < 6
          line += !inside ? '.' : land ? 'G' : (x + tick) % 4 === 0 ? 'c' : 'B'
        }
        globe.push(line)
      }
      stamp(canvas, wide(globe), PX + 2, 2)
      return
    }
    case 'thinking': {
      const dots = Math.floor(tick / 2) % 4
      const inner = [0, 1, 2].map(i => (i < dots ? 'k' : 'w')).join('w')
      stamp(canvas, wide(['.wwwwwwww.', 'wwwwwwwwww', 'ww' + inner + 'www', 'wwwwwwwwww', '.wwwwwwww.']), PX, 0)
      stamp(canvas, wide(['ww', 'ww']), PX - 2, 6)
      stamp(canvas, wide(['w']), PX - 4, 9)
      return
    }
    case 'sleeping': {
      // Two Zs, half a cycle apart: each starts small by the head, grows as it
      // drifts up and right, and fades out. They keep a row clear above the battery.
      const small = ['gggg', '..g.', '.g..', 'gggg']
      const big = ['ggggg', '...g.', '..g..', '.g...', 'ggggg']
      const path: [string[], number, number][] = [[small, 0, 3], [small, 1, 2], [big, 2, 2], [big, 4, 1], [big, 6, 0], [big, 7, 0]]
      for (const phase of [tick % 6, (tick + 3) % 6]) {
        const [art, x, y] = path[phase] ?? [small, 0, 3]
        stamp(canvas, wide(phase === 5 ? art.map(line => line.replaceAll('g', 'd')) : art), PX + x * 2, y)
      }
      return
    }
    case 'happy': {
      const big = wide(['..y..', '.yyy.', 'yyyyy', '.yyy.', '..y..'])
      const small = wide(['.y.', 'yyy', '.y.'])
      stamp(canvas, odd ? big : small, PX, odd ? 1 : 3)
      stamp(canvas, odd ? small : big, PX + 12, odd ? 7 : 5)
      return
    }
    case 'error':
      stamp(canvas, wide(['.c.', 'ccc', 'ccc', '.c.']), 32, (tick % 4) - 1)
      stamp(canvas, wide(['rr', 'rr', 'rr', 'rr', '..', 'rr']), PX + 4, 2)
      return
    case 'subagent':
      // A helper Clawd: the logo at its own size.
      stamp(canvas, [HEAD, FACE, ARMS, HEAD, LEGS[odd ? 1 : 0] ?? ''], PX + 2, odd ? 6 : 7)
      return
    case 'waiting':
      stamp(canvas, wide(['.wwwww.', 'wwkkkww', 'wwwwkww', 'wwwkwww', 'wwwwwww', 'wwwkwww', '.wwwww.']), PX + 2, 0)
      stamp(canvas, wide(['w']), PX, 8)
      return
    case 'passed':
      stamp(canvas, wide(['.....G', '....GG', 'G..GG.', 'GGGG..', '.GG...']), PX + 2, odd ? 2 : 3)
      return
    case 'failed':
      stamp(canvas, wide(['r...r', '.r.r.', '..r..', '.r.r.', 'r...r']), PX + 2, 3)
      return
    case 'idle':
      return
  }
}

/**
 * One frame of Clawd in a mood. `context` is the context window's fill in
 * percent: from 50, an idle or sleeping Clawd shows a draining battery.
 */
export function drawFrame(kind: MoodKind, tick: number, context = 0, hour = 12): Canvas {
  const canvas: Canvas = new Array(WIDTH * HEIGHT).fill(null)
  const odd = tick % 2 === 1
  const breath = tick % 8 >= 4
  // Night, midnight to 6 a.m.: Clawd wears a nightcap in every mood.
  const pet = (pose: Pose) => drawPet(canvas, { ...pose, cap: hour < 6 })
  // A commit cheers with the turn-done art, and a Clawd stopped by the plan's
  // limit sleeps; only their labels differ.
  const art = kind === 'committed' ? 'happy' : kind === 'resting' ? 'sleeping' : kind
  switch (art) {
    case 'idle': {
      const cycle = tick % 40
      const look = cycle >= 20 && cycle < 26 ? -2 : cycle >= 28 && cycle < 34 ? 2 : 0
      pet({ squash: breath, eyes: tick % 16 === 0 ? 'shut' : 'open', look })
      break
    }
    case 'sleeping':
      pet({ squash: breath, eyes: 'shut' })
      break
    case 'thinking':
      pet({ squash: breath, eyes: tick % 12 === 0 ? 'shut' : 'up', look: 2 })
      break
    case 'happy':
      pet({ lift: odd ? 2 : 0, eyes: 'happy', step: odd })
      break
    case 'error':
      pet({ squash: true, eyes: 'cross' })
      break
    case 'waiting':
      pet({ eyes: 'up', look: 2, wave: odd })
      break
    case 'passed':
      pet({ lift: odd ? 2 : 0, eyes: 'happy', step: odd })
      break
    case 'failed':
      pet({ squash: true, eyes: 'shut' })
      break
    case 'subagent':
      pet({ squash: breath, look: 2 })
      break
    case 'reading':
      // Eyes glide across a line left to right, then jump back to the next.
      pet({ lift: odd ? 2 : 0, step: odd, look: [-2, -1, 0, 1, 2, -2, -1, 0][tick % 8] ?? 0 })
      break
    default:
      // editing, searching, running, web: busy little steps
      pet({ lift: odd ? 2 : 0, step: odd, look: 2 })
  }
  drawProp(canvas, art, tick)
  if ((kind === 'idle' || kind === 'sleeping') && context >= 50) drawBattery(canvas, context, kind === 'sleeping' ? 8 : 6)
  // Morning, 6 to 11 a.m.: coffee beside an idle Clawd, unless the battery is there.
  else if (kind === 'idle' && hour >= 6 && hour < 11) drawCoffee(canvas, tick)
  return canvas
}

const DEFAULT = 0x01000000
// Quarter blocks by which pixels are lit: bit 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right.
const QUADRANTS = [
  0x20, 0x2598, 0x259d, 0x2580, 0x2596, 0x258c, 0x259e, 0x259b,
  0x2597, 0x259a, 0x2590, 0x259c, 0x2584, 0x2599, 0x259f, 0x2588,
]

/** Packs a canvas into RasterProps `cells`: base64 of [codePoint, fg, bg] u32 triplets. */
export function encode(canvas: Canvas): string {
  const words = new Uint32Array(COLUMNS * ROWS * 3)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const x = col * 2
      const y = row * 2
      const quad = [
        canvas[y * WIDTH + x] ?? null,
        canvas[y * WIDTH + x + 1] ?? null,
        canvas[(y + 1) * WIDTH + x] ?? null,
        canvas[(y + 1) * WIDTH + x + 1] ?? null,
      ]
      // A cell shows two colors: the most common pixel color lit, the next as background.
      const counts = new Map<number, number>()
      for (const c of quad) if (c !== null) counts.set(c, (counts.get(c) ?? 0) + 1)
      const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
      const fg = ranked[0]
      const i = (row * COLUMNS + col) * 3
      if (fg === undefined) {
        words.set([0x20, DEFAULT, DEFAULT], i)
        continue
      }
      const bits = quad.reduce<number>((acc, c, q) => (c === fg ? acc | (1 << q) : acc), 0)
      words.set([QUADRANTS[bits] ?? 0x2588, fg, ranked[1] ?? DEFAULT], i)
    }
  }
  const bytes = new Uint8Array(words.buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0)
  return btoa(binary)
}
