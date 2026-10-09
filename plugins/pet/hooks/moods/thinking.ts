import { PX, stamp, wide } from '../pixels.ts'
import type { MoodArt } from '../pixels.ts'

export const thinking: MoodArt = {
  label: 'thinking',
  pose: tick => ({ squash: tick % 8 >= 4, eyes: tick % 12 === 0 ? 'shut' : 'up', look: 2 }),
  prop: (canvas, tick) => {
    const dots = Math.floor(tick / 2) % 4
    const inner = [0, 1, 2].map(i => (i < dots ? 'k' : 'w')).join('w')
    stamp(canvas, wide(['.wwwwwwww.', 'wwwwwwwwww', 'ww' + inner + 'www', 'wwwwwwwwww', '.wwwwwwww.']), PX + 2, 0)
    // Two dots trail from the bubble down to Clawd's head.
    stamp(canvas, ['ww'], 34, 4)
    stamp(canvas, ['ww'], 37, 3)
  },
}
