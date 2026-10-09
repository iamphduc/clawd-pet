// Pixel art for the pet: Clawd, the Claude Code mascot, drawn from the logo at
// twice its size. Pure functions: a mood and a tick in, Raster cells out.
// Each mood's pose and prop live in ./moods; this file dresses Clawd for the
// time of day and the context fill, and packs the canvas into cells.
import type { MoodKind } from '../types'
import { MOODS } from './moods/index.ts'
import { COLUMNS, HEIGHT, PX, ROWS, WIDTH, drawPet, stamp, wide } from './pixels.ts'
import type { Canvas } from './pixels.ts'

export { COLUMNS, ROWS }

/** A mug of coffee with rising steam. */
function drawCoffee(canvas: Canvas, tick: number) {
  // Two wisps of steam rise and sway out of step, fading near the top.
  const sway = [0, 0, 1, 1]
  for (let y = 0; y < 5; y++) {
    const color = y === 0 ? 'd' : 'g'
    stamp(canvas, wide([color]), PX + 2 + (sway[(y + tick) % 4] ?? 0) * 2, y)
    stamp(canvas, wide([color]), PX + 8 + (sway[(y + tick + 1) % 4] ?? 0) * 2, y)
  }
  stamp(canvas, wide(['wwwww..', 'wnnnwww', 'wwwww.w', 'wwwwwww', '.www...']), PX, 5)
}

/** A battery that drains as the context window fills. */
function drawBattery(canvas: Canvas, percent: number, y: number) {
  const left = Math.max(0, Math.min(7, Math.round((7 * (100 - percent)) / 100)))
  const fill = percent >= 80 ? 'r' : percent >= 65 ? 'y' : 'G'
  const inside = fill.repeat(left) + 'k'.repeat(7 - left)
  stamp(canvas, wide(['ggggggggg.', 'g' + inside + 'gg', 'g' + inside + 'gg', 'ggggggggg.']), PX, y)
}

/**
 * One frame of Clawd in a mood. `context` is the context window's fill in
 * percent: from 50, an idle or sleeping Clawd shows a draining battery.
 */
export function drawFrame(kind: MoodKind, tick: number, context = 0, hour = 12): Canvas {
  const canvas: Canvas = new Array<number | null>(WIDTH * HEIGHT).fill(null)
  const mood = MOODS[kind]
  // Night, midnight to 6 a.m.: Clawd wears a nightcap in every mood.
  drawPet(canvas, { ...mood.pose(tick), cap: hour < 6 })
  mood.prop?.(canvas, tick)
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
