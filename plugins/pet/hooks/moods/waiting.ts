import { PX, stamp, wide } from '../pixels.ts'
import type { MoodArt } from '../pixels.ts'

export const waiting: MoodArt = {
  label: 'needs you',
  pose: tick => ({ eyes: 'up', look: 2, wave: tick % 2 === 1 }),
  prop: (canvas, tick) => {
    // A big question mark bounces beside the waving Clawd.
    stamp(canvas, wide(['.yyyy.', 'yy..yy', '....yy', '...yy.', '..yy..', '......', '..yy..']), PX + 4, tick % 2 ? 1 : 3)
  },
}
