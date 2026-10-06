// Renders each of Clawd's moods to an animated PNG in docs/moods/, straight
// from the plugin's own sprite code, the way a terminal draws its cells.
//
//   node scripts/render-moods.mjs
//
// Needs Node 22.18 or later, which loads the plugin's TypeScript directly.
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

import { COLUMNS, ROWS, drawFrame, encode } from '../plugins/pet/hooks/sprites.ts'

const OUT = new URL('../docs/moods/', import.meta.url)
const CELL_W = 8 // a terminal cell is about twice as tall as it is wide
const CELL_H = 16
const BG = [0x1e, 0x1e, 0x1e] // a dark terminal
const FRAME_MS = 250
const FRAMES = 40 // 10 seconds: one full idle cycle

// [file name, mood, context %, hour]; ticks for a sleeping Clawd run at a quarter speed, as in the plugin.
const SHOTS = [
  ['idle', 'idle', 0, 15],
  ['sleeping', 'sleeping', 0, 15],
  ['thinking', 'thinking', 0, 15],
  ['reading', 'reading', 0, 15],
  ['editing', 'editing', 0, 15],
  ['searching', 'searching', 0, 15],
  ['running', 'running', 0, 15],
  ['web', 'web', 0, 15],
  ['subagent', 'subagent', 0, 15],
  ['waiting', 'waiting', 0, 15],
  ['passed', 'passed', 0, 15],
  ['failed', 'failed', 0, 15],
  ['happy', 'happy', 0, 15],
  ['error', 'error', 0, 15],
  ['battery', 'idle', 72, 15],
  ['coffee', 'idle', 0, 8],
  ['nightcap', 'idle', 0, 2],
]

// Quarter-block code point -> which of the cell's 2 x 2 pixels are lit (1 TL, 2 TR, 4 BL, 8 BR).
const QUADRANTS = new Map(
  [0x20, 0x2598, 0x259d, 0x2580, 0x2596, 0x258c, 0x259e, 0x259b, 0x2597, 0x259a, 0x2590, 0x259c, 0x2584, 0x2599, 0x259f, 0x2588].map(
    (cp, bits) => [cp, bits],
  ),
)

function rgb(color) {
  return color === 0x01000000 ? BG : [(color >> 16) & 255, (color >> 8) & 255, color & 255]
}

/** Decodes Raster cells back to RGB pixels, one terminal cell at a time. */
function toPixels(cells) {
  // Small Buffers share a pool, so copy out exactly this one's bytes.
  const bytes = Buffer.from(cells, 'base64')
  const words = new Uint32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length))
  const width = COLUMNS * CELL_W
  const pixels = Buffer.alloc(width * ROWS * CELL_H * 3)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const i = (row * COLUMNS + col) * 3
      const bits = QUADRANTS.get(words[i]) ?? 15
      const fg = rgb(words[i + 1])
      const bg = rgb(words[i + 2])
      for (let y = 0; y < CELL_H; y++) {
        for (let x = 0; x < CELL_W; x++) {
          const quad = (x < CELL_W / 2 ? 1 : 2) * (y < CELL_H / 2 ? 1 : 4)
          const [r, g, b] = bits & quad ? fg : bg
          const p = ((row * CELL_H + y) * width + col * CELL_W + x) * 3
          pixels[p] = r
          pixels[p + 1] = g
          pixels[p + 2] = b
        }
      }
    }
  }
  return pixels
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

const u32 = n => {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n, 0)
  return b
}

/** An animated PNG (APNG) of RGB frames, looping forever. */
function apng(frames, width, height) {
  const ihdr = Buffer.concat([u32(width), u32(height), Buffer.from([8, 2, 0, 0, 0])])
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('acTL', Buffer.concat([u32(frames.length), u32(0)]))]
  let seq = 0
  frames.forEach((pixels, f) => {
    const rows = []
    for (let y = 0; y < height; y++) rows.push(Buffer.from([0]), pixels.subarray(y * width * 3, (y + 1) * width * 3))
    const data = deflateSync(Buffer.concat(rows), { level: 9 })
    const delay = Buffer.alloc(4)
    delay.writeUInt16BE(FRAME_MS, 0)
    delay.writeUInt16BE(1000, 2)
    parts.push(chunk('fcTL', Buffer.concat([u32(seq++), u32(width), u32(height), u32(0), u32(0), delay, Buffer.from([0, 0])])))
    parts.push(f === 0 ? chunk('IDAT', data) : chunk('fdAT', Buffer.concat([u32(seq++), data])))
  })
  parts.push(chunk('IEND', Buffer.alloc(0)))
  return Buffer.concat(parts)
}

mkdirSync(OUT, { recursive: true })
for (const [name, kind, context, hour] of SHOTS) {
  const frames = []
  for (let tick = 0; tick < FRAMES; tick++) {
    const step = kind === 'sleeping' ? Math.floor(tick / 4) : tick
    frames.push(toPixels(encode(drawFrame(kind, step, context, hour))))
  }
  const file = new URL(`${name}.png`, OUT)
  const png = apng(frames, COLUMNS * CELL_W, ROWS * CELL_H)
  writeFileSync(file, png)
  console.log(`docs/moods/${name}.png  ${(png.length / 1024).toFixed(1)} KB`)
}
