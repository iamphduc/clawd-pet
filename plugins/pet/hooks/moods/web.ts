import { PX, stamp, wide } from '../pixels.ts'
import type { MoodArt } from '../pixels.ts'

export const web: MoodArt = {
  label: 'browsing',
  // Busy little steps.
  pose: tick => ({ lift: tick % 2 ? 2 : 0, step: tick % 2 === 1, look: 2 }),
  prop: (canvas, tick) => {
    // A browser window: a title bar with three dots and an address bar, and
    // a page whose heading, then lines of text, fill in as it loads.
    const shown = (tick % 8) * 3
    const line = (text: string, from: number) => {
      const n = Math.max(0, Math.min(shown - from, text.length))
      return 'gw' + text.slice(0, n) + 'w'.repeat(text.length - n) + 'wg'
    }
    stamp(canvas, wide([
      'gggggggggggg',
      'grgygGgwwwwg',
      'gggggggggggg',
      'gwwwwwwwwwwg',
      line('BBBBBwww', 0),
      'gwwwwwwwwwwg',
      line('gggggggg', 6),
      'gwwwwwwwwwwg',
      line('gggggwww', 12),
      'gwwwwwwwwwwg',
      'gggggggggggg',
    ]), PX, 0)
  },
}
